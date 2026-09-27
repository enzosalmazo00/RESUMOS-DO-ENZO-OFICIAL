/**
 * auth-guard.js — v5 PERFORMANCE
 *
 * Objetivos:
 * - Mantém autenticação, aprovação, dispositivo único e validação de acesso.
 * - Inicia consultas de autenticação antes do DOMContentLoaded.
 * - Não bloqueia authReady esperando study-tracker/platform-addon.
 * - Páginas de navegação (PAGE_KEY=null) pintam imediatamente.
 * - Conteúdo protegido usa tela de carregamento escura em vez de página branca.
 * - Scripts auxiliares carregam depois e não atrasam a navegação.
 */

(function () {
  "use strict";

  var SUPABASE_URL = "https://chqhdmjqnjjdatowfyif.supabase.co";
  var SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNocWhkbWpxbmpqZGF0b3dmeWlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAyNDc0MDAsImV4cCI6MjA5NTgyMzQwMH0.v_7y0YD9R1LvFJkz9Vr_zJX0_CE2lo8OY5xX-KtVcFk";
  var LOGIN_PAGE = "login.html";
  var DASHBOARD_PAGE = "dashboard.html";

  window.authClient = null;
  window.authSession = null;

  var initialPageKey = window.PAGE_KEY || null;
  var currentPath = (window.location.pathname || "").toLowerCase();

  // ── Paint imediato / proteção visual ────────────────────────────────────
  // PAGE_KEY=null: dashboard/conta/progresso/etc. podem mostrar o shell imediatamente.
  // PAGE_KEY preenchida: mantém o conteúdo real invisível por uma camada de carregamento,
  // mas elimina o branco puro durante a validação.
  function installFastPaint() {
    document.documentElement.style.visibility = "visible";

    if (!initialPageKey) return;

    document.documentElement.classList.add("enzo-auth-pending");

    var style = document.createElement("style");
    style.id = "enzo-auth-pending-style";
    style.textContent =
      "html.enzo-auth-pending{background:#020810!important;}" +
      "html.enzo-auth-pending body{background:#020810!important;min-height:100vh!important;}" +
      "html.enzo-auth-pending body>*{visibility:hidden!important;}" +
      "html.enzo-auth-pending body:after{" +
        "content:'Validando seu acesso…';" +
        "visibility:visible!important;" +
        "position:fixed;inset:0;z-index:2147483646;" +
        "display:flex;align-items:center;justify-content:center;" +
        "background:radial-gradient(circle at 50% 35%,rgba(34,211,238,.09),transparent 32%),#020810;" +
        "color:rgba(165,243,252,.78);" +
        "font:600 13px system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;" +
        "letter-spacing:.02em;" +
      "}";
    document.head.appendChild(style);
  }

  installFastPaint();

  function revealProtectedPage() {
    document.documentElement.classList.remove("enzo-auth-pending");
    var style = document.getElementById("enzo-auth-pending-style");
    if (style) style.remove();
    document.documentElement.style.visibility = "visible";
  }

  // ── DOM ready sem atrasar as consultas de rede ───────────────────────────
  var domReady = new Promise(function (resolve) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", resolve, { once:true });
    } else {
      resolve();
    }
  });

  // ── Scripts auxiliares: agora NÃO bloqueiam authReady ────────────────────
  function loadScriptOnce(src, id) {
    return new Promise(function (resolve) {
      var existing = id ? document.getElementById(id) : null;

      if (existing) {
        if (existing.dataset.loaded === "1") {
          resolve(true);
          return;
        }
        existing.addEventListener("load", function () {
          existing.dataset.loaded = "1";
          resolve(true);
        }, { once:true });
        existing.addEventListener("error", function () { resolve(false); }, { once:true });
        return;
      }

      var s = document.createElement("script");
      if (id) s.id = id;
      s.src = src;
      s.async = true;
      s.addEventListener("load", function () {
        s.dataset.loaded = "1";
        resolve(true);
      }, { once:true });
      s.addEventListener("error", function () {
        console.warn("[auth-guard] Não foi possível carregar:", src);
        resolve(false);
      }, { once:true });
      document.head.appendChild(s);
    });
  }

  function startSupportScripts(client, session, pageKey) {
    // Tracker só é útil em conteúdo com PAGE_KEY.
    if (pageKey) {
      loadScriptOnce("study-tracker.js", "enzo-study-tracker").then(function (ok) {
        if (!ok || !window.EnzoStudyTracker) return;
        try {
          window.EnzoStudyTracker.start(client, session, pageKey);
        } catch (e) {
          console.warn("[auth-guard] study tracker:", e);
        }
      });
    }

    // Addon do dashboard carrega depois que a tela já foi liberada.
    if (currentPath.indexOf("dashboard") !== -1) {
      loadScriptOnce("platform-addon.js", "enzo-platform-addon").then(function (ok) {
        if (!ok) return;
        if (window.EnzoPlatformAddon && typeof window.EnzoPlatformAddon.start === "function") {
          try { window.EnzoPlatformAddon.start(client, session); }
          catch (e) { console.warn("[auth-guard] platform addon:", e); }
        }
      });
    }
  }

  // ── Presença privada ─────────────────────────────────────────────────────
  var _presenceTouchTimer = null;
  var _presenceCountTimer = null;

  function startPrivatePresence(client, session) {
    if (!client || !session || !session.user) return;

    async function touch() {
      try {
        await client.rpc("presence_touch", {
          p_page: (document.title || location.pathname || "").slice(0, 160)
        });
      } catch (e) {
        console.warn("[auth-guard] presence_touch:", e);
      }
    }

    async function updateCount() {
      try {
        var r = await client.rpc("online_student_count");
        if (r.error) return;
        var count = Number(r.data || 0);
        window.onlineStudentCount = count;
        document.dispatchEvent(new CustomEvent("onlinePresenceChanged", {
          detail: { count: count }
        }));
      } catch (e) {
        console.warn("[auth-guard] online_student_count:", e);
      }
    }

    // Não aguarda presença para liberar a página.
    setTimeout(touch, 0);
    setTimeout(updateCount, 0);

    if (_presenceTouchTimer) clearInterval(_presenceTouchTimer);
    if (_presenceCountTimer) clearInterval(_presenceCountTimer);

    _presenceTouchTimer = setInterval(touch, 30000);
    _presenceCountTimer = setInterval(updateCount, 20000);
  }

  // ── Atalhos de áreas ─────────────────────────────────────────────────────
  function installPlatformLinks() {
    var pathname = (window.location.pathname || "").toLowerCase();

    if (pathname.indexOf("professor.html") !== -1) {
      var teacherHost = document.querySelector(".top-right");
      if (teacherHost && !document.getElementById("professorFinanceShortcut")) {
        var finance = document.createElement("a");
        finance.id = "professorFinanceShortcut";
        finance.className = "smallbtn";
        finance.href = "financeiro-professor.html";
        finance.textContent = "💰 Financeiro";
        teacherHost.insertBefore(finance, teacherHost.lastElementChild);
      }
    }

    if (pathname.indexOf("admin.html") !== -1) {
      var adminHost = document.querySelector(".header-right");
      if (adminHost && !document.getElementById("adminAuditShortcut")) {
        var audit = document.createElement("button");
        audit.id = "adminAuditShortcut";
        audit.className = "btn-outline";
        audit.type = "button";
        audit.textContent = "💳 Auditoria";
        audit.addEventListener("click", function () {
          window.location.href = "auditoria-financeira.html";
        });

        var dashboardButton = Array.prototype.find.call(
          adminHost.querySelectorAll("button"),
          function (button) {
            return (button.textContent || "").toLowerCase().indexOf("dashboard") !== -1;
          }
        );

        adminHost.insertBefore(audit, dashboardButton || adminHost.lastElementChild);
      }
    }

    // Compatibilidade com dashboards antigos. No dashboard atual o texto já está correto.
    if (pathname.indexOf("dashboard") !== -1) {
      Array.prototype.forEach.call(document.querySelectorAll(".tab-btn"), function (b) {
        if ((b.textContent || "").indexOf("Aulões") !== -1) {
          b.textContent = "🎥 Aulas em Vídeo!";
          b.title = "Abrir Aulas em Vídeo";
        }
      });
    }
  }

  // ── Device ID ────────────────────────────────────────────────────────────
  function getDeviceId() {
    var key = "_resumos_did";
    var id = localStorage.getItem(key);
    if (!id) {
      var arr = new Uint8Array(10);
      crypto.getRandomValues(arr);
      id = Array.from(arr).map(function (b) {
        return b.toString(16).padStart(2, "0");
      }).join("");
      localStorage.setItem(key, id);
    }
    return id;
  }

  // ── Acesso normalizado ──────────────────────────────────────────────────
  async function checkAccessInAcessos(client, userId, resumo) {
    if (!resumo) return false;
    try {
      var result = await client
        .from("acessos")
        .select("expira_em")
        .match({ user_id:userId, resumo:resumo })
        .maybeSingle();

      if (result.error) return false;
      var record = result.data;
      if (!record) return false;
      if (!record.expira_em) return true;
      return new Date(record.expira_em) >= new Date();
    } catch (err) {
      console.error("[auth-guard] checkAccessInAcessos erro:", err);
      return false;
    }
  }

  // ── Fluxo principal: começa AGORA, sem esperar DOMContentLoaded ──────────
  (async function bootAuth() {
    if (typeof supabase === "undefined") {
      await domReady;
      _showErrorOverlay("Falha ao carregar o sistema de autenticação. Recarregue a página.");
      return;
    }

    var client;
    try {
      client = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
      window.authClient = client;
    } catch (err) {
      console.error("[auth-guard] Erro ao criar cliente:", err);
      await domReady;
      _showErrorOverlay("Não foi possível iniciar sua sessão. Recarregue a página.");
      return;
    }

    // getSession costuma ler a sessão localmente.
    var session = null;
    try {
      var result = await client.auth.getSession();
      if (result.error) throw result.error;
      session = result.data && result.data.session ? result.data.session : null;

      // Mantém a compatibilidade do v4 somente para casos em que o storage
      // ainda está sendo restaurado após login.
      if (!session) {
        await new Promise(function (r) { setTimeout(r, 250); });
        var retry = await client.auth.getSession();
        session = retry.data && retry.data.session ? retry.data.session : null;
      }
    } catch (err) {
      console.error("[auth-guard] getSession falhou:", err);
      await domReady;
      _showErrorOverlay("Não foi possível verificar sua sessão. Recarregue a página.");
      return;
    }

    if (!session) {
      window.location.replace(LOGIN_PAGE);
      return;
    }

    var pageKey = window.PAGE_KEY || null;
    var isCurso = !!(pageKey && pageKey.indexOf("curso-") === 0);

    var pacoteKey = null;
    if (pageKey && !isCurso) {
      if (pageKey.endsWith("_p1")) pacoteKey = "pacote_p1";
      if (pageKey.endsWith("_p2")) pacoteKey = "pacote_p2";
      if (pageKey.endsWith("_final")) pacoteKey = "pacote_final";
    }

    var extraFields = "";
    if (pageKey && !isCurso) extraFields += ", " + pageKey;
    if (pacoteKey) extraFields += ", " + pacoteKey;
    if (pageKey && !isCurso) extraFields += ", " + pageKey + "_expira";
    if (pacoteKey) extraFields += ", " + pacoteKey + "_expira";

    var fields = "is_approved, active_session, device_id" + extraFields;

    // Perfil e acesso normalizado são buscados em paralelo.
    var profilePromise = client
      .from("profiles")
      .select(fields)
      .eq("id", session.user.id)
      .single();

    var accessPromise = pageKey
      ? Promise.all([
          checkAccessInAcessos(client, session.user.id, pageKey),
          pacoteKey ? checkAccessInAcessos(client, session.user.id, pacoteKey) : Promise.resolve(false)
        ])
      : Promise.resolve([false, false]);

    var profileResult, accessResult;
    try {
      var joined = await Promise.all([profilePromise, accessPromise]);
      profileResult = joined[0];
      accessResult = joined[1];
      if (profileResult.error) throw profileResult.error;
    } catch (err) {
      console.error("[auth-guard] Erro ao buscar perfil/acesso:", err);
      await domReady;
      _showErrorOverlay("Erro ao carregar seu acesso. Tente recarregar a página.");
      return;
    }

    var profile = profileResult.data;
    if (!profile) {
      await domReady;
      _showErrorOverlay("Não foi possível carregar seus dados. Recarregue a página.");
      return;
    }

    if (!profile.is_approved) {
      await client.auth.signOut();
      window.location.replace(LOGIN_PAGE);
      return;
    }

    var currentDevice = getDeviceId();
    if (profile.active_session && profile.device_id && profile.device_id !== currentDevice) {
      await client.auth.signOut();
      window.location.replace(LOGIN_PAGE);
      return;
    }

    if (pageKey) {
      var temAcessoNovo = !!accessResult[0];
      var temAcessoPacote = !!accessResult[1];
      var temAcessoAntigo = !!profile[pageKey] || !!(pacoteKey && profile[pacoteKey]);
      var temAcesso = temAcessoNovo || temAcessoPacote || temAcessoAntigo;

      if (!temAcesso) {
        window.location.replace(DASHBOARD_PAGE);
        return;
      }

      if (!temAcessoNovo && !temAcessoPacote) {
        var expiraCol = pageKey + "_expira";
        var expiraPack = pacoteKey ? pacoteKey + "_expira" : null;
        var expiraData = profile[expiraCol] || (expiraPack ? profile[expiraPack] : null);

        if (expiraData && new Date(expiraData) < new Date()) {
          window.location.replace(DASHBOARD_PAGE);
          return;
        }
      }
    }

    // Garante que scripts da própria página já tenham registrado seus listeners,
    // mas todo o trabalho de rede acima ocorreu enquanto o HTML ainda era analisado.
    await domReady;

    window.authSession = session;

    // Libera conteúdo protegido somente depois da validação.
    if (pageKey) revealProtectedPage();

    installPlatformLinks();

    // authReady não espera mais scripts acessórios.
    document.dispatchEvent(new CustomEvent("authReady", {
      detail: { session:session }
    }));

    // Tudo abaixo é não bloqueante.
    startPrivatePresence(client, session);
    startSupportScripts(client, session, pageKey);
  })();

  function _showErrorOverlay(msg) {
    document.documentElement.classList.remove("enzo-auth-pending");
    document.documentElement.style.visibility = "visible";

    var old = document.getElementById("enzo-auth-error");
    if (old) old.remove();

    var div = document.createElement("div");
    div.id = "enzo-auth-error";
    div.style.cssText = [
      "position:fixed", "inset:0", "z-index:2147483647",
      "display:flex", "flex-direction:column",
      "align-items:center", "justify-content:center",
      "background:#020810",
      "color:#fca5a5", "font-family:Poppins,system-ui,sans-serif",
      "font-size:14px", "text-align:center", "padding:24px", "gap:16px"
    ].join(";");

    div.innerHTML =
      "<div style='font-size:32px'>⚠️</div>" +
      "<div>" + msg + "</div>" +
      "<button onclick='location.reload()' style='" +
        "padding:10px 24px;border:1px solid rgba(252,165,165,.4);border-radius:10px;" +
        "background:transparent;color:#fca5a5;font:600 13px Poppins,system-ui,sans-serif;cursor:pointer" +
      "'>Recarregar</button>";

    (document.body || document.documentElement).appendChild(div);
  }
})();
