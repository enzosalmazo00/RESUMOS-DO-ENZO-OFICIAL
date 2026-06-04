/**
 * translate-widget.js — Google Translate estilizado para Resumos do Enzo
 * 
 * Como usar em qualquer página:
 *   <script src="translate-widget.js"></script>
 *
 * O widget injeta automaticamente o botão 🌐 no elemento com id="translateAnchor"
 * Se não existir esse elemento, cria um botão flutuante no canto superior direito.
 */
(function () {
  "use strict";

  // ── CSS ──────────────────────────────────────────────────────────────────────
  var style = document.createElement("style");
  style.textContent = [
    /* Esconde o banner feio do Google Translate */
    ".goog-te-banner-frame { display:none !important; }",
    "body { top:0 !important; }",
    "#goog-te-banner-frame { display:none !important; }",
    ".skiptranslate { display:none !important; }",

    /* Wrapper do botão */
    "#translateAnchor { display:inline-flex; align-items:center; }",

    /* Esconde o select nativo e mostra só nosso botão */
    "#google_translate_element select {",
    "  position:absolute; opacity:0; width:100%; height:100%;",
    "  top:0; left:0; cursor:pointer; z-index:2;",
    "}",
    "#google_translate_element { position:relative; display:inline-block; }",

    /* Botão visual */
    ".gt-custom-btn {",
    "  display:inline-flex; align-items:center; gap:7px;",
    "  padding:9px 16px; border-radius:12px;",
    "  border:1px solid rgba(34,211,238,0.25);",
    "  background:rgba(34,211,238,0.05);",
    "  color:rgba(125,211,232,0.85);",
    "  font-family:'Poppins',sans-serif;",
    "  font-size:13px; font-weight:500;",
    "  cursor:pointer; transition:all .25s;",
    "  white-space:nowrap; pointer-events:none;",
    "}",
    ".gt-custom-btn .gt-globe { font-size:15px; }",
    ".gt-custom-btn .gt-label { font-size:12px; }",

    /* Hover no wrapper (que tem o select por cima) */
    "#google_translate_element:hover .gt-custom-btn {",
    "  background:rgba(34,211,238,0.12);",
    "  border-color:rgba(34,211,238,0.5);",
    "  color:#fff;",
    "}",

    /* Dropdown nativo estilizado — sobrescreve o Google */
    ".goog-te-menu-value span { display:none; }",
    ".goog-te-gadget { color:transparent !important; font-size:0 !important; }",
    ".goog-te-gadget .goog-te-gadget-simple {",
    "  border:none !important;",
    "  background:transparent !important;",
    "}",
  ].join("\n");
  document.head.appendChild(style);

  // ── Callback do Google Translate ─────────────────────────────────────────────
  window.googleTranslateElementInit = function () {
    new google.translate.TranslateElement(
      {
        pageLanguage: "pt",
        includedLanguages: "pt,es",
        layout: google.translate.TranslateElement.InlineLayout.SIMPLE,
        autoDisplay: false,
      },
      "google_translate_element"
    );
  };

  // ── Injeta HTML ───────────────────────────────────────────────────────────────
  function inject() {
    var anchor = document.getElementById("translateAnchor");

    // Se não tiver anchor, cria um flutuante no header (fallback)
    if (!anchor) {
      anchor = document.createElement("div");
      anchor.id = "translateAnchor";
      anchor.style.cssText =
        "position:fixed;top:16px;right:20px;z-index:8999;";
      document.body.appendChild(anchor);
    }

    anchor.innerHTML =
      '<div id="google_translate_element">' +
        '<div class="gt-custom-btn">' +
          '<span class="gt-globe">🌐</span>' +
          '<span class="gt-label">Idioma</span>' +
        '</div>' +
      '</div>';

    // Carrega o script do Google Translate
    var script = document.createElement("script");
    script.src =
      "https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
    script.async = true;
    document.head.appendChild(script);
  }

  // Injeta assim que o DOM estiver pronto
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", inject);
  } else {
    inject();
  }
})();
