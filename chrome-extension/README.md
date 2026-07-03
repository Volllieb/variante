# Browser Extension — A/B Element Picker

Kein Build-Schritt nötig. Die Extension besteht aus Plain-JS-Dateien. Installation: manuell via `chrome://extensions` (Developer Mode → Load unpacked).

## Dateien

| Datei | Zweck |
|-------|-------|
| `manifest.json` | Extension-Konfiguration (MV3, Permissions, Entry Points) |
| `background.js` | Service Worker: Hash-Parsing, Auto-Flow-Koordination, Popup-Kommunikation |
| `content-picker.js` | On-Demand: Element-Picker + Goal-Picker (wird via `scripting.executeScript` injiziert) |
| `popup.html` / `popup.js` | Popup-UI: manueller Test-ID-Input, Picker-Start |
| `welcome.html` | Post-Install-Welcome-Seite |
| `store-listing.md` | CWS-Listing-Texte (nicht Teil der Extension) |
| `icons/` | Extension-Icons (16/32/48/128px) |

## In Chrome laden

1. Chrome öffnen und `chrome://extensions` aufrufen
2. **Entwicklermodus** (oben rechts) aktivieren
3. **"Entpackte Erweiterung laden"** klicken
4. Diesen Ordner (`chrome-extension/`) auswählen

## Bei Änderungen

Nach jeder Änderung an `.js`-Dateien auf `chrome://extensions` die Extension
neu laden (Reload-Symbol ↺ auf der Extension-Karte).
