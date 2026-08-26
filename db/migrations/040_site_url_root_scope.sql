-- Migration 040 — Bestandstests behalten ihren sitewide-Geltungsbereich
-- Ausführen im Supabase SQL-Editor: https://supabase.com/dashboard/project/_/sql/new
--
-- Kontext: pathOf() in /api/resolve unterscheidet ab sofort zwischen
--   'https://example.com'   -> ''  (ganze Domain, jede Unterseite)
--   'https://example.com/'  -> '/' (nur die Startseite)
-- Vorher fielen beide auf '' zusammen, weil das trailing-slash-Stripping die
-- Wurzel mitnahm.
--
-- Der Test-Wizard schreibt beim Auswählen einer verbundenen Domain genau
-- `https://<domain>/`. Alle so angelegten Bestandstests laufen heute also
-- sitewide — und würden durch die neue Unterscheidung schlagartig zu
-- Startseiten-Tests. Das würde laufende Tests mitten in der Messung auf einen
-- anderen Geltungsbereich umstellen: Variante B verschwindet auf allen
-- Unterseiten, und die bereits gezählten Visitors/Conversions gehören dann zu
-- einem anderen Publikum als die künftigen. Ergebnis wäre eine Statistik, die
-- zwei verschiedene Tests in denselben Zählern mischt.
--
-- Diese Migration friert deshalb das BISHERIGE Verhalten ein: Wurzel-URLs
-- verlieren ihren trailing slash und bleiben damit sitewide. Wer künftig
-- explizit nur die Startseite testen will, wählt das im Wizard ("Homepage
-- only") — der schreibt dann wieder ein '/' und meint es diesmal auch so.
--
-- Betroffen sind ausschließlich URLs OHNE Pfad. 'example.com/pricing/' bleibt
-- unangetastet: dort strippt pathOf() den Slash wie bisher zu '/pricing'.
--
-- site_host (Migration 021) ist eine GENERATED-Spalte und wird automatisch neu
-- berechnet. Sie splittet auf '/', der Wert ändert sich also nicht.
--
-- Idempotent — mehrfach ausführbar (der zweite Lauf findet keine Zeilen mehr).

UPDATE tests
   SET site_url = rtrim(site_url, '/')
 WHERE site_url IS NOT NULL
   -- Es gibt überhaupt einen trailing slash zu entfernen
   AND site_url <> rtrim(site_url, '/')
   -- ... und nach dem Host folgt kein Pfad: 'example.com/' ja, 'example.com/x/' nein.
   -- split_part(..., '/', 2) ist das erste Pfadsegment nach dem Host.
   AND split_part(regexp_replace(btrim(site_url), '^https?://', ''), '/', 2) = '';

insert into schema_migrations (version) values ('040_site_url_root_scope')
on conflict (version) do nothing;
