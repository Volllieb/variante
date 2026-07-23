import { supabase } from '@/lib/supabase'
import { corsHeaders, preflight } from '@/lib/cors'
import { getApiUser, unauthorized } from '@/lib/auth'
import { safeError } from '@/lib/safeLog'

export async function OPTIONS() {
  return preflight('POST, DELETE, OPTIONS')
}

const MAX_SIZE = 2 * 1024 * 1024 // 2 MB
const ALLOWED = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif'])

export async function POST(req: Request) {
  const user = await getApiUser(req)
  if (!user) return unauthorized('POST, OPTIONS')

  let form: FormData
  try {
    form = await req.formData()
  } catch {
    return Response.json({ error: 'invalid form data' }, { status: 400, headers: corsHeaders('POST, DELETE, OPTIONS') })
  }

  const file = form.get('file') as File | null
  if (!file || typeof file === 'string') {
    return Response.json({ error: 'no file provided' }, { status: 400, headers: corsHeaders('POST, DELETE, OPTIONS') })
  }

  if (!ALLOWED.has(file.type)) {
    return Response.json({ error: 'invalid file type. allowed: png, jpeg, webp, gif' }, { status: 400, headers: corsHeaders('POST, DELETE, OPTIONS') })
  }

  if (file.size > MAX_SIZE) {
    return Response.json({ error: 'file too large. max 2 MB' }, { status: 400, headers: corsHeaders('POST, DELETE, OPTIONS') })
  }

  // Plan SEC-12: file.type ist vom Client gesetzt und nicht belastbar.
  // Magic Bytes prüfen, bevor die Datei im public-Bucket landet.
  const buffer = Buffer.from(await file.arrayBuffer())
  const magic = buffer.slice(0, 4).toString('hex')
  const magicMap: Record<string, string> = {
    '89504e47': 'image/png',       // PNG: 89 50 4E 47
    'ffd8ffe': 'image/jpeg',       // JPEG: FF D8 FF E0/E1/E2/...
    '52494646': 'image/webp',      // WEBP: 52 49 46 46 (RIFF)
    '47494638': 'image/gif',       // GIF: 47 49 46 38 (GIF8)
  }
  let detectedType = ''
  for (const [prefix, mime] of Object.entries(magicMap)) {
    if (magic.startsWith(prefix)) { detectedType = mime; break }
  }
  if (!detectedType || !ALLOWED.has(detectedType)) {
    return Response.json({ error: 'file content does not match its declared type' }, { status: 400, headers: corsHeaders('POST, DELETE, OPTIONS') })
  }

  // Sicherheitspuffer: Magic Bytes wurden geprüft. Re-Encoding (sharp) wäre
  // ideal um EXIF-Daten und Payloads zu entfernen, aber die Route läuft in
  // Fluid Compute ohne native Abhängigkeiten. Magic-Byte-Check ist die Baseline.
  const ext = detectedType.split('/')[1] || 'png'
  const path = `${user.userId}/avatar.${ext}`

  // Delete old avatar if exists
  const { data: existing } = await supabase
    .storage.from('avatars')
    .list(user.userId)

  if (existing?.length) {
    const old = existing.map((f) => `${user.userId}/${f.name}`)
    await supabase.storage.from('avatars').remove(old)
  }

  // Upload new avatar (magic-byte-geprüft, siehe SEC-12)
  const { error: uploadError } = await supabase
    .storage.from('avatars')
    .upload(path, buffer, {
      contentType: detectedType,
      upsert: true,
    })

  if (uploadError) {
    safeError('avatar:upload', uploadError)
    return Response.json({ error: 'upload failed' }, { status: 500, headers: corsHeaders('POST, DELETE, OPTIONS') })
  }

  // Get public URL
  const { data: urlData } = supabase
    .storage.from('avatars')
    .getPublicUrl(path)

  const avatarUrl = urlData?.publicUrl
  if (!avatarUrl) {
    return Response.json({ error: 'url generation failed' }, { status: 500, headers: corsHeaders('POST, DELETE, OPTIONS') })
  }

  // Versioned URL so browser cache is busted on every upload
  const versionedUrl = avatarUrl + '?v=' + Date.now()

  // Save to profile
  const { error: updateError } = await supabase
    .from('profiles')
    .update({ avatar_url: versionedUrl })
    .eq('user_id', user.userId)

  if (updateError) {
    safeError('avatar:profile', updateError)
    return Response.json({ error: 'db error' }, { status: 500, headers: corsHeaders('POST, DELETE, OPTIONS') })
  }

  return Response.json({ url: versionedUrl }, { headers: corsHeaders('POST, DELETE, OPTIONS') })
}

export async function DELETE(req: Request) {
  const user = await getApiUser(req)
  if (!user) return unauthorized('DELETE, OPTIONS')

  // Remove files from storage
  const { data: existing } = await supabase
    .storage.from('avatars')
    .list(user.userId)

  if (existing?.length) {
    const paths = existing.map((f) => `${user.userId}/${f.name}`)
    await supabase.storage.from('avatars').remove(paths)
  }

  // Clear avatar_url in profile
  const { error } = await supabase
    .from('profiles')
    .update({ avatar_url: null })
    .eq('user_id', user.userId)

  if (error) {
    safeError('avatar:delete', error)
    return Response.json({ error: 'db error' }, { status: 500, headers: corsHeaders('DELETE, OPTIONS') })
  }

  return Response.json({ ok: true }, { headers: corsHeaders('DELETE, OPTIONS') })
}
