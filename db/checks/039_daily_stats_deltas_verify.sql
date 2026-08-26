-- Verifikation zu Migration 039 — read-only, schreibt nichts.
-- Im Supabase SQL-Editor ausführen: https://supabase.com/dashboard/project/_/sql/new
-- Block A gibt eine Ampel-Übersicht, Block B die Zeitreihe zum Nachsehen.

-- ══ Block A — Ampel ═════════════════════════════════════════════════════════
with mig as (
  select count(*) n from schema_migrations where version = '039_daily_stats_deltas'
),
cols as (
  select count(*) n from information_schema.columns
   where table_schema = 'public' and table_name = 'daily_stats'
     and column_name in ('cum_visitors_a','cum_visitors_b','cum_conversions_a','cum_conversions_b')
),
fns as (
  select count(*) n from pg_proc p
    join pg_namespace ns on ns.oid = p.pronamespace
   where ns.nspname = 'public' and p.proname in ('snapshot_daily_stats','finalize_daily_stats')
),
old_fn as (
  select count(*) n from pg_proc p
    join pg_namespace ns on ns.oid = p.pronamespace
   where ns.nspname = 'public' and p.proname = 'snapshot_daily_stats'
     and pronargs = 1
),
mono as (
  select count(*) n from (
    select cum_visitors_a - lag(cum_visitors_a) over w as da,
           cum_visitors_b - lag(cum_visitors_b) over w as db
      from daily_stats
    window w as (partition by test_id order by date)
  ) x where coalesce(da, 0) < 0 or coalesce(db, 0) < 0
),
deltachk as (
  select count(*) n from (
    select visitors_a,
           cum_visitors_a - lag(cum_visitors_a) over w as expected
      from daily_stats
    window w as (partition by test_id order by date)
  ) x where expected is not null and visitors_a <> greatest(expected, 0)
),
overshoot as (
  select count(*) n from (
    select d.test_id,
           sum(d.visitors_a) + sum(d.visitors_b) as summe,
           max(t.visitors_a + t.visitors_b)      as zaehler
      from daily_stats d join tests t on t.id = d.test_id
     group by d.test_id
  ) x where summe > zaehler
),
frozen as (
  -- Verräterisches Altmuster: erste Zeile eines Tests auf 0, Folgetag > 0
  select count(*) n from (
    select test_id, visitors_a + visitors_b as v,
           row_number() over (partition by test_id order by date) as rn,
           sum(visitors_a + visitors_b) over (partition by test_id) as total
      from daily_stats
  ) x where rn = 1 and v = 0 and total > 0
)
select * from (
  select 1 as nr, 'Migration 039 eingetragen'            as pruefung,
         case when (select n from mig)      = 1 then 'OK' else 'FEHLT' end as status,
         (select n from mig)::text || ' Eintrag/Einträge' as detail
  union all select 2, 'cum_*-Spalten vorhanden',
         case when (select n from cols)     = 4 then 'OK' else 'FEHLT' end,
         (select n from cols)::text || ' von 4'
  union all select 3, 'Funktionen snapshot_/finalize_daily_stats',
         case when (select n from fns)     >= 2 then 'OK' else 'FEHLT' end,
         (select n from fns)::text || ' gefunden'
  union all select 4, 'Alte 1-Argument-Signatur entfernt',
         case when (select n from old_fn)   = 0 then 'OK' else 'NOCH DA' end,
         (select n from old_fn)::text || ' übrig (muss 0 sein, sonst mehrdeutiger Aufruf)'
  union all select 5, 'cum_* steigt monoton',
         case when (select n from mono)     = 0 then 'OK' else 'PROBLEM' end,
         (select n from mono)::text || ' fallende Übergänge'
  union all select 6, 'Tagesdelta = Differenz der cum-Stände',
         case when (select n from deltachk) = 0 then 'OK' else 'PROBLEM' end,
         (select n from deltachk)::text || ' abweichende Zeilen'
  union all select 7, 'Summe der Deltas <= Zähler in tests',
         case when (select n from overshoot)= 0 then 'OK' else 'PROBLEM' end,
         (select n from overshoot)::text || ' Tests über dem Zähler'
  union all select 8, 'Kein eingefrorener Starttag mehr (Altmuster)',
         case when (select n from frozen)   = 0 then 'OK' else 'PRUEFEN' end,
         (select n from frozen)::text || ' Tests starten mit 0 trotz Traffic'
) s order by nr;

-- ══ Block B — Zeitreihe pro Test zum Nachsehen ══════════════════════════════
--    Erwartung: Traffic liegt auf dem Tag, an dem er entstand. Der Vortag darf
--    nur dann 0 sein, wenn an dem Tag wirklich niemand da war.
select
  t.name,
  t.status,
  d.date,
  d.visitors_a    as bes_a,
  d.visitors_b    as bes_b,
  d.conversions_a as conv_a,
  d.conversions_b as conv_b,
  d.cum_visitors_a + d.cum_visitors_b as cum_gesamt,
  t.visitors_a    + t.visitors_b      as zaehler_tests
from daily_stats d
join tests t on t.id = d.test_id
where d.date >= current_date - 14
order by t.name, d.date;

-- ══ Block C — Abgleich Summe vs. Zähler pro Test ════════════════════════════
--    "offen" = Traffic seit dem letzten Snapshot, noch keiner Tageszeile
--    zugeordnet. Wird beim nächsten Aufruf der Results-Seite bzw. vom
--    Mitternachts-Cron verbucht. Negativ wäre ein Fehler.
select
  t.name,
  t.status,
  count(*)                                        as tage,
  sum(d.visitors_a)                               as summe_a,
  t.visitors_a                                    as zaehler_a,
  t.visitors_a - sum(d.visitors_a)                as offen_a,
  sum(d.visitors_b)                               as summe_b,
  t.visitors_b                                    as zaehler_b,
  t.visitors_b - sum(d.visitors_b)                as offen_b
from daily_stats d
join tests t on t.id = d.test_id
group by t.id, t.name, t.status, t.visitors_a, t.visitors_b
order by t.name;
