-- Migration 039 — daily_stats speichert Tagesdeltas statt eingefrorener Kumulativstände
-- Ausführen im Supabase SQL-Editor: https://supabase.com/dashboard/project/_/sql/new
--
-- Bug: "Visitors over Time" zeigte gestern 0 Besucher und heute alle — obwohl
--   der Traffic gestern kam. Ursache ist eine doppelte Fehlannahme:
--
--   1. snapshot_daily_stats() schrieb den KUMULATIVEN Zählerstand aus tests
--      (visitors_a/b, conversions_a/b) in die Tageszeile — und nur dann, wenn
--      für den Tag noch keine Zeile existierte ("if not found"). Die Zeile fror
--      damit auf dem Stand des ersten Aufrufs des Tages ein; das
--      on-conflict-do-update stand im toten Zweig und lief nie.
--   2. Alle Konsumenten (Visitors-Chart, Cumulative Conversions, Significance
--      over Time, Tagestabelle, CSV-Export) lesen die Spalten als TAGESWERTE.
--
--   Folge: Der Cron um 00:00 UTC legte die Zeile für den NEUEN Tag mit dem
--   Endstand des Vortags an. Die Vortagszeile behielt den Stand von 00:00 des
--   Vortags — bei einem Test, der gestern startete, also 0. Genau das
--   beobachtete Muster: gestern 0, heute alles.
--
--   Die Altzeilen sind dadurch doppelt falsch: kumulativ statt täglich UND um
--   einen Tag verschoben. Zeile D hält den Stand von 00:00 des Tages D, also
--   den Traffic bis Ende D-1. Der Backfill korrigiert beides.
--
-- Fix: cum_*-Spalten halten den Zählerstand zum Snapshot-Zeitpunkt, die
--   bestehenden Spalten werden zu echten Tagesdeltas (cum heute − cum letzter
--   Snapshot davor). Die Funktion schreibt bei jedem Aufruf (idempotent) und
--   nimmt ein Zieldatum entgegen, damit der Mitternachts-Cron den VORTAG
--   abschließt, statt den neuen Tag mit dessen Endstand zu eröffnen.

-- ── 1. Kumulativ-Baseline als eigene Spalten ──
alter table daily_stats add column if not exists cum_visitors_a    int not null default 0;
alter table daily_stats add column if not exists cum_visitors_b    int not null default 0;
alter table daily_stats add column if not exists cum_conversions_a int not null default 0;
alter table daily_stats add column if not exists cum_conversions_b int not null default 0;

-- ── 2. Bestandsdaten einmalig umschreiben ──
--     Zeile D hält den Kumulativstand von 00:00 des Tages D. Der Traffic des
--     Tages D ist also cum(D+1) - cum(D) — deshalb lead() statt lag(). Für die
--     jüngste Zeile gibt es kein lead(): dort ist der aktuelle Zählerstand aus
--     tests die Obergrenze, sonst ginge der noch nicht verbuchte Traffic
--     verloren. Invariante nach dem Backfill: sum(Deltas) = Zählerstand in tests.
--     Der Guard über schema_migrations verhindert doppeltes Differenzieren, falls
--     die Datei versehentlich zweimal ausgeführt wird.
do $$
begin
  if exists (select 1 from schema_migrations where version = '039_daily_stats_deltas') then
    return;
  end if;

  with base as (
    select
      d.id,
      d.test_id,
      d.date,
      d.visitors_a    as ocum_va,
      d.visitors_b    as ocum_vb,
      d.conversions_a as ocum_ca,
      d.conversions_b as ocum_cb,
      greatest(coalesce(lead(d.visitors_a)    over w, coalesce(t.visitors_a, 0)),    d.visitors_a)    as ncum_va,
      greatest(coalesce(lead(d.visitors_b)    over w, coalesce(t.visitors_b, 0)),    d.visitors_b)    as ncum_vb,
      greatest(coalesce(lead(d.conversions_a) over w, coalesce(t.conversions_a, 0)), d.conversions_a) as ncum_ca,
      greatest(coalesce(lead(d.conversions_b) over w, coalesce(t.conversions_b, 0)), d.conversions_b) as ncum_cb
    from daily_stats d
    join tests t on t.id = d.test_id
    window w as (partition by d.test_id order by d.date)
  ),
  deltas as (
    select
      id,
      ncum_va, ncum_vb, ncum_ca, ncum_cb,
      greatest(ncum_va - coalesce(lag(ncum_va) over w, ocum_va), 0) as d_va,
      greatest(ncum_vb - coalesce(lag(ncum_vb) over w, ocum_vb), 0) as d_vb,
      greatest(ncum_ca - coalesce(lag(ncum_ca) over w, ocum_ca), 0) as d_ca,
      greatest(ncum_cb - coalesce(lag(ncum_cb) over w, ocum_cb), 0) as d_cb
    from base
    window w as (partition by test_id order by date)
  )
  update daily_stats d set
    visitors_a        = x.d_va,
    visitors_b        = x.d_vb,
    conversions_a     = x.d_ca,
    conversions_b     = x.d_cb,
    cum_visitors_a    = x.ncum_va,
    cum_visitors_b    = x.ncum_vb,
    cum_conversions_a = x.ncum_ca,
    cum_conversions_b = x.ncum_cb
  from deltas x
  where x.id = d.id;
end $$;

-- ── 3. Snapshot-Funktion: idempotent + mit Zieldatum ──
--     Die alte 1-Argument-Signatur muss weg, sonst ist der Aufruf mit einem
--     Argument zwischen beiden Overloads mehrdeutig.
drop function if exists snapshot_daily_stats(uuid);

create or replace function snapshot_daily_stats(p_test_id uuid, p_date date default current_date)
returns void
language plpgsql
set search_path = 'public'
as $$
declare
  v_cur  tests%rowtype;
  v_base daily_stats%rowtype;
  v_bva int := 0;
  v_bvb int := 0;
  v_bca int := 0;
  v_bcb int := 0;
begin
  select * into v_cur from tests where id = p_test_id;
  if not found then return; end if;

  -- Baseline ist der letzte Snapshot VOR dem Zieltag. Über cum_* statt über
  -- eine Summe der Deltas, damit die 12-Monats-Retention (Migration 034) das
  -- Ergebnis nicht verfälscht, wenn alte Zeilen wegfallen.
  select * into v_base
    from daily_stats
   where test_id = p_test_id
     and date < p_date
   order by date desc
   limit 1;

  if found then
    v_bva := v_base.cum_visitors_a;
    v_bvb := v_base.cum_visitors_b;
    v_bca := v_base.cum_conversions_a;
    v_bcb := v_base.cum_conversions_b;
  end if;

  insert into daily_stats (
    test_id, date,
    visitors_a, visitors_b, conversions_a, conversions_b,
    cum_visitors_a, cum_visitors_b, cum_conversions_a, cum_conversions_b
  )
  values (
    p_test_id, p_date,
    greatest(coalesce(v_cur.visitors_a, 0)    - v_bva, 0),
    greatest(coalesce(v_cur.visitors_b, 0)    - v_bvb, 0),
    greatest(coalesce(v_cur.conversions_a, 0) - v_bca, 0),
    greatest(coalesce(v_cur.conversions_b, 0) - v_bcb, 0),
    coalesce(v_cur.visitors_a, 0),
    coalesce(v_cur.visitors_b, 0),
    coalesce(v_cur.conversions_a, 0),
    coalesce(v_cur.conversions_b, 0)
  )
  on conflict (test_id, date) do update set
    visitors_a        = excluded.visitors_a,
    visitors_b        = excluded.visitors_b,
    conversions_a     = excluded.conversions_a,
    conversions_b     = excluded.conversions_b,
    cum_visitors_a    = excluded.cum_visitors_a,
    cum_visitors_b    = excluded.cum_visitors_b,
    cum_conversions_a = excluded.cum_conversions_a,
    cum_conversions_b = excluded.cum_conversions_b;
end;
$$;

-- ── 4. Cron-Einstieg: schließt den VORTAG ab ──
--     Der Cron läuft um 00:00 UTC. Der bis dahin nicht verbuchte Traffic ist
--     gestern entstanden und gehört auf den Vortag — nicht auf den neuen Tag.
--     current_date wird in der DB berechnet, damit App- und DB-Zeitzone nicht
--     auseinanderlaufen können.
create or replace function finalize_daily_stats(p_test_id uuid)
returns void
language sql
set search_path = 'public'
as $$
  select snapshot_daily_stats(p_test_id, current_date - 1);
$$;

insert into schema_migrations (version) values ('039_daily_stats_deltas')
on conflict (version) do nothing;
