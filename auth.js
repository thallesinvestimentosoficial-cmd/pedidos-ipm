(() => {
  const SUPABASE_URL = "https://pthjfsjqkhzwqibvywxv.supabase.co";
  const SUPABASE_KEY = "sb_publishable_7NzwxzFq7-KI0W1wsfPxRA_6oX5bFUg";
  const STORAGE_KEY = "pedidos-ipm-session";
  const $ = (s) => document.querySelector(s);
  let session = null;
  const roleNames = { admin: "GUN", gun: "GUN", manager: "Gerente de Plantão", gp: "Gerente de Plantão", viewer: "Supervisor", supervisor_diaria: "Supervisor Diária", supervisor_quiosque: "Supervisor Quiosque", treinador: "Treinador" };
  function initials(name) {
    return String(name || "IP").trim().split(/\s+/).slice(0,2).map(x => x[0] || "").join("").toUpperCase();
  }
  function showLogin(message = "") {
    document.getElementById("forced-password-reset")?.remove();
    $("#login-screen").hidden = false;
    $("#app-shell").hidden = true;
    $("#login-error").textContent = message;
  }
  async function refreshSession() {
    if (!session?.refresh_token) throw new Error("Sessão expirada. Entre novamente.");
    const r = await fetch(SUPABASE_URL + "/auth/v1/token?grant_type=refresh_token", {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: SUPABASE_KEY },
      body: JSON.stringify({ refresh_token: session.refresh_token })
    });
    const next = await r.json().catch(() => ({}));
    if (!r.ok || !next.access_token) {
      session = null;
      window.IPM_AUTH = null;
      localStorage.removeItem(STORAGE_KEY);
      throw new Error("Sua sessão expirou. Entre novamente para continuar.");
    }
    session = { ...session, ...next };
    if (localStorage.getItem(STORAGE_KEY)) localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    if (window.IPM_AUTH) window.IPM_AUTH.session = session;
    return session.access_token;
  }
  function showApp(profile) {
    window.IPM_AUTH = { session, profile, roleName: roleNames[profile.role] || "Usuário", refreshSession };
    $("#login-screen").hidden = true;
    $("#app-shell").hidden = false;
    const displayName = profile.display_name || profile.username || "Usuário";
    const displayRole = roleNames[profile.role] || "Usuário";
    const topInitials = $("#top-initials");
    const topName = $("#top-profile-name");
    const topRole = $("#top-profile-role");
    if (topInitials) topInitials.innerHTML = profile.avatar_url ? '<img src="' + profile.avatar_url + '" alt="Foto de perfil">' : initials(displayName);
    if (topName) topName.textContent = displayName;
    if (topRole) topRole.textContent = displayRole;
    document.dispatchEvent(new CustomEvent("ipm:authenticated"));
  }
  function continueAfterLogin(profile) {
    if (profile.force_password_reset) return showForcedPasswordReset(profile);
    showApp(profile);
  }
  function showForcedPasswordReset(profile) {
    $("#login-screen").hidden = true;
    $("#app-shell").hidden = true;
    document.getElementById("forced-password-reset")?.remove();
    const screen = document.createElement("section");
    screen.id = "forced-password-reset";
    screen.className = "password-reset-screen";
    screen.innerHTML = '<div class="password-reset-card"><div class="password-reset-symbol">🔐</div><span class="password-reset-eyebrow">SEGURANÇA DA CONTA</span><h1>Crie uma nova senha</h1><p>O GUN solicitou a redefinição da sua senha. Para continuar, cadastre uma nova senha agora.</p><div class="password-reset-user"></div><form id="forced-password-reset-form"><label>Nova senha<input name="new_password" type="password" minlength="8" maxlength="128" autocomplete="new-password" required placeholder="Mínimo de 8 caracteres"></label><label>Confirme a nova senha<input name="confirm_password" type="password" minlength="8" maxlength="128" autocomplete="new-password" required placeholder="Digite novamente a senha"></label><p id="forced-password-reset-error" class="password-reset-error" role="alert"></p><button class="btn primary" type="submit">Salvar nova senha e continuar</button></form><small class="password-reset-note">A área do aplicativo ficará bloqueada até concluir esta etapa.</small></div>';
    document.body.appendChild(screen);
    screen.querySelector(".password-reset-user").textContent = profile.display_name || profile.username || "Usuário";
    screen.querySelector("#forced-password-reset-form").addEventListener("submit", async event => {
      event.preventDefault();
      const form = event.currentTarget;
      const values = new FormData(form);
      const password = String(values.get("new_password") || "");
      const confirmPassword = String(values.get("confirm_password") || "");
      const button = form.querySelector("button");
      const errorBox = screen.querySelector("#forced-password-reset-error");
      errorBox.textContent = "";
      if (password.length < 8) { errorBox.textContent = "A nova senha deve ter pelo menos 8 caracteres."; return; }
      if (password !== confirmPassword) { errorBox.textContent = "As senhas não conferem."; return; }
      button.disabled = true;
      button.textContent = "Salvando senha...";
      try {
        const response = await fetch(SUPABASE_URL + "/functions/v1/user-admin", {
          method: "POST",
          headers: { "Content-Type": "application/json", apikey: SUPABASE_KEY, Authorization: "Bearer " + session.access_token },
          body: JSON.stringify({ action: "complete_password_reset", new_password: password })
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.error || "Não foi possível alterar a senha.");
        profile.force_password_reset = false;
        screen.remove();
        showApp(profile);
      } catch (error) {
        errorBox.textContent = error.message || "Não foi possível salvar a nova senha. Tente novamente.";
      } finally {
        button.disabled = false;
        button.textContent = "Salvar nova senha e continuar";
      }
    });
  }
  async function loadProfile(accessToken) {
    const userId = encodeURIComponent(session?.user?.id || "");
    const r = await fetch(SUPABASE_URL + "/rest/v1/profiles?select=username,display_name,role,active,avatar_url,force_password_reset&user_id=eq." + userId + "&limit=1", {
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
    continueAfterLogin(profile);
  }
  async function restore() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return showLogin();
    try {
      session = JSON.parse(raw);
      if (!session.access_token) throw new Error("Sessão expirada. Entre novamente.");
      if (!session.expires_at || session.expires_at * 1000 < Date.now() + 60000) await refreshSession();
      const profile = await loadProfile(session.access_token);
      continueAfterLogin(profile);
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