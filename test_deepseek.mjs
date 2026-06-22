// Test: DeepSeek API — Vision (Bild) testen
// Ergebnis: deepseek-chat unterstützt KEINE Bilder!
// Der Prompt läuft nur über Text (frameContent als JSON).
const key = 'sk-246a66e8fae04fcb81c2d998a78d829a'

async function main() {
  console.log('=== Test: Ohne Bild (wie /api/generate jetzt) ===')
  const res = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
    body: JSON.stringify({
      model: 'deepseek-chat',
      max_tokens: 200,
      messages: [{
        role: 'user',
        content: 'Erstelle einen blauen Button mit border-radius: 8px. Antworte nur mit HTML.'
      }],
    }),
  })
  const text = await res.text()
  console.log('Status:', res.status)
  if (res.ok) {
    const data = JSON.parse(text)
    console.log('HTML:', data.choices[0].message.content)
  } else {
    console.log('Fehler:', text.slice(0, 500))
  }
}

main().catch(console.error)
