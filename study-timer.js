/**
 * study-timer.js — Timer de estudo flutuante
 * Inclua em todas as páginas de resumo APÓS o auth-guard.js
 * Inicia automaticamente quando authReady é disparado
 */
(function() {
"use strict";

var startTime = null;
var timerInterval = null;
var notificacoes = [
  { minutos: 30,  mostrada: false, msg: "💧 Ei! Você está estudando há <strong>30 minutos</strong> seguidos. Não se esqueça de beber água e dar uma respirada!" },
  { minutos: 60,  mostrada: false, msg: "🦵 <strong>1 hora</strong> de estudo intenso! Hora de esticar as pernas, se hidratar e descansar os olhos por 5 minutinhos." },
  { minutos: 90,  mostrada: false, msg: "🧠 <strong>1h30 de foco total!</strong> Seu cérebro agradece uma pausa. Levante, respire fundo — você merece!" },
  { minutos: 120, mostrada: false, msg: "🏆 <strong>2 horas estudando!</strong> Isso é dedicação de verdade. Faça uma pausa maior — você está indo muito bem!" },
  { minutos: 180, mostrada: false, msg: "⭐ <strong>3 horas!</strong> Você é incrível. Mas agora é obrigação: pare, coma algo e volte renovado(a)!" },
];

// ── CSS ──────────────────────────────────────────────────────────────────────
var style = document.createElement("style");
style.textContent = [
  ".st-widget{position:fixed;bottom:20px;right:20px;z-index:9000;display:flex;flex-direction:column;align-items:flex-end;gap:10px;font-family:Poppins,sans-serif;}",
  ".st-timer{display:flex;align-items:center;gap:8px;padding:10px 16px;border-radius:50px;",
    "background:rgba(2,8,16,0.88);border:1px solid rgba(34,211,238,0.25);",
    "backdrop-filter:blur(12px);box-shadow:0 8px 24px rgba(0,0,0,0.4);",
    "cursor:pointer;transition:all .25s;user-select:none;}",
  ".st-timer:hover{border-color:rgba(34,211,238,0.5);background:rgba(2,12,24,0.95);}",
  ".st-dot{width:7px;height:7px;border-radius:50%;background:#22d3ee;animation:st-pulse 1.5s ease infinite;}",
  "@keyframes st-pulse{0%,100%{opacity:1;transform:scale(1);}50%{opacity:0.5;transform:scale(0.8);}}",
  ".st-time{font-size:13px;font-weight:700;color:#e2f8fc;letter-spacing:0.05em;min-width:44px;}",
  ".st-label{font-size:10px;color:rgba(125,211,232,0.5);font-weight:500;}",
  ".st-back{display:flex;align-items:center;gap:6px;padding:8px 14px;border-radius:50px;",
    "background:rgba(2,8,16,0.75);border:1px solid rgba(34,211,238,0.15);",
    "backdrop-filter:blur(8px);text-decoration:none;color:#7dd3e8;",
    "font-size:12px;font-weight:500;transition:all .25s;}",
  ".st-back:hover{border-color:rgba(34,211,238,0.4);color:#fff;background:rgba(2,12,24,0.9);}",

  // Notificação toast
  ".st-toast{position:fixed;bottom:80px;right:20px;z-index:9001;max-width:320px;",
    "padding:16px 18px;border-radius:16px;",
    "background:linear-gradient(135deg,rgba(2,13,26,0.97),rgba(1,8,18,0.97));",
    "border:1px solid rgba(34,211,238,0.25);",
    "box-shadow:0 12px 40px rgba(0,0,0,0.5),0 0 40px rgba(34,211,238,0.05) inset;",
    "font-family:Poppins,sans-serif;font-size:13px;color:#c0f0f8;line-height:1.6;",
    "transform:translateX(120%);transition:transform .4s cubic-bezier(.34,1.56,.64,1);",
    "display:flex;flex-direction:column;gap:10px;}",
  ".st-toast.show{transform:translateX(0);}",
  ".st-toast-close{align-self:flex-end;padding:5px 12px;border-radius:20px;border:1px solid rgba(34,211,238,0.2);",
    "background:transparent;color:#7dd3e8;font-size:11px;font-family:Poppins,sans-serif;",
    "cursor:pointer;transition:all .2s;}",
  ".st-toast-close:hover{background:rgba(34,211,238,0.1);color:#fff;}",
].join("");
document.head.appendChild(style);

// ── HTML ──────────────────────────────────────────────────────────────────────
function buildWidget() {
  var widget = document.createElement("div");
  widget.className = "st-widget";
  widget.id = "stWidget";

  // Botão voltar ao dashboard
  var back = document.createElement("a");
  back.className = "st-back";
  back.href = "dashboard.html";
  back.innerHTML = "← Dashboard";
  widget.appendChild(back);

  // Timer
  var timer = document.createElement("div");
  timer.className = "st-timer";
  timer.title = "Tempo de estudo nesta sessão";
  timer.innerHTML =
    '<span class="st-dot"></span>' +
    '<div>' +
      '<div class="st-time" id="stTime">00:00</div>' +
      '<div class="st-label">estudando</div>' +
    '</div>';
  widget.appendChild(timer);

  document.body.appendChild(widget);
}

// ── TIMER ─────────────────────────────────────────────────────────────────────
function formatTime(seconds) {
  var h = Math.floor(seconds / 3600);
  var m = Math.floor((seconds % 3600) / 60);
  var s = seconds % 60;
  if (h > 0) {
    return h + "h " + String(m).padStart(2,"0") + "min";
  }
  return String(m).padStart(2,"0") + ":" + String(s).padStart(2,"0");
}

function tick() {
  var elapsed = Math.floor((Date.now() - startTime) / 1000);
  var el = document.getElementById("stTime");
  if (el) el.textContent = formatTime(elapsed);

  // Checa notificações
  var minutos = elapsed / 60;
  notificacoes.forEach(function(n) {
    if (!n.mostrada && minutos >= n.minutos) {
      n.mostrada = true;
      showToast(n.msg);
    }
  });
}

// ── TOAST ─────────────────────────────────────────────────────────────────────
var toastQueue = [];
var toastActive = false;

function showToast(msg) {
  toastQueue.push(msg);
  if (!toastActive) processQueue();
}

function processQueue() {
  if (toastQueue.length === 0) { toastActive = false; return; }
  toastActive = true;
  var msg = toastQueue.shift();

  var toast = document.createElement("div");
  toast.className = "st-toast";
  toast.innerHTML =
    '<div>' + msg + '</div>' +
    '<button class="st-toast-close" onclick="this.parentElement.classList.remove(\'show\');setTimeout(function(){this.parentElement.remove();processQueue();}.bind(this),400)">OK, obrigado! ✓</button>';

  document.body.appendChild(toast);
  setTimeout(function(){ toast.classList.add("show"); }, 50);

  // Auto fecha após 12 segundos
  setTimeout(function() {
    if (toast.parentElement) {
      toast.classList.remove("show");
      setTimeout(function(){
        if (toast.parentElement) toast.remove();
        setTimeout(processQueue, 500);
      }, 400);
    }
  }, 12000);
}

// ── INIT ──────────────────────────────────────────────────────────────────────
document.addEventListener("authReady", function() {
  buildWidget();
  startTime = Date.now();
  timerInterval = setInterval(tick, 1000);
  tick();
});

// Para o timer quando fecha a página
window.addEventListener("beforeunload", function() {
  if (timerInterval) clearInterval(timerInterval);
});

})();
