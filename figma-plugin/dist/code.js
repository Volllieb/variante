"use strict";
(() => {
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __commonJS = (cb, mod) => function __require() {
    try {
      return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
    } catch (e) {
      throw mod = 0, e;
    }
  };

  // src/code.ts
  var require_code = __commonJS({
    "src/code.ts"() {
      figma.showUI(__html__, { width: 360, height: 560, title: "Variante" });
      figma.clientStorage.getAsync("ab_token").then((token) => {
        figma.ui.postMessage({ type: "TOKEN", token: typeof token === "string" ? token : "" });
      });
      function selectionSummary() {
        const sel = figma.currentPage.selection;
        if (sel.length === 0) return { count: 0 };
        if (sel.length > 1) return { count: sel.length };
        const n = sel[0];
        return {
          count: 1,
          name: n.name,
          nodeType: n.type,
          exportable: typeof n.exportAsync === "function"
        };
      }
      function postSelection() {
        figma.ui.postMessage({ type: "SELECTION", selection: selectionSummary() });
      }
      figma.on("selectionchange", postSelection);
      function rgbToHex(c) {
        const to = (v) => Math.round(v * 255).toString(16).padStart(2, "0");
        return "#" + to(c.r) + to(c.g) + to(c.b);
      }
      function paintToObj(p) {
        if (!p || p.visible === false) return null;
        if (p.type === "SOLID") {
          return { type: "solid", hex: rgbToHex(p.color), opacity: typeof p.opacity === "number" ? p.opacity : 1 };
        }
        if (typeof p.type === "string" && p.type.indexOf("GRADIENT") === 0) {
          const stops = Array.isArray(p.gradientStops) ? p.gradientStops.map((s) => ({ hex: rgbToHex(s.color), pos: Math.round(s.position * 100) / 100 })) : [];
          return { type: p.type.toLowerCase(), stops };
        }
        return null;
      }
      function paintsToArr(paints) {
        if (!Array.isArray(paints)) return [];
        return paints.map(paintToObj).filter(Boolean);
      }
      function effectsToArr(effects) {
        if (!Array.isArray(effects)) return [];
        return effects.filter((e) => e && e.visible !== false && (e.type === "DROP_SHADOW" || e.type === "INNER_SHADOW")).map((e) => ({
          type: e.type.toLowerCase(),
          hex: e.color ? rgbToHex(e.color) : void 0,
          x: e.offset ? Math.round(e.offset.x) : 0,
          y: e.offset ? Math.round(e.offset.y) : 0,
          blur: Math.round(e.radius || 0),
          spread: Math.round(e.spread || 0)
        }));
      }
      function dim(v) {
        if (!v || typeof v !== "object") return void 0;
        if (v.unit === "AUTO") return "auto";
        if (typeof v.value === "number") return v.unit === "PERCENT" ? v.value + "%" : Math.round(v.value) + "px";
        return void 0;
      }
      function extractNode(node, depth) {
        const item = { type: node.type, name: node.name };
        if (typeof node.characters === "string") item.text = node.characters.slice(0, 200);
        if (typeof node.fontSize === "number") item.fontSize = node.fontSize;
        if (node.fontName && node.fontName !== figma.mixed) {
          item.fontFamily = node.fontName.family;
          item.fontStyle = node.fontName.style;
        }
        const lh = dim(node.lineHeight);
        if (lh) item.lineHeight = lh;
        const ls = dim(node.letterSpacing);
        if (ls) item.letterSpacing = ls;
        if (node.textAlignHorizontal) item.textAlign = node.textAlignHorizontal;
        if (node.textCase && node.textCase !== "ORIGINAL") item.textCase = node.textCase;
        const fills = paintsToArr(node.fills);
        if (fills.length) item.fills = fills;
        const strokes = paintsToArr(node.strokes);
        if (strokes.length) {
          item.strokes = strokes;
          if (typeof node.strokeWeight === "number") item.strokeWeight = node.strokeWeight;
        }
        const effects = effectsToArr(node.effects);
        if (effects.length) item.effects = effects;
        if (typeof node.cornerRadius === "number" && node.cornerRadius > 0) {
          item.cornerRadius = node.cornerRadius;
        } else if (node.cornerRadius === figma.mixed) {
          item.cornerRadius = {
            tl: node.topLeftRadius,
            tr: node.topRightRadius,
            br: node.bottomRightRadius,
            bl: node.bottomLeftRadius
          };
        }
        if (typeof node.opacity === "number" && node.opacity < 1) item.opacity = node.opacity;
        if (node.layoutMode && node.layoutMode !== "NONE") {
          item.layoutMode = node.layoutMode;
          item.itemSpacing = node.itemSpacing;
          item.padding = {
            top: node.paddingTop,
            right: node.paddingRight,
            bottom: node.paddingBottom,
            left: node.paddingLeft
          };
          if (node.primaryAxisAlignItems) item.justify = node.primaryAxisAlignItems;
          if (node.counterAxisAlignItems) item.align = node.counterAxisAlignItems;
        }
        if (typeof node.width === "number") {
          item.width = Math.round(node.width);
          item.height = Math.round(node.height);
        }
        if (typeof node.x === "number") {
          item.x = Math.round(node.x);
          item.y = Math.round(node.y);
        }
        if (depth < 5 && Array.isArray(node.children) && node.children.length) {
          item.children = node.children.slice(0, 20).map((c) => extractNode(c, depth + 1));
        }
        return item;
      }
      figma.ui.onmessage = async (msg) => {
        switch (msg.type) {
          case "GET_SELECTION": {
            postSelection();
            break;
          }
          case "EXPORT_SELECTION": {
            const sel = figma.currentPage.selection;
            if (sel.length !== 1) {
              figma.ui.postMessage({ type: "ERROR", message: "Bitte genau ein Element in Figma ausw\xE4hlen." });
              return;
            }
            const node = sel[0];
            if (typeof node.exportAsync !== "function") {
              figma.ui.postMessage({ type: "ERROR", message: "Dieses Element kann nicht exportiert werden." });
              return;
            }
            try {
              const bytes = await node.exportAsync({
                format: "PNG",
                constraint: { type: "SCALE", value: 2 }
              });
              const base64 = figma.base64Encode(bytes);
              const content = extractNode(sel[0], 0);
              figma.ui.postMessage({ type: "FRAME_PNG", base64, content });
            } catch (e) {
              figma.ui.postMessage({ type: "ERROR", message: "Export fehlgeschlagen" });
            }
            break;
          }
          case "OPEN_URL": {
            if (msg.url) {
              try {
                figma.openExternal(msg.url);
              } catch (e) {
              }
            }
            break;
          }
          case "TOKEN_SAVE": {
            await figma.clientStorage.setAsync("ab_token", typeof msg.token === "string" ? msg.token : "");
            break;
          }
          case "CLOSE":
            figma.closePlugin();
            break;
        }
      };
    }
  });
  require_code();
})();
