/* ============================================================
   FINANZAS E&K — API MODULE
   Pegue la URL de su Apps Script desplegado aquí:
   ============================================================ */
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbysDDG6R4ekQbn0AOOlS-v5B_QPqI363mdvoJgGmj255Ln12gSCSsoYL_R9kUpgJFXp/exec'; // <-- Pegar URL aquí tras desplegar Code.gs

/* La clave de acceso NO está en el código: la escribe el usuario al entrar (auth.js)
   y se guarda en localStorage de su navegador. Se envía como query param (GET) o dentro
   del cuerpo JSON (POST): NO agrega headers, así que las peticiones siguen siendo
   "simple requests" sin preflight CORS. */
function _token() {
  return localStorage.getItem('fek_token') || '';
}

/* ============================================================
   DATOS DE MUESTRA (fallback cuando APPS_SCRIPT_URL está vacío)
   ============================================================ */
const SAMPLE_DATA = {
  transacciones: [
    { id:'t1',  fecha:'2026-05-02', descripcion:'Sueldo Edgardo',         categoria:'Sueldo',               tipo:'Ingreso', monto:2800, notas:'' },
    { id:'t2',  fecha:'2026-05-04', descripcion:'Sueldo Kiara',           categoria:'Sueldo',               tipo:'Ingreso', monto:1800, notas:'' },
    { id:'t3',  fecha:'2026-05-05', descripcion:'Alquiler casa',          categoria:'Vivienda',             tipo:'Gasto',   monto:650,  notas:'Mensual' },
    { id:'t4',  fecha:'2026-05-06', descripcion:'Supermercado Metro',     categoria:'Alimentación',         tipo:'Gasto',   monto:280,  notas:'Compra semanal' },
    { id:'t5',  fecha:'2026-05-08', descripcion:'Recibo de luz',          categoria:'Servicios',            tipo:'Gasto',   monto:85,   notas:'Hidrandina' },
    { id:'t6',  fecha:'2026-05-10', descripcion:'Internet Movistar',      categoria:'Comunicaciones',       tipo:'Gasto',   monto:99,   notas:'' },
    { id:'t7',  fecha:'2026-05-12', descripcion:'Pañales y leche bebé',   categoria:'Bebé/Familia',         tipo:'Gasto',   monto:175,  notas:'Pampers + NAN' },
    { id:'t8',  fecha:'2026-05-14', descripcion:'Transporte semanal',     categoria:'Transporte',           tipo:'Gasto',   monto:120,  notas:'Mototaxis' },
    { id:'t9',  fecha:'2026-05-15', descripcion:'Freelance diseño web',   categoria:'Freelance/Extra',      tipo:'Ingreso', monto:350,  notas:'Cliente Sullana' },
    { id:'t10', fecha:'2026-05-18', descripcion:'Medicamentos farmacia',  categoria:'Salud',                tipo:'Gasto',   monto:65,   notas:'' },
    { id:'t11', fecha:'2026-05-20', descripcion:'Ropa Kiara y bebé',      categoria:'Ropa y Calzado',       tipo:'Gasto',   monto:190,  notas:'Saga Falabella' },
    { id:'t12', fecha:'2026-05-21', descripcion:'Supermercado Plaza Vea', categoria:'Alimentación',         tipo:'Gasto',   monto:210,  notas:'Quincena' },
    { id:'t13', fecha:'2026-05-22', descripcion:'Cuota préstamo banco',   categoria:'Deudas/Cuotas',        tipo:'Gasto',   monto:320,  notas:'BCP personal' },
    { id:'t14', fecha:'2026-05-24', descripcion:'Salida cine familia',    categoria:'Entretenimiento',      tipo:'Gasto',   monto:55,   notas:'Cineplanet' },
    { id:'t15', fecha:'2026-05-26', descripcion:'Ahorro cuenta ahorros',  categoria:'Ahorro/Inversión',     tipo:'Gasto',   monto:400,  notas:'Depósito CTS' },
  ],
  presupuesto: [
    { categoria:'Vivienda',           presupuesto:700  },
    { categoria:'Alimentación',       presupuesto:600  },
    { categoria:'Transporte',         presupuesto:160  },
    { categoria:'Salud',              presupuesto:100  },
    { categoria:'Educación',          presupuesto:80   },
    { categoria:'Servicios',          presupuesto:100  },
    { categoria:'Comunicaciones',     presupuesto:120  },
    { categoria:'Ropa y Calzado',     presupuesto:150  },
    { categoria:'Entretenimiento',    presupuesto:80   },
    { categoria:'Deudas/Cuotas',      presupuesto:350  },
    { categoria:'Bebé/Familia',       presupuesto:200  },
    { categoria:'Regalos/Ocasiones',  presupuesto:50   },
    { categoria:'Ahorro/Inversión',   presupuesto:400  },
    { categoria:'Emergencias',        presupuesto:100  },
    { categoria:'Otros Gastos',       presupuesto:80   },
  ]
};

/* Copia local mutable (para simular CRUD sin backend) */
let _localTransacciones = JSON.parse(JSON.stringify(SAMPLE_DATA.transacciones));
let _localPresupuesto   = JSON.parse(JSON.stringify(SAMPLE_DATA.presupuesto));
let _nextId = 100;

/* ============================================================
   HELPERS
   ============================================================ */
function _useLocal() {
  return !APPS_SCRIPT_URL || APPS_SCRIPT_URL.trim() === '';
}

async function _appsScriptCall(params) {
  // Sin headers personalizados → "simple request" → sin preflight CORS
  // El token viaja como query param, no como header → no rompe el CORS.
  const url = new URL(APPS_SCRIPT_URL);
  // token por defecto desde localStorage; params.token explícito (login) lo sobreescribe
  Object.entries({ token: _token(), ...params }).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  if (data && data.error) throw new Error(data.error);
  return data;
}

async function _appsScriptPost(params) {
  // text/plain evita el preflight CORS; GAS igual puede leer e.postData.contents
  // El token viaja dentro del cuerpo JSON, no como header → no rompe el CORS.
  const res = await fetch(APPS_SCRIPT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify({ token: _token(), ...params })
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  if (data && data.error) throw new Error(data.error);
  return data;
}

/* ============================================================
   API PÚBLICA
   ============================================================ */
const API = {

  /** Obtiene todas las transacciones */
  async getTransacciones() {
    if (_useLocal()) return JSON.parse(JSON.stringify(_localTransacciones));
    const data = await _appsScriptCall({ action: 'getTransacciones' });
    return data.transacciones || [];
  },

  /** Agrega una transacción nueva */
  async addTransaccion(tx) {
    if (_useLocal()) {
      const newTx = { ...tx, id: 't' + (++_nextId) };
      _localTransacciones.push(newTx);
      return { success: true, transaccion: newTx };
    }
    return _appsScriptPost({ action: 'addTransaccion', ...tx });
  },

  /** Actualiza una transacción existente */
  async updateTransaccion(tx) {
    if (_useLocal()) {
      const idx = _localTransacciones.findIndex(t => t.id === tx.id);
      if (idx === -1) throw new Error('Transacción no encontrada');
      _localTransacciones[idx] = { ..._localTransacciones[idx], ...tx };
      return { success: true };
    }
    return _appsScriptPost({ action: 'updateTransaccion', ...tx });
  },

  /** Elimina una transacción */
  async deleteTransaccion(id) {
    if (_useLocal()) {
      _localTransacciones = _localTransacciones.filter(t => t.id !== id);
      return { success: true };
    }
    return _appsScriptPost({ action: 'deleteTransaccion', id });
  },

  /** Obtiene el presupuesto de categorías */
  async getPresupuesto() {
    if (_useLocal()) return JSON.parse(JSON.stringify(_localPresupuesto));
    const data = await _appsScriptCall({ action: 'getPresupuesto' });
    return data.presupuesto || [];
  },

  /** Actualiza el presupuesto */
  async updatePresupuesto(presupuesto) {
    if (_useLocal()) {
      _localPresupuesto = JSON.parse(JSON.stringify(presupuesto));
      return { success: true };
    }
    return _appsScriptPost({ action: 'updatePresupuesto', presupuesto });
  },

  /** Valida una clave de acceso contra el backend (para la pantalla de login).
   *  Devuelve true/false. Lanza error si el backend no responde. */
  async verifyToken(token) {
    if (_useLocal()) return true; // sin backend no hay nada que validar
    const data = await _appsScriptCall({ action: 'auth', token });
    return !!(data && data.ok);
  },

  /** Verifica si el backend está disponible */
  async checkBackend() {
    if (_useLocal()) return false;
    try {
      await _appsScriptCall({ action: 'ping' });
      return true;
    } catch {
      return false;
    }
  }
};
