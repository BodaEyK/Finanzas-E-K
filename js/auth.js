/* ============================================================
   FINANZAS E&K — AUTH.JS
   Autenticación por CLAVE ÚNICA validada contra el backend.

   El secreto NO vive en este código (el repo es público): lo escribe el
   usuario al entrar y se compara contra la propiedad privada API_TOKEN del
   Apps Script. Tras validar, la clave se guarda en localStorage (fek_token)
   para enviarla en cada llamada a la API.

   Para cambiar la clave: ejecutar setToken() en el editor de Apps Script.
   ============================================================ */

const AUTH_CONFIG = {
  sessionKey: 'fek_session',
  tokenKey:   'fek_token',
};

const Auth = {

  checkSession() {
    try {
      const raw = localStorage.getItem(AUTH_CONFIG.sessionKey);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },

  /** Valida la clave contra el backend. Devuelve la sesión o null.
   *  Propaga el error si el backend no responde (para distinguir "clave mala"
   *  de "sin conexión"). */
  async login(password) {
    const token = (password || '').trim();
    if (!token) return null;

    const ok = await API.verifyToken(token);
    if (!ok) return null;

    localStorage.setItem(AUTH_CONFIG.tokenKey, token);
    const session = { displayName: 'Edgardo & Kiara', loginAt: Date.now() };
    localStorage.setItem(AUTH_CONFIG.sessionKey, JSON.stringify(session));
    return session;
  },

  logout() {
    localStorage.removeItem(AUTH_CONFIG.sessionKey);
    localStorage.removeItem(AUTH_CONFIG.tokenKey);
    localStorage.removeItem('fek_cache'); // no dejar datos financieros cacheados
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
            <label class="form-label" for="loginPass">Clave de acceso</label>
            <input type="password" id="loginPass" class="form-control"
              placeholder="••••••••" required autocomplete="current-password" />
          </div>
          <p id="loginError" class="login-error hidden">Clave incorrecta</p>
          <button type="submit" class="btn btn-primary" id="loginBtn"
            style="width:100%;margin-top:8px">Entrar</button>
        </form>
      </div>`;

    document.body.insertBefore(screen, document.getElementById('appLayout'));

    document.getElementById('loginForm').addEventListener('submit', async e => {
      e.preventDefault();
      const btn   = document.getElementById('loginBtn');
      const errEl = document.getElementById('loginError');
      btn.disabled    = true;
      btn.textContent = '⏳ Verificando…';
      errEl.classList.add('hidden');

      let user = null;
      let errMsg = 'Clave incorrecta';
      try {
        user = await Auth.login(document.getElementById('loginPass').value);
      } catch (err) {
        errMsg = 'No se pudo verificar. Revisa tu conexión.';
      }

      if (user) {
        AppState.currentUser = user;
        Auth.hideLoginScreen();
        init();
      } else {
        errEl.textContent = errMsg;
        errEl.classList.remove('hidden');
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
    const token   = localStorage.getItem(AUTH_CONFIG.tokenKey);
    // Necesitamos AMBOS: sin token no se puede hablar con el backend.
    // (Cubre sesiones viejas del login anterior, que no guardaban token.)
    if (session && token) {
      AppState.currentUser = session;
      Auth.hideLoginScreen();
      init();
    } else {
      Auth.renderLoginScreen();
    }
  }
};

document.addEventListener('DOMContentLoaded', () => Auth.initLogin());
