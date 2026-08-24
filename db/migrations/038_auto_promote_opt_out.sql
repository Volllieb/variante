-- Migration 038: Opt-out für die Auto-Promotion von Gewinner-Varianten
--
-- Plan RA-06: Der Winner-Cron setzte einen signifikanten Test bedingungslos auf
-- status='done'. /api/resolve liefert für done+winner='B' dann force:'B' — also
-- 100 % Variante B an ALLE Besucher der Kundenseite. Das Tool änderte damit eine
-- fremde Live-Seite dauerhaft, ohne dass der Betreiber je zugestimmt hat, und
-- ohne dass es irgendwo abschaltbar gewesen wäre.
--
-- Neu: profiles.auto_promote_winner steuert das pro Account.
--   true  (Default, bisheriges Verhalten) — Gewinner wird automatisch ausgerollt.
--   false — der Cron schreibt winner + significance, lässt den Test aber 'active'.
--           Der Nutzer entscheidet im Dashboard ("Apply winner"), ob und wann
--           die Variante live geht.
--
-- Default bleibt bewusst true: bestehende Nutzer haben das aktuelle Verhalten
-- gewählt (implizit) und sollen durch die Migration keine stehenden Tests
-- verlieren. Die Einstellung ist ab jetzt im Account sichtbar und änderbar.
--
-- Verwandt: profiles.notify_on_winner (010_features.sql) existierte seit Monaten
-- in DB und /api/profile, war aber in keinem UI erreichbar. Beide Schalter
-- bekommen mit dieser Migration eine Oberfläche.

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS auto_promote_winner boolean DEFAULT true;

-- Bestandszeilen absichern (ADD COLUMN ... DEFAULT füllt sie zwar, aber die
-- Migration soll auch nach einem teilweise gelaufenen Vorversuch konsistent sein).
UPDATE profiles SET auto_promote_winner = true WHERE auto_promote_winner IS NULL;
UPDATE profiles SET notify_on_winner    = true WHERE notify_on_winner    IS NULL;

ALTER TABLE profiles ALTER COLUMN auto_promote_winner SET NOT NULL;
ALTER TABLE profiles ALTER COLUMN notify_on_winner    SET NOT NULL;
ALTER TABLE profiles ALTER COLUMN notify_on_winner    SET DEFAULT true;

INSERT INTO schema_migrations (version) VALUES ('038_auto_promote_opt_out')
ON CONFLICT (version) DO NOTHING;
