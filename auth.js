// ===============================
// 🔐 AUTH CENTRAL (PASSO 1)
// ===============================

const SUPABASE_URL = "https://chqhdmjqnjjdatowfyif.supabase.co";
const SUPABASE_KEY = "sb_publishable_cgNwK1hWh8IoNm9cX9M7zQ_oqk6Dszn";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ===============================
// SESSÃO ATUAL
// ===============================
async function getSession() {
  const { data } = await supabaseClient.auth.getSession();
  return data.session;
}

// ===============================
// PERFIL DO USUÁRIO
// ===============================
async function getProfile(userId) {
  const { data, error } = await supabaseClient
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (error) return null;
  return data;
}

// ===============================
// DEVICE ID SIMPLES
// ===============================
function generateDeviceId() {
  const base = navigator.userAgent + window.screen.width + window.screen.height;
  let hash = 0;

  for (let i = 0; i < base.length; i++) {
    hash = ((hash << 5) - hash) + base.charCodeAt(i);
    hash = hash & hash;
  }

  return String(Math.abs(hash));
}

// ===============================
// EXPORT GLOBAL
// ===============================
window.Auth = {
  client: supabaseClient,
  getSession,
  getProfile,
  generateDeviceId
};