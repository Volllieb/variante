// Shared snippet code — used by DomainGate, SetupClient, and copy-prompt flows.
// Keep in sync with README.md SRI hash when ab.js changes.
export const SNIPPET_CODE = `<!-- A/B Testing: universal snippet — paste in <head> on EVERY page -->
<link rel="preconnect" href="https://www.getvariante.com" crossorigin>
<style id="__ab_hide">html.__ab_pending{opacity:0!important}</style>
<script>document.documentElement.classList.add("__ab_pending");(function p(){if(window.__ab_pending_resolve)document.documentElement.classList.remove("__ab_pending");else setTimeout(p,50)})();setTimeout(function(){document.documentElement.classList.remove("__ab_pending")},10000)<\/script>
<script async src="https://www.getvariante.com/ab.js" integrity="sha384-WmnP7J7YjtVXVDkh3u1ITwERXOn4u7UvwF36cNGbYDyODMHBC3LkBb1nW9NAx/Ll" crossorigin="anonymous"><\/script>`
