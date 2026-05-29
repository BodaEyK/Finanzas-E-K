/* ============================================================
   FINANZAS E&K — AUTH.JS
   Autenticación simple con SHA-256 + sesión en localStorage
   Para cambiar contraseña: ejecutar en consola del navegador:
     crypto.subtle.digest('SHA-256', new TextEncoder().encode('nueva-clave'))
       .then(b => console.log([...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('')))
   y reemplazar passwordHash a continuación.
   ============================================================ */

const AUTH_CONFIG = {
  sessionKey: 'fek_session',
  users: [
    {
      username:     'ek',
      displayName:  'Edgardo & Kiara',
      passwordHash: '63cd71184761fd21628f41941ca6a5f8b7f4af563bd4921e7aa315f5d265ff89' // EyK2026
    }
  ]
};

const Auth = {

  async hashPassword(str) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
    return [...new Uint8Array(buf)].map(x => x.toString(16).padStart(2, '0')).join('');
  },

  checkSession() {
    try {
      const raw = localStorage.getItem(AUTH_CONFIG.sessionKey);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },

  async login(username, password) {
    const hash = await Auth.hashPassword(password);
    const user = AUTH_CONFIG.users.find(
      u => u.username === username.toLowerCase().trim() && u.passwordHash === hash
    );
    if (!user) return null;
    const session = { username: user.username, displayName: user.displayName, loginAt: Date.now() };
    localStorage.setItem(AUTH_CONFIG.sessionKey, JSON.stringify(session));
    return session;
  },

  logout() {
    localStorage.removeItem(AUTH_CONFIG.sessionKey);
    location.reload();
  },

  renderLoginScreen() {
    const screen = document.createElement('div');
    screen.id        = 'login-screen';
    screen.className = 'login-screen';
    screen.innerHTML = `
      <div class="login-card">
        <div class="login-logo">
          <span style="font-size:28px">💰</span>
          <span class="login-title">Finanzas <strong>E&amp;K</strong></span>
        </div>
        <p style="text-align:center;font-size:12px;color:var(--color-muted2);margin-top:-8px">Sullana, Perú</p>
        <form id="loginForm" autocomplete="off">
          <div class="form-group">
            <label class="form-label" for="loginUser">Usuario</label>
            <input type="text" id="loginUser" class="form-control"
              placeholder="ek" required autocomplete="username" />
          </div>
          <div class="form-group">
            <label class="form-label" for="loginPass">Contraseña</label>
            <input type="password" id="loginPass" class="form-control"
              placeholder="••••••••" required autocomplete="current-password" />
          </div>
          <p id="loginError" class="login-error hidden">Usuario o contraseña incorrectos</p>
          <button type="submit" class="btn btn-primary" id="loginBtn"
            style="width:100%;margin-top:8px">Entrar</button>
        </form>
      </div>`;

    document.body.insertBefore(screen, document.getElementById('appLayout'));

    document.getElementById('loginForm').addEventListener('submit', async e => {
      e.preventDefault();
      const btn = document.getElementById('loginBtn');
      btn.disabled    = true;
      btn.textContent = '⏳ Verificando…';
      document.getElementById('loginError').classList.add('hidden');

      const user = await Auth.login(
        document.getElementById('loginUser').value,
        document.getElementById('loginPass').value
      );

      if (user) {
        AppState.currentUser = user;
        Auth.hideLoginScreen();
        init();
      } else {
        document.getElementById('loginError').classList.remove('hidden');
        document.getElementById('loginPass').value = '';
        btn.disabled    = false;
        btn.textContent = 'Entrar';
      }
    });
  },

  hideLoginScreen() {
    const screen = document.getElementById('login-screen');
    if (screen) screen.remove();
    const app = document.getElementById('appLayout');
    if (app) app.classList.remove('hidden');
  },

  initLogin() {
    const session = Auth.checkSession();
    if (session) {
      AppState.currentUser = session;
      Auth.hideLoginScreen();
      init();
    } else {
      Auth.renderLoginScreen();
    }
  }
};

document.addEventListener('DOMContentLoaded', () => Auth.initLogin());
