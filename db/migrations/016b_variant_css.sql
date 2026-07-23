-- 016_variant_css.sql
-- Zweite Varianten-Achse: CSS-Injection statt DOM-Tausch.
-- Ermöglicht Layout-Tests (Reorder, Visibility, Spacing, Color)
-- ohne das DOM zu mutieren. Hydration-safe, kein Flackern.

ALTER TABLE tests ADD COLUMN IF NOT EXISTS variant_b_css TEXT;

-- Zweites Element für Swap/Rearrange-Tests.
-- Designer pickt zwei Elemente, AI generiert order-CSS um sie zu vertauschen.
ALTER TABLE tests ADD COLUMN IF NOT EXISTS reorder_selector TEXT;
