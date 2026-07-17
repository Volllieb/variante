-- Migration 022 — Avatar-Upload
-- Fügt avatar_url zu profiles hinzu und legt den avatars-Storage-Bucket an.

-- Profil-Spalte für Avatar-Bild-URL
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Storage-Bucket (public read, upload via service-role API route)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('avatars', 'avatars', true, 2097152, '{image/png,image/jpeg,image/webp,image/gif}')
ON CONFLICT (id) DO NOTHING;
