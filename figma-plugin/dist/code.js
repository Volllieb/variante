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
      figma.showUI(__html__, { width: 320, height: 360, title: "variante" });
      figma.clientStorage.getAsync("ab_token").then((token) => {
        figma.ui.postMessage({ type: "TOKEN", token: typeof token === "string" ? token : "" });
      });
      figma.ui.onmessage = async (msg) => {
        switch (msg.type) {
          case "OPEN_URL": {
            if (msg.url) {
              try {
                figma.openExternal(msg.url);
              } catch (e) {
              }
            }
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
