/**
 * auth-guard.js — v4
 * DUAL-MODE: tabela acessos + fallback profiles.
 *
 * Integrações v4:
 *  - Carrega study-tracker.js automaticamente.
 *  - Carrega platform-addon.js automaticamente no dashboard.
 *  - Adiciona atalho Financeiro na Área do Professor.
 *  - Adiciona atalho Auditoria Financeira no Painel Admin.
 *  - Mantém o sistema anterior de autenticação/acesso.
 *
 * Após auth OK dispara:
 *   document.dispatchEvent(new CustomEvent("authReady"))
 *   window.authClient
 *   window.authSession
 */

(function () {
  "use strict";

  var SUPABASE_URL = "https://chqhdmjqnjjdatowfyif.supabase.co";
  var SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNocWhkbWpxbmpqZGF0b3dmeWlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAyNDc0MDAsImV4cCI6MjA5NTgyMzQwMH0.v_7y0YD9R1LvFJkz9Vr_zJX0_CE2lo8OY5xX-KtVcFk";
  var LOGIN_PAGE     = "login.html";
  var DASHBOARD_PAGE = "dashboard.html";

  window.authClient  = null;
  window.authSession = null;

  // ── Scripts auxiliares do novo sistema ──────────────────────────────────
  function loadScriptOnce(src, id) {
    return new Promise(function (resolve) {
      var existing = id ? document.getElementById(id) : null;
      if (existing) {
        if (existing.dataset.loaded === "1") {
          resolve(true);
          return;
        }
        existing.addEventListener("load", function () { resolve(true); }, { once:true });
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

  var _path = (window.location.pathname || "").toLowerCase();

  var _supportScriptsReady = Promise.all([
    loadScriptOnce("study-tracker.js", "enzo-study-tracker"),
    _path.indexOf("dashboard") !== -1
      ? loadScriptOnce("platform-addon.js", "enzo-platform-addon")
      : Promise.resolve(true)
  ]);

  // ── Presença privada ─────────────────────────────────────────────────────
  var _presenceTouchTimer = null;
  var _presenceCountTimer = null;

  function startPrivatePresence(client, session) {
    if (!client || !session || !session.user) return;

    async function touch() {
      try {
        await client.rpc("presence_touch", {
          p_page: (document.title || location.pathname || "").slice(0,160)
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

    touch();
    updateCount();

    if (_presenceTouchTimer) clearInterval(_presenceTouchTimer);
    if (_presenceCountTimer) clearInterval(_presenceCountTimer);

    _presenceTouchTimer = setInterval(touch, 30000);
    _presenceCountTimer = setInterval(updateCount, 20000);
  }

  // ── Atalhos das novas áreas ──────────────────────────────────────────────
  function installPlatformLinks() {
    var pathname = (window.location.pathname || "").toLowerCase();

    // Área do Professor
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

    // Painel ADM
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
          function (b) {
            return (b.textContent || "").toLowerCase().indexOf("dashboard") !== -1;
          }
        );

        if (dashboardButton) adminHost.insertBefore(audit, dashboardButton);
        else adminHost.appendChild(audit);
      }
    }

    // Padronização pedida anteriormente.
    if (pathname.indexOf("dashboard") !== -1) {
      Array.prototype.forEach.call(document.querySelectorAll(".tab-btn"), function (b) {
        if ((b.textContent || "").indexOf("Aulões") !== -1) {
          b.textContent = "🎥 Aulas em Vídeo!";
          b.title = "Abrir Aulas em Vídeo";
        }
      });
    }
  }

  // ── Device ID persistente via crypto ────────────────────────────────────
  function getDeviceId() {
    var key = "_resumos_did";
    var id  = localStorage.getItem(key);
    if (!id) {
      var arr = new Uint8Array(10);
      crypto.getRandomValues(arr);
      id = Array.from(arr).map(function(b) {
        return b.toString(16).padStart(2, "0");
      }).join("");
      localStorage.setItem(key, id);
    }
    return id;
  }

  // ── Verificar acesso na tabela `acessos` ────────────────────────────────
  async function checkAccessInAcessos(client, userId, resumo) {
    try {
      var result = await client
        .from("acessos")
        .select("expira_em")
        .match({ user_id: userId, resumo: resumo })
        .single();

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

  document.addEventListener("DOMContentLoaded", async function () {

    if (typeof supabase === "undefined") {
      console.error("[auth-guard] Supabase SDK nao carregado.");
      return;
    }

    var client;
    try {
      client = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
      window.authClient = client;
    } catch (err) {
      console.error("[auth-guard] Erro ao criar cliente:", err);
      return;
    }

    // ── Verificar sessão Supabase ─────────────────────────────────────────
    var session = null;
    try {
      var result = await client.auth.getSession();
      if (result.error) throw result.error;
      session = (result.data && result.data.session) ? result.data.session : null;

      if (!session) {
        await new Promise(function(r){ setTimeout(r, 800); });
        var retry = await client.auth.getSession();
        session = (retry.data && retry.data.session) ? retry.data.session : null;
      }
    } catch (err) {
      console.error("[auth-guard] getSession falhou:", err);
      return;
    }

    if (!session) {
      window.location.replace(LOGIN_PAGE);
      return;
    }

    // ── Buscar perfil ─────────────────────────────────────────────────────
    var pageKey = window.PAGE_KEY || null;
    var isCurso = !!(pageKey && pageKey.indexOf("curso-") === 0);

    var pacoteKey = null;
    if (pageKey && !isCurso) {
      if (pageKey.endsWith("_p1"))    pacoteKey = "pacote_p1";
      if (pageKey.endsWith("_p2"))    pacoteKey = "pacote_p2";
      if (pageKey.endsWith("_final")) pacoteKey = "pacote_final";
    }

    var extraFields = "";
    if (pageKey && !isCurso) extraFields += ", " + pageKey;
    if (pacoteKey)           extraFields += ", " + pacoteKey;
    if (pageKey && !isCurso) extraFields += ", " + pageKey + "_expira";
    if (pacoteKey)           extraFields += ", " + pacoteKey + "_expira";

    var fields = "is_approved, active_session, device_id" + extraFields;

    var profile = null;
    try {
      var res = await client
        .from("profiles")
        .select(fields)
        .eq("id", session.user.id)
        .single();

      if (res.error) throw res.error;
      profile = res.data;
    } catch (err) {
      console.error("[auth-guard] Erro ao buscar perfil:", err);
      _showErrorOverlay("Erro ao carregar perfil. Tente recarregar a página.");
      return;
    }

    if (!profile) {
      _showErrorOverlay("Não foi possível carregar seus dados. Recarregue a página.");
      return;
    }

    // ── Conta aprovada? ───────────────────────────────────────────────────
    if (!profile.is_approved) {
      alert("Sua conta ainda não foi aprovada. Aguarde o contato via WhatsApp.");
      await client.auth.signOut();
      window.location.replace(LOGIN_PAGE);
      return;
    }

    // ── Dispositivo autorizado ────────────────────────────────────────────
    var currentDevice = getDeviceId();

    if (profile.active_session && profile.device_id && profile.device_id !== currentDevice) {
      await client.auth.signOut();
      window.location.replace(LOGIN_PAGE);
      return;
    }

    // ── Verificar acesso à página ─────────────────────────────────────────
    if (pageKey) {
      var temAcessoNovo = await checkAccessInAcessos(client, session.user.id, pageKey);
      var temAcessoPacote = pacoteKey
        ? await checkAccessInAcessos(client, session.user.id, pacoteKey)
        : false;

      var temAcessoAntigo = !!profile[pageKey] || !!(pacoteKey && profile[pacoteKey]);
      var temAcesso = temAcessoNovo || temAcessoPacote || temAcessoAntigo;

      if (!temAcesso) {
        alert("Acesso não liberado para este conteúdo. Faça o pagamento para liberar.");
        window.location.replace(DASHBOARD_PAGE);
        return;
      }

      if (!temAcessoNovo && !temAcessoPacote) {
        var expiraCol  = pageKey + "_expira";
        var expiraPack = pacoteKey ? pacoteKey + "_expira" : null;
        var expiraData = profile[expiraCol] || (expiraPack ? profile[expiraPack] : null);

        if (expiraData && new Date(expiraData) < new Date()) {
          alert("Seu acesso a este resumo expirou. Renove para continuar.");
          window.location.replace(DASHBOARD_PAGE);
          return;
        }
      }
    }

    // Garante que os scripts novos já estejam registrados antes do authReady.
    try {
      await _supportScriptsReady;
    } catch (e) {
      console.warn("[auth-guard] suporte adicional:", e);
    }

    // ── TUDO OK ───────────────────────────────────────────────────────────
    window.authSession = session;
    startPrivatePresence(client, session);

    if (window.EnzoStudyTracker) {
      try {
        window.EnzoStudyTracker.start(client, session, pageKey);
      } catch (e) {
        console.warn("[auth-guard] study tracker:", e);
      }
    }

    installPlatformLinks();

    document.dispatchEvent(new CustomEvent("authReady", {
      detail: { session: session }
    }));
  });

  // ── Overlay de erro ───────────────────────────────────────────────────
  function _showErrorOverlay(msg) {
    document.documentElement.style.visibility = "visible";
    var div = document.createElement("div");
    div.style.cssText = [
      "position:fixed", "inset:0", "z-index:9999",
      "display:flex", "flex-direction:column",
      "align-items:center", "justify-content:center",
      "background:rgba(2,8,16,0.92)",
      "color:#fca5a5", "font-family:Poppins,sans-serif",
      "font-size:14px", "text-align:center", "padding:24px", "gap:16px"
    ].join(";");

    div.innerHTML =
      "<div style='font-size:32px'>⚠️</div>" +
      "<div>" + msg + "</div>" +
      "<button onclick='location.reload()' style='" +
        "padding:10px 24px;border:1px solid rgba(252,165,165,0.4);border-radius:10px;" +
        "background:transparent;color:#fca5a5;font-family:Poppins,sans-serif;" +
        "font-size:13px;cursor:pointer" +
      "'>Recarregar</button>";

    document.body.appendChild(div);
  }

})();
