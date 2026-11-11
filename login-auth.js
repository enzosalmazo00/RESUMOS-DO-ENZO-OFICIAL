
window.authConfig = {
  SUPABASE_URL: "https://chqhdmjqnjjdatowfyif.supabase.co",
  SUPABASE_KEY: "sb_publishable_cgNwK1hWh8IoNm9cX9M7zQ_oqk6Dszn",

  // [C4] Device ID via crypto (estável) — não usa userAgent
  getDeviceId() {
    const key = "_resumos_did";
    let id = localStorage.getItem(key);
    if (!id) {
      const arr = new Uint8Array(10);
      crypto.getRandomValues(arr);
      id = Array.from(arr).map(b => b.toString(16).padStart(2,"0")).join("");
      localStorage.setItem(key, id);
    }
    return id;
  },

  async initSupabase() {
    if (!window.supabase) { console.warn("Supabase nao carregado"); return null; }
    try { return supabase.createClient(this.SUPABASE_URL, this.SUPABASE_KEY); }
    catch(err) { console.error(err); return null; }
  }
};


(async function() {
  let supabaseClient = null;
  let isLogin        = true;
  let pendingUserId  = null;

  const email     = document.getElementById("email");
  const password  = document.getElementById("password");
  const mainBtn   = document.getElementById("mainBtn");
  const toggleBtn = document.getElementById("toggleBtn");
  const forgotBtn = document.getElementById("forgotBtn");
  const forceBtn  = document.getElementById("forceBtn");
  const title     = document.getElementById("title");
  const msg       = document.getElementById("msg");

  function setMsg(text, color="#7dd3e8") { msg.style.color=color; msg.textContent=text; }
  function setLoading(l) {
    var chk = document.getElementById("termsChk");
    mainBtn.disabled = l ? true : !(chk && chk.checked);
    toggleBtn.disabled = l;
    mainBtn.textContent = l ? (window.portalLang==="es-PY"?"Procesando...":"Processando...") : (isLogin ? window.portalT("login.enter","Entrar") : (window.portalLang==="es-PY"?"Registrarme":"Cadastrar"));
  }
  function showForceBtn(show) { forceBtn.style.display = show ? "block" : "none"; }

  // Verifica se já está logado e redireciona direto para dashboard
  async function checkAlreadyAuthenticated() {
    if (!supabaseClient) return;
    try {
      const { data:{session} } = await supabaseClient.auth.getSession();
      if (session) window.location.replace("dashboard.html");
    } catch(err) { console.error(err); }
  }

  // Registra dispositivo e redireciona para dashboard
  async function finalizeLogin(userId) {
    const deviceId = window.authConfig.getDeviceId();
    try {
      await supabaseClient.from("profiles").update({
        active_session: true,
        device_id:      deviceId,
        last_login:     new Date().toISOString()
      }).eq("id", userId);
    } catch(err) {
      console.warn("[login] Erro ao registrar dispositivo:", err);
      // Não bloqueia o login por falha no registro do device
    }

    setMsg("✅ Acesso liberado...", "#4ade80");
    showForceBtn(false);
    await new Promise(r => setTimeout(r, 900));
    window.location.replace("dashboard.html");
  }

  // Forçar desconexão do outro dispositivo
  forceBtn.addEventListener("click", async () => {
    if (!pendingUserId) return;
    forceBtn.disabled = true;
    forceBtn.textContent = "Desconectando...";
    try {
      await supabaseClient.from("profiles").update({
        active_session: false,
        device_id:      null
      }).eq("id", pendingUserId);

      await finalizeLogin(pendingUserId);
    } catch(err) {
      console.error(err);
      setMsg("Erro ao forçar desconexão", "#f87171");
      forceBtn.disabled = false;
      forceBtn.textContent = "⚡ Forçar desconexão do outro dispositivo";
    }
  });

  // Toggle login / cadastro
  toggleBtn.addEventListener("click", () => {
    isLogin = !isLogin;
    title.textContent     = isLogin ? window.portalT("login.title","Bem-vindo") : (window.portalLang==="es-PY"?"Crear cuenta":"Criar conta");
    mainBtn.textContent   = isLogin ? window.portalT("login.enter","Entrar") : (window.portalLang==="es-PY"?"Registrarme":"Cadastrar");
    toggleBtn.textContent = isLogin ? window.portalT("login.create","Criar conta") : (window.portalLang==="es-PY"?"Ya tengo cuenta":"Já tenho conta");
    forgotBtn.style.display = isLogin ? "block" : "none";
    document.getElementById("strengthMeter").style.display = "none";
    msg.textContent = ""; email.value = ""; password.value = "";
    showForceBtn(false); pendingUserId = null;
    setTimeout(updateMainBtn, 10);
  });

  // Handler principal
  mainBtn.addEventListener("click", async () => {
    if (!supabaseClient) { setMsg("Sistema indisponível", "#f87171"); return; }
    const emailVal = email.value.trim(), passVal = password.value;
    if (!emailVal || !passVal) { setMsg("Preencha todos os campos", "#f87171"); return; }

    setLoading(true);
    showForceBtn(false);

    try {
      if (isLogin) {
        // ── LOGIN ──────────────────────────────────────────────────────────
        const { data:authData, error:authError } = await supabaseClient.auth.signInWithPassword({
          email: emailVal, password: passVal
        });
        if (authError) { setMsg("Email ou senha inválidos", "#f87171"); setLoading(false); return; }

        const userId = authData.user.id;

        const { data:profile, error:profileError } = await supabaseClient
          .from("profiles").select("is_approved, active_session, device_id").eq("id", userId).single();

        if (profileError || !profile) {
          await supabaseClient.auth.signOut();
          setMsg("Erro ao carregar perfil. Tente novamente.", "#f87171");
          setLoading(false);
          return;
        }

        if (!profile.is_approved) {
          await supabaseClient.auth.signOut();
          setMsg("⏳ Conta aguardando aprovação. Envie o comprovante via WhatsApp.", "#fb923c");
          setLoading(false);
          return;
        }

        // Verificar dispositivo
        const currentDevice = window.authConfig.getDeviceId();
        const hasConflict   = profile.active_session && profile.device_id && profile.device_id !== currentDevice;

        if (hasConflict) {
          pendingUserId = userId;
          setMsg("❌ Conta ativa em outro dispositivo.", "#ef4444");
          showForceBtn(true);
          setLoading(false);
          return;
        }

        await finalizeLogin(userId);

      } else {
        // ── CADASTRO ────────────────────────────────────────────────────────
        if (passVal.length < 6) { setMsg("Senha deve ter pelo menos 6 caracteres", "#f87171"); setLoading(false); return; }
        if (!emailVal.includes("@")) { setMsg("Email inválido", "#f87171"); setLoading(false); return; }

        const { data:authData, error:signupError } = await supabaseClient.auth.signUp({
          email: emailVal, password: passVal
        });
        if (signupError) {
          var errMsg = "Erro ao criar conta. Tente novamente.";
          if (signupError.message) {
            var m = signupError.message.toLowerCase();
            if (m.includes("already registered") || m.includes("user already exists")) errMsg = "Este email já está cadastrado. Faça login.";
            else if (m.includes("invalid email")) errMsg = "Email inválido.";
            else if (m.includes("password")) errMsg = "Senha muito fraca. Use pelo menos 6 caracteres.";
            else if (m.includes("rate limit") || m.includes("email rate")) errMsg = "Muitas tentativas. Aguarde alguns minutos.";
            else if (m.includes("network")) errMsg = "Erro de conexão. Verifique sua internet.";
          }
          setMsg(errMsg, "#f87171"); setLoading(false); return;
        }

        // Aguarda trigger criar perfil e redireciona
        setMsg("✅ Conta criada com sucesso! Entrando...", "#4ade80");
        await new Promise(r => setTimeout(r, 1500));
        window.location.replace("dashboard.html");
      }

    } catch(err) {
      console.error(err);
      setMsg("Erro inesperado. Tente novamente.", "#f87171");
      setLoading(false);
    }
  });

  // Medidor de força de senha
  window.updateStrength = function() {
    if (isLogin) return; // só no cadastro
    var pass = document.getElementById("password").value;
    var meter = document.getElementById("strengthMeter");
    var bar1 = document.getElementById("bar1");
    var bar2 = document.getElementById("bar2");
    var bar3 = document.getElementById("bar3");
    var label = document.getElementById("strengthLabel");

    if (!pass) {
      meter.style.display = "none";
      return;
    }
    meter.style.display = "block";

    // Calcular força
    var score = 0;
    if (pass.length >= 6) score++;
    if (pass.length >= 10) score++;
    if (/[A-Z]/.test(pass) || /[0-9]/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass) && pass.length >= 8) score++;

    var level = score <= 1 ? 1 : score <= 2 ? 2 : 3;

    var configs = {
      1: { color:"#f87171", label:"🔴 Fraca — tente usar letras e números" },
      2: { color:"#fbbf24", label:"🟡 Média — adicione caracteres especiais ou mais letras" },
      3: { color:"#4ade80", label:"🟢 Ótima — senha forte!" }
    };

    var cfg = configs[level];
    bar1.style.background = cfg.color;
    bar2.style.background = level >= 2 ? cfg.color : "rgba(255,255,255,0.08)";
    bar3.style.background = level >= 3 ? cfg.color : "rgba(255,255,255,0.08)";
    label.style.color = cfg.color;
    label.textContent = cfg.label;
  };

  // Toggle senha visível/oculta
  window.togglePasswordVisibility = function() {
    var input = document.getElementById("password");
    var btn   = document.getElementById("togglePassword");
    if (input.type === "password") {
      input.type = "text";
      btn.textContent = "🙈";
    } else {
      input.type = "password";
      btn.textContent = "👁";
    }
  };
  window.toggleTerms = function() {
    var chk = document.getElementById("termsChk");
    chk.checked = !chk.checked;
    updateMainBtn();
  };
  window.updateMainBtn = function() {
    var chk       = document.getElementById("termsChk");
    var btn       = document.getElementById("mainBtn");
    var isChecked = chk && chk.checked;
    btn.disabled  = !isChecked;
    btn.style.opacity = isChecked ? "1" : "0.45";
  };
  updateMainBtn();

  // Esqueceu a senha
  forgotBtn.addEventListener("click", async () => {
    const emailVal = email.value.trim();
    if (!emailVal || !emailVal.includes("@")) {
      setMsg("Digite seu email acima primeiro", "#fb923c");
      email.focus();
      return;
    }
    forgotBtn.disabled = true;
    forgotBtn.textContent = "Enviando...";
    try {
      const { error } = await supabaseClient.auth.resetPasswordForEmail(emailVal, {
        redirectTo: window.location.origin + "/reset-password.html"
      });
      if (error) throw error;
      setMsg("✅ Link enviado! Verifique seu email.", "#4ade80");
    } catch(err) {
      console.error(err);
      setMsg("Erro ao enviar. Tente novamente.", "#f87171");
    } finally {
      forgotBtn.disabled = false;
      forgotBtn.textContent = window.portalT("login.forgot","Esqueceu sua senha?");
    }
  });

  // Init
  forgotBtn.style.display = "block"; // começa no modo login
  supabaseClient = await window.authConfig.initSupabase();
  if (supabaseClient) {
    await checkAlreadyAuthenticated();
  } else {
    setMsg("⚠ Serviços indisponíveis. Recarregue a página.", "#fb923c");
  }
})();
