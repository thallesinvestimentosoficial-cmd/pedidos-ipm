(() => {
  const SUPABASE_URL = "https://pthjfsjqkhzwqibvywxv.supabase.co";
  const SUPABASE_KEY = "sb_publishable_7NzwxzFq7-KI0W1wsfPxRA_6oX5bFUg";
  const STORAGE_KEY = "pedidos-ipm-session";
  const $ = (s) => document.querySelector(s);
  let session = null;
  const roleNames = { admin: "Administrador", manager: "Gerente", viewer: "Visualizador" };
  function initials(name) {
    return String(name || "IP").trim().split(/\s+/).slice(0,2).map(x => x[0] || "").join("").toUpperCase();
  }
  function showLogin(message = "") {
    $("#login-screen").hidden = false;
    $("#app-shell").hidden = true;
    $("#login-error").textContent = message;
  }
  function showApp(profile) {
    window.IPM_AUTH = { session, profile, roleName: roleNames[profile.role] || "Usuário" };
    $("#login-screen").hidden = true;
    $("#app-shell").hidden = false;
    $("#profile-name").textContent = profile.display_name || profile.username;
    $("#profile-role").textContent = roleNames[profile.role] || "Usuário";
    $("#profile-initials").textContent = initials(profile.display_name || profile.username);
    $("#top-initials").textContent = initials(profile.display_name || profile.username);
    $("#top-profile-name").textContent = profile.display_name || profile.username;
    $("#top-profile-role").textContent = roleNames[profile.role] || "Usuário";
    document.dispatchEvent(new CustomEvent("ipm:authenticated"));
  }
  async function loadProfile(accessToken) {
    const r = await fetch(SUPABASE_URL + "/rest/v1/profiles?select=username,display_name,role,active&limit=1", {
      headers: { apikey: SUPABASE_KEY, Authorization: "Bearer " + accessToken }
    });
    if (!r.ok) throw new Error("Não foi possível validar o perfil.");
    const rows = await r.json();
    if (!rows.length || !rows[0].active) throw new Error("Usuário inativo ou sem perfil cadastrado.");
    return rows[0];
  }
  async function authenticate(username, password, remember) {
    const r = await fetch(SUPABASE_URL + "/functions/v1/username-login", {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: SUPABASE_KEY },
      body: JSON.stringify({ username, password })
    });
    const result = await r.json().catch(() => ({}));
    if (!r.ok || !result.session?.access_token) throw new Error(result.error || "Usuário ou senha inválidos.");
    session = result.session;
    const profile = await loadProfile(session.access_token);
    if (remember) localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    else localStorage.removeItem(STORAGE_KEY);
    showApp(profile);
  }
  async function restore() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return showLogin();
    try {
      session = JSON.parse(raw);
      if (!session.access_token || (session.expires_at && session.expires_at * 1000 < Date.now())) throw new Error("Sessão expirada. Entre novamente.");
      const profile = await loadProfile(session.access_token);
      showApp(profile);
    } catch (e) {
      localStorage.removeItem(STORAGE_KEY);
      showLogin(e.message || "Entre novamente.");
    }
  }
  $("#login-form").addEventListener("submit", async e => {
    e.preventDefault();
    const button = $("#login-submit");
    button.disabled = true;
    button.textContent = "Entrando...";
    $("#login-error").textContent = "";
    try {
      await authenticate($("#login-username").value.trim().toLowerCase(), $("#login-password").value, $("#keep-connected").checked);
    } catch (e) {
      showLogin(e.message || "Não foi possível entrar.");
    } finally {
      button.disabled = false;
      button.textContent = "Entrar";
    }
  });
  $("#logout-btn").addEventListener("click", () => {
    session = null;
    window.IPM_AUTH = null;
    localStorage.removeItem(STORAGE_KEY);
    showLogin();
    $("#login-password").value = "";
  });
  restore();
})();