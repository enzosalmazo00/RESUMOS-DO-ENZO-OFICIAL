/**
 * auth-guard.js — v4 (expiração individual obrigatória para resumos de prova)
 *
 * MUDANÇAS V2 → V3:
 *  [M1] Adicionada função checkAccessInAcessos() que:
 *       - Tenta ler de `acessos` table
 *       - Verifica expiração (expira_em)
 *       - FALLBACK: se não encontrar ou erro, retorna false (não quebra auth)
 *  [M2] Verificação de acesso à página agora usa dual-mode:
 *       - Primeiro: checkAccessInAcessos()
 *       - Depois: profile[pageKey] ou profile["pacote_" + tipo]
 *  [M3] Mantém compatibilidade 100% — nenhuma mudança quebra usuários antigos
 *
 * Como usar em cada página protegida:
 *   <script>window.PAGE_KEY = "biofisica";</script>
 *   <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
 *   <script src="auth-guard.js"></script>
 *
 * Após auth OK dispara: document.dispatchEvent(new CustomEvent("authReady"))
 * window.authClient  → cliente Supabase
 * window.authSession → sessão do usuário
 */

(function () {
  "use strict";

  var SUPABASE_URL = "https://chqhdmjqnjjdatowfyif.supabase.co";
  var SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNocWhkbWpxbmpqZGF0b3dmeWlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAyNDc0MDAsImV4cCI6MjA5NTgyMzQwMH0.v_7y0YD9R1LvFJkz9Vr_zJX0_CE2lo8OY5xX-KtVcFk";
  var LOGIN_PAGE     = "login.html";
  var DASHBOARD_PAGE = "dashboard.html";

  window.authClient  = null;
  window.authSession = null;

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

  // ── [M1] Verificar acesso em tabela `acessos` com fallback seguro ───────
  async function checkAccessInAcessos(client, userId, resumo) {
    try {
      // Tenta ler de acessos (com RLS — só vê seu próprio)
      var result = await client
        .from("acessos")
        .select("expira_em")
        .match({ user_id: userId, resumo: resumo })
        .single();

      if (result.error) {
        // Não encontrou — isso é esperado se user não tem esse acesso ainda
        // NÃO é erro de conexão, é que não existe registro
        // console.log("[auth-guard] acessos: nao encontrado para", resumo);
        return false;
      }

      // Encontrou! Agora verifica expiração
      var record = result.data;
      if (!record) return false;

      // Se não tem expira_em = acesso permanente
      if (!record.expira_em) {
        return true;
      }

      // Se tem expira_em, verifica se já passou
      var expiraData = new Date(record.expira_em);
      var agora = new Date();
      
      if (expiraData < agora) {
        // Expirou
        return false;
      }

      // Tá dentro do prazo
      return true;

    } catch (err) {
      console.error("[auth-guard] checkAccessInAcessos erro:", err);
      // NUNCA retorna erro — sempre fallback pra false
      // (que vai cair no sistema antigo de profiles)
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

    // Sem sessão → redireciona para login
    if (!session) {
      window.location.replace(LOGIN_PAGE);
      return;
    }

    // ── Buscar perfil ─────────────────────────────────────────────────────
    var pageKey = window.PAGE_KEY || null;

    // [CURSOS] Chaves de curso (ex.: "curso-peconhentos") vivem SÓ na tabela
    // `acessos`, não têm coluna em `profiles`. Marcamos para não injetar o nome
    // como coluna no select de profiles (evita erro 400) e validar via acessos.
    var isCurso = !!(pageKey && pageKey.indexOf("curso-") === 0);

    function isS4PageKey(k) {
      if (!k) return false;
      return /^(fisiologia_2|bioquimica_2|epidemiologia|nutricao|microbiologia_2|micro_pratica_2|eletrocardiograma)_(p1|p2|final)$/.test(k);
    }

    var pacoteKey = null;
    if (pageKey && !isCurso) {
      var pacotePrefix = isS4PageKey(pageKey) ? "pacote_s4_" : "pacote_";
      if (pageKey.endsWith("_p1"))    pacoteKey = pacotePrefix + "p1";
      if (pageKey.endsWith("_p2"))    pacoteKey = pacotePrefix + "p2";
      if (pageKey.endsWith("_final")) pacoteKey = pacotePrefix + "final";
    }

    var extraFields = "";
    if (pageKey && !isCurso)  extraFields += ", " + pageKey;
    if (pacoteKey)            extraFields += ", " + pacoteKey;
    if (pageKey && !isCurso)  extraFields += ", " + pageKey + "_expira";
    if (pacoteKey)            extraFields += ", " + pacoteKey + "_expira";

    var fields = "is_approved, is_admin, active_session, device_id, acesso_expira_em, resumos_presente" + extraFields;

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

    // ── Verificar dispositivo autorizado ──────────────────────────────────
    var currentDevice = getDeviceId();

    if (profile.active_session && profile.device_id && profile.device_id !== currentDevice) {
      await client.auth.signOut();
      window.location.replace(LOGIN_PAGE);
      return;
    }

    // ── [M2] Verificar acesso à página (DUAL-MODE) ────────────────────────
    if (pageKey) {
      // Primeiro tenta nova tabela acessos, depois fallback pra profiles
      var temAcessoNovo = await checkAccessInAcessos(client, session.user.id, pageKey);
      var temAcessoPacote = pacoteKey 
        ? await checkAccessInAcessos(client, session.user.id, pacoteKey)
        : false;
      
      // Fallback para profiles, agora SEM usar acesso_expira_em global.
      // Um resumo de prova só é válido se sua própria expiração (ou a do pacote correto)
      // estiver válida. Isso impede que uma compra nova "ressuscite" flags antigas.
      var agora = new Date();

      function ehPresente(flagKey) {
        var arr = Array.isArray(profile.resumos_presente) ? profile.resumos_presente : [];
        return arr.indexOf(flagKey) >= 0;
      }

      function profileAccessValido(flagKey) {
        if (!flagKey || !profile[flagKey]) return false;

        // Expiração individual é a regra principal.
        var exp = profile[flagKey + "_expira"];
        if (exp) return new Date(exp) > agora;

        // Compatibilidade SOMENTE para cortesia explicitamente marcada no Admin.
        // Uma flag antiga sem _expira e sem marcação de presente NÃO libera mais acesso.
        if (ehPresente(flagKey)) {
          if (profile.acesso_expira_em) return new Date(profile.acesso_expira_em) > agora;
          return true; // cortesia permanente explicitamente marcada
        }

        return false;
      }

      var temAcessoAntigoDireto = profileAccessValido(pageKey);
      var temAcessoAntigoPacote = pacoteKey ? profileAccessValido(pacoteKey) : false;

      // Administrador autenticado mantém acesso para manutenção/testes.
      var temAcesso = !!profile.is_admin || temAcessoNovo || temAcessoPacote || temAcessoAntigoDireto || temAcessoAntigoPacote;

      if (!temAcesso) {
        var tinhaFlag = !!profile[pageKey] || !!(pacoteKey && profile[pacoteKey]);
        if (tinhaFlag) {
          alert("Seu acesso a este resumo está expirado ou sem validade individual. Renove para continuar.");
        } else {
          alert("Acesso não liberado para este conteúdo. Faça o pagamento para liberar.");
        }
        window.location.replace(DASHBOARD_PAGE);
        return;
      }
    }

    // ── TUDO OK ───────────────────────────────────────────────────────────
    window.authSession = session;
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
