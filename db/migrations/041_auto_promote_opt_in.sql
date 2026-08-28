-- Migration 041: Auto-Promotion wird Opt-in statt Opt-out
--
-- Katalog WIN-02 (docs/edge-cases.md). Migration 038 hat die Abschaltbarkeit
-- eingefuehrt, den Default aber bewusst auf true gelassen: bestehende Nutzer
-- haetten das Verhalten "implizit gewaehlt". Diese Begruendung haelt nicht.
-- Niemand hat je zugestimmt — die Einstellung existierte vorher gar nicht, und
-- sichtbar wurde sie erst mit 038.
--
-- Was der Default ausloest: Der naechtliche Cron setzt bei erkanntem Gewinner
-- status='done'. /api/resolve liefert fuer done+winner='B' dann force:'B', und
-- ab.js spielt B an JEDEN Besucher aus. Das ist eine dauerhafte, unangekuendigte
-- Aenderung an der Live-Website eines Kunden, ausgeloest von einem Cronjob.
--
-- Verschaerfend (Katalog WIN-01): evaluateWinner misst die Mindestlaufzeit ab
-- created_at, weil es kein started_at/restarted_at gibt. Ein alter, kuerzlich
-- bearbeiteter Test reisst die 7-Tage-Huerde sofort — auf Daten, die alte und
-- neue Fassung von Variante B vermischen (Katalog EDIT-01). Der Cron kann also
-- auf verfaelschter Grundlage entscheiden und das Ergebnis live schalten.
--
-- Eine Variante dauerhaft auf eine fremde Website zu uebernehmen, gehoert dem
-- Betreiber. Ein Klick fuer alle, die es wollen, ist der bessere Handel als ein
-- Vertrauensschaden bei allen, die es nicht bemerkt haben.
--
-- Bestandszeilen werden mitgezogen, nicht nur der Default: der Sinn der
-- Umstellung ist gerade, dass die bestehenden true-Werte keine Entscheidung
-- sind. Wer die Automatik will, schaltet sie im Account wieder ein
-- (AccountClient -> Auto-apply winner).

ALTER TABLE profiles ALTER COLUMN auto_promote_winner SET DEFAULT false;

UPDATE profiles SET auto_promote_winner = false WHERE auto_promote_winner IS DISTINCT FROM false;

INSERT INTO schema_migrations (version) VALUES ('041_auto_promote_opt_in')
ON CONFLICT (version) DO NOTHING;
