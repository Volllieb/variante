# Chrome Extension — AB-Testing

Kein Build-Schritt nötig. Die Extension besteht aus Plain-JS-Dateien.

## In Chrome laden

1. Chrome öffnen und `chrome://extensions` aufrufen
2. **Entwicklermodus** (oben rechts) aktivieren
3. **"Entpackte Erweiterung laden"** klicken
4. Diesen Ordner (`chrome-extension/`) auswählen

## Bei Änderungen

Nach jeder Änderung an `.js`-Dateien auf `chrome://extensions` die Extension
neu laden (Reload-Symbol ↺ auf der Extension-Karte).

## Dateien

| Datei | Zweck |
|-------|-------|
| `manifest.json` | Extension-Konfiguration (Permissions, Entry Points) |
| `content.js` | Läuft auf der Client-Site: Element-Picker + Goal-Picker |
| `background.js` | Service Worker: koordiniert Popup ↔ Content |
| `popup.html` / `popup.js` | Popup-UI der Extension |
