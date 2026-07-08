/**
 * Screenshot-Generator für das Figma-Plugin-Listing.
 *
 * Liest dist/ui.html und extrahiert die 5 Screens als
 * standalone HTML-Dateien mit Figma-Theme-CSS-Variablen.
 *
 * Usage: node figma-plugin/screenshots/generate.mjs
 *
 * Output: figma-plugin/screenshots/out/
 *   - 01-welcome.html   (1280×800, Figma light)
 *   - 02-setup.html     (1280×800, Figma light)
 *   - 03-editor.html    (1280×800, Figma light)
 *   - 04-picker.html    (1280×800, Figma light)
 *   - 05-dashboard.html (1280×800, Figma light)
 *
 * Optional: --dark für Dark-Mode-Varianten (dann 10 Dateien)
 */

import * as fs from 'fs';
import * as path from 'path';

const SRC = path.resolve('src/ui.html');
const OUT = path.resolve('screenshots/out');

// ── Screen-Definitionen (ID → Dateiname, Titel) ──────────────────────────
const SCREENS = [
  { id: 's-connect',    file: '01-welcome.html',   title: 'Welcome / Connect' },
  { id: 's-setup',      file: '02-setup.html',      title: 'Test Setup' },
  { id: 's-design',     file: '03-editor.html',     title: 'Variant Editor' },
  { id: 's-element',    file: '04-picker.html',     title: 'Element Picker' },
  { id: 's-dashboard',  file: '05-dashboard.html',  title: 'Dashboard / Results' },
];

// ── Figma Light-Theme CSS-Variablen ──────────────────────────────────────
const FIGMA_LIGHT = {
  '--figma-color-bg': '#ffffff',
  '--figma-color-bg-secondary': '#f5f5f5',
  '--figma-color-bg-hover': '#f0f0f0',
  '--figma-color-text': '#1e1e1e',
  '--figma-color-text-secondary': '#6b6b6b',
  '--figma-color-text-disabled': '#b3b3b3',
  '--figma-color-text-success': '#14ae5c',
  '--figma-color-text-warning': '#e59e0b',
  '--figma-color-border': '#e5e5e5',
  '--figma-color-icon-secondary': '#8a8a8a',
};

// ── Figma Dark-Theme CSS-Variablen ───────────────────────────────────────
const FIGMA_DARK = {
  '--figma-color-bg': '#2c2c2c',
  '--figma-color-bg-secondary': '#383838',
  '--figma-color-bg-hover': '#444444',
  '--figma-color-text': '#ffffff',
  '--figma-color-text-secondary': '#a0a0a0',
  '--figma-color-text-disabled': '#666666',
  '--figma-color-text-success': '#14ae5c',
  '--figma-color-text-warning': '#e59e0b',
  '--figma-color-border': '#444444',
  '--figma-color-icon-secondary': '#8a8a8a',
};

// ── CSS extrahieren (aus <style>...</style>) ─────────────────────────────
function extractCSS(html) {
  const m = html.match(/<style>([\s\S]*?)<\/style>/);
  return m ? m[1] : '';
}

// ── Screen-HTML extrahieren ──────────────────────────────────────────────
function extractScreenHTML(html, screenId) {
  // Finde <div id="SCREEN_ID" class="screen ...">
  const divRegex = new RegExp(
    `<div\\s+id="${screenId}"\\s+class="screen[^"]*"[^>]*>([\\s\\S]*?)</div>\\s*(?=<!--|$|<div\\s+id="s-[a-z]+"\\s+class="screen)`,
    'i'
  );
  const m = html.match(divRegex);
  if (!m) {
    console.warn(`  ⚠️  Screen "${screenId}" nicht gefunden`);
    return null;
  }
  return m[0];
}

// ── HTML-Wrapper bauen ───────────────────────────────────────────────────
function buildHTML(screenHTML, css, themeVars, title) {
  const themeCSS = Object.entries(themeVars)
    .map(([k, v]) => `    ${k}: ${v};`)
    .join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${title}</title>
<style>
/* ── Figma Theme Variables ──────────────────────────────────────────── */
:root {
${themeCSS}
}

/* ── Plugin CSS ──────────────────────────────────────────────────────── */
${css}

/* ── Screenshot frame: 1280×800, zentriert ────────────────────────────── */
html, body {
  margin: 0; padding: 0;
  width: 1280px; height: 800px;
  overflow: hidden;
  background: #e0e0e0; /* neutral grey outside Figma frame */
  display: flex; align-items: center; justify-content: center;
}
.figma-frame {
  width: 1280px; height: 800px;
  display: flex;
  background: var(--figma-color-bg);
  border-radius: 8px;
  box-shadow: 0 4px 32px rgba(0,0,0,.18);
  overflow: hidden;
}

/* ── Figma linke Sidebar (Mock) ──────────────────────────────────────── */
.figma-sidebar {
  width: 240px; flex-shrink: 0;
  background: var(--figma-color-bg-secondary, #f5f5f5);
  border-right: 1px solid var(--figma-color-border, #e5e5e5);
  display: flex; flex-direction: column;
  padding: 20px 16px;
}
.sidebar-layer {
  height: 14px; border-radius: 4px;
  background: var(--figma-color-border, #e5e5e5);
  margin-bottom: 8px;
}
.sidebar-layer:nth-child(odd) { width: 80%; }
.sidebar-layer:nth-child(even) { width: 55%; margin-left: 12px; }

/* ── Figma Canvas (Mock) ──────────────────────────────────────────────── */
.figma-canvas {
  flex: 1; min-width: 0;
  background:
    linear-gradient(45deg, #f0f0f0 25%, transparent 25%),
    linear-gradient(-45deg, #f0f0f0 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #f0f0f0 75%),
    linear-gradient(-45deg, transparent 75%, #f0f0f0 75%);
  background-size: 20px 20px;
  background-position: 0 0, 0 10px, 10px -10px, -10px 0;
  display: flex; align-items: center; justify-content: center;
  position: relative;
}
.canvas-mock {
  width: 360px; height: 280px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 2px 16px rgba(0,0,0,.08);
  padding: 24px;
  display: flex; flex-direction: column; gap: 12px;
}
.canvas-mock-box {
  height: 14px; border-radius: 4px; background: #e8e8e8;
}
.canvas-mock-box:nth-child(1) { width: 60%; }
.canvas-mock-box:nth-child(2) { width: 100%; }
.canvas-mock-box:nth-child(3) { width: 80%; }
.canvas-mock-box:nth-child(4) { width: 30%; height: 40px; border-radius: 8px; background: #0D99FF; }
.canvas-mock-frame {
  position: absolute; top: 16px; left: 16px;
  font-size: 11px; color: #999; font-family: Inter, sans-serif;
  text-transform: uppercase; letter-spacing: .5px;
}

/* ── Plugin Panel ─────────────────────────────────────────────────────── */
.figma-plugin-panel {
  width: 380px; flex-shrink: 0;
  border-left: 1px solid var(--figma-color-border, #e5e5e5);
  overflow: hidden;
  display: flex; flex-direction: column;
}
.figma-plugin-panel .screen {
  display: flex !important;
  height: 800px !important;
}
.figma-plugin-panel .screen .body {
  flex: 1; overflow-y: auto;
}
.figma-plugin-panel .screen .ftr {
  flex-shrink: 0;
}
</style>
</head>
<body>
<div class="figma-frame">
  <div class="figma-sidebar">
    <div class="sidebar-layer"></div>
    <div class="sidebar-layer"></div>
    <div class="sidebar-layer"></div>
    <div class="sidebar-layer" style="margin-top:12px"></div>
    <div class="sidebar-layer"></div>
    <div class="sidebar-layer"></div>
    <div class="sidebar-layer"></div>
  </div>
  <div class="figma-canvas">
    <span class="canvas-mock-frame">Figma Canvas</span>
    <div class="canvas-mock">
      <div class="canvas-mock-box"></div>
      <div class="canvas-mock-box"></div>
      <div class="canvas-mock-box"></div>
      <div class="canvas-mock-box"></div>
    </div>
  </div>
  <div class="figma-plugin-panel">
${screenHTML}
  </div>
</div>
</body>
</html>`;
}

// ── MAIN ─────────────────────────────────────────────────────────────────
async function main() {
  const args = process.argv.slice(2);
  const darkMode = args.includes('--dark');

  if (!fs.existsSync(SRC)) {
    console.error(`❌  ${SRC} nicht gefunden. Bitte zuerst bauen: npm run build`);
    process.exit(1);
  }

  const html = fs.readFileSync(SRC, 'utf8');
  const css = extractCSS(html);

  fs.mkdirSync(OUT, { recursive: true });

  const themeVars = darkMode ? FIGMA_DARK : FIGMA_LIGHT;
  const mode = darkMode ? 'dark' : 'light';
  console.log(`\n📸  Generiere Screenshots (${mode} mode, 1280×800)\n`);

  for (const screen of SCREENS) {
    const screenHTML = extractScreenHTML(html, screen.id);
    if (!screenHTML) continue;

    const fileName = darkMode
      ? screen.file.replace('.html', '-dark.html')
      : screen.file;
    const filePath = path.join(OUT, fileName);
    const fullHTML = buildHTML(screenHTML, css, themeVars, screen.title);

    fs.writeFileSync(filePath, fullHTML);
    console.log(`  ✅  ${fileName}  →  ${screen.title}`);
  }

  // ── Erstelle einen Übersichts-Index ───────────────────────────────────
  const indexHTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Screenshot Studio — variante Figma Plugin</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: Inter, -apple-system, sans-serif;
    background: #1e1e1e; color: #e0e0e0;
    padding: 40px; min-height: 100vh;
  }
  h1 { font-size: 24px; margin-bottom: 8px; }
  p { color: #888; margin-bottom: 32px; max-width: 600px; line-height: 1.6; }
  .grid { display: flex; flex-wrap: wrap; gap: 24px; }
  .card {
    background: #2a2a2a; border: 1px solid #333;
    border-radius: 10px; overflow: hidden;
    width: 340px; transition: border-color .2s, transform .2s;
  }
  .card:hover { border-color: #0D99FF; transform: translateY(-2px); }
  .card-preview {
    width: 100%; height: 200px; background: #333;
    display: flex; align-items: center; justify-content: center;
    overflow: hidden;
  }
  .card-preview iframe {
    width: 340px; height: 213px; /* 1280×800 scaled to fit */
    border: none;
    transform: scale(0.266);
    transform-origin: top left;
    pointer-events: none;
  }
  .card-body { padding: 16px; }
  .card-body h3 { font-size: 15px; margin-bottom: 4px; }
  .card-body span { font-size: 12px; color: #666; }
  .card-body a {
    display: inline-block; margin-top: 10px;
    color: #0D99FF; text-decoration: none; font-size: 13px;
  }
  .card-body a:hover { text-decoration: underline; }
  .mode-tag {
    display: inline-block; padding: 2px 8px;
    border-radius: 4px; font-size: 10px; text-transform: uppercase;
    font-weight: 600; letter-spacing: .3px;
    margin-top: 8px;
  }
  .mode-tag.light { background: #333; color: #e0e0e0; }
  .mode-tag.dark { background: #0a0a0a; color: #aaa; }
</style>
</head>
<body>
<h1>📸 Screenshot Studio</h1>
<p>
  Jede Datei ist eine standalone HTML-Page mit Figma-Frame-Mock (1280×800).
  Im Browser öffnen → Screenshot machen → hochladen.
</p>
<div class="grid">
${SCREENS.map(s => `
  <div class="card">
    <div class="card-preview">
      <iframe src="${s.file}" loading="lazy"></iframe>
    </div>
    <div class="card-body">
      <h3>${s.title}</h3>
      <span>${s.file}</span>
      <span class="mode-tag ${mode}">${mode}</span>
      <br>
      <a href="${s.file}" target="_blank">Vollbild öffnen →</a>
    </div>
  </div>`).join('\n')}
</div>
</body>
</html>`;

  fs.writeFileSync(path.join(OUT, 'index.html'), indexHTML);
  console.log(`\n  📋  index.html  →  Übersicht aller Screenshots`);
  console.log(`\n✨  Fertig! Ausgabe: ${OUT}/`);
  console.log(`   Öffne index.html im Browser zum Durchklicken.\n`);
}

main().catch(err => { console.error(err); process.exit(1); });
