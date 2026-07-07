/* ============================================================
   FINANZAS E&K — APP.JS (navegación SPA + lógica global)
   ============================================================ */

/* ============================================================
   CATEGORÍAS
   ============================================================ */
const CATEGORIAS_INGRESO = [
  'Sueldo', 'Negocio/Emprendimiento', 'Freelance/Extra', 'Otros Ingresos'
];
const CATEGORIAS_GASTO = [
  'Vivienda', 'Alimentación', 'Transporte', 'Salud', 'Educación',
  'Servicios', 'Comunicaciones', 'Ropa y Calzado', 'Entretenimiento',
  'Deudas/Cuotas', 'Bebé/Familia', 'Regalos/Ocasiones', 'Ahorro/Inversión',
  'Emergencias', 'Otros Gastos'
];
const TODAS_CATEGORIAS = [...CATEGORIAS_INGRESO, ...CATEGORIAS_GASTO];

/* ============================================================
   ESTADO GLOBAL
   ============================================================ */
const AppState = {
  mes:  parseInt(document.getElementById('selectMes').value),
  anio: parseInt(document.getElementById('selectAnio').value),
  transacciones: [],
  presupuesto: [],
  loading: false,
  currentUser: null,
};

/* ============================================================
   UTILIDADES
   ============================================================ */
function formatMoney(n) {
  return 'S/ ' + Number(n).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(str) {
  if (!str) return '-';
  const [y, m, d] = str.split('-');
  return `${d}/${m}/${y}`;
}

function getMesNombre(m) {
  const nombres = ['', 'Enero','Febrero','Marzo','Abril','Mayo','Junio',
                   'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  return nombres[m] || '';
}

function transaccionesDelMes(transacciones, mes, anio) {
  return transacciones.filter(t => {
    const [y, m] = t.fecha.split('-').map(Number);
    return m === mes && y === anio;
  });
}

function periodoStr(mes, anio) {
  return `${anio}-${String(mes).padStart(2, '0')}`;
}

/* Presupuesto efectivo para un mes:
   1) el propio del mes; si no existe →
   2) el del mes anterior más cercano que sí tenga; si no hay previos →
   3) el más antiguo disponible.
   Filas sin 'mes' (datos de muestra locales o pre-migración) se tratan como globales. */
function effectivePresupuesto(raw, mes, anio) {
  const periodo = periodoStr(mes, anio);
  const conMes  = (raw || []).filter(p => p.mes);

  if (conMes.length === 0) {
    return (raw || []).map(p => ({ categoria: p.categoria, presupuesto: Number(p.presupuesto) }));
  }

  const meses = [...new Set(conMes.map(p => p.mes))].sort();
  let elegido = meses.includes(periodo) ? periodo : null;
  if (!elegido) {
    const previos = meses.filter(m => m <= periodo);
    elegido = previos.length ? previos[previos.length - 1] : meses[0];
  }

  return conMes
    .filter(p => p.mes === elegido)
    .map(p => ({ categoria: p.categoria, presupuesto: Number(p.presupuesto) }));
}

function presupuestoDelPeriodo(mes, anio) {
  return effectivePresupuesto(AppState.presupuesto, mes, anio);
}

function buildCategoryOptions(selectedTipo, selectedCat) {
  const cats = selectedTipo === 'Ingreso' ? CATEGORIAS_INGRESO : CATEGORIAS_GASTO;
  return cats.map(c =>
    `<option value="${c}" ${c === selectedCat ? 'selected' : ''}>${c}</option>`
  ).join('');
}

/* ============================================================
   TOAST
   ============================================================ */
function showToast(msg, type = 'info') {
  const icons = { success: '✓', error: '✗', warning: '⚠', info: 'ℹ' };
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${icons[type] || 'ℹ'}</span><span>${msg}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('toast-out');
    setTimeout(() => toast.remove(), 320);
  }, 3200);
}

/* ============================================================
   MODAL
   ============================================================ */
function openModal(title, bodyHTML, onSave) {
  document.getElementById('modalTitle').textContent = title;
  document.getElementById('modalBody').innerHTML = bodyHTML;
  document.getElementById('modalOverlay').classList.remove('hidden');

  const saveBtn = document.getElementById('modalSaveBtn');
  if (saveBtn && onSave) {
    saveBtn.onclick = onSave;
  }
}

function closeModal() {
  document.getElementById('modalOverlay').classList.add('hidden');
}

/* ============================================================
   NAVEGACIÓN SPA
   ============================================================ */
const sections = {
  dashboard:   document.getElementById('section-dashboard'),
  registro:    document.getElementById('section-registro'),
  presupuesto: document.getElementById('section-presupuesto'),
};

const headerTitles = {
  dashboard:   'Dashboard',
  registro:    'Transacciones',
  presupuesto: 'Presupuesto',
};

let currentSection = 'dashboard';

function navigateTo(name) {
  if (!sections[name]) return;

  // Ocultar todo, mostrar el destino
  Object.entries(sections).forEach(([k, el]) => {
    el.classList.toggle('hidden', k !== name);
  });

  // Nav items activos
  document.querySelectorAll('.nav-item').forEach(a => {
    a.classList.toggle('active', a.dataset.section === name);
  });

  // Header title
  document.getElementById('headerTitle').textContent = headerTitles[name] || name;

  currentSection = name;
  closeSidebar();

  // Renderizar sección
  renderCurrentSection();
}

function renderCurrentSection() {
  if (currentSection === 'dashboard')   renderDashboard();
  if (currentSection === 'registro')    renderRegistro();
  if (currentSection === 'presupuesto') renderPresupuesto();
}

/* ============================================================
   SIDEBAR MÓVIL
   ============================================================ */
function openSidebar() {
  document.getElementById('sidebar').classList.add('open');
  document.getElementById('sidebarOverlay').classList.add('show');
  document.body.style.overflow = 'hidden';
}
function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebarOverlay').classList.remove('show');
  document.body.style.overflow = '';
}

/* ============================================================
   CARGA DE DATOS
   ============================================================ */
async function loadData() {
  AppState.loading = true;
  try {
    const [txs, budget] = await Promise.all([
      API.getTransacciones(),
      API.getPresupuesto()
    ]);
    AppState.transacciones = txs;
    AppState.presupuesto   = budget;
  } catch (err) {
    showToast('Error al cargar datos: ' + err.message, 'error');
  }
  AppState.loading = false;
}

async function refreshAndRender() {
  await loadData();
  renderCurrentSection();
}

/* ============================================================
   PERÍODO POR DEFECTO
   Mes en curso; si no tiene transacciones, el último mes con movimientos.
   ============================================================ */
function pickDefaultPeriod(transacciones) {
  const now     = new Date();
  const curMes  = now.getMonth() + 1;
  const curAnio = now.getFullYear();

  const hayEnActual = transacciones.some(t => {
    const [y, m] = t.fecha.split('-').map(Number);
    return m === curMes && y === curAnio;
  });

  // Mes actual si tiene datos, o si de plano no hay ninguna transacción
  if (hayEnActual || transacciones.length === 0) {
    return { mes: curMes, anio: curAnio };
  }

  // Si no, el mes de la transacción más reciente
  const masReciente = transacciones.reduce((max, t) => (t.fecha > max ? t.fecha : max), transacciones[0].fecha);
  const [y, m] = masReciente.split('-').map(Number);
  return { mes: m, anio: y };
}

function _ensureYearOption(selAnio, anio) {
  const existe = [...selAnio.options].some(o => o.value === String(anio));
  if (!existe) {
    const opt = document.createElement('option');
    opt.value = String(anio);
    opt.textContent = String(anio);
    selAnio.appendChild(opt);
  }
}

function applyDefaultPeriod() {
  const { mes, anio } = pickDefaultPeriod(AppState.transacciones);
  AppState.mes  = mes;
  AppState.anio = anio;

  const selMes  = document.getElementById('selectMes');
  const selAnio = document.getElementById('selectAnio');
  _ensureYearOption(selAnio, anio); // por si el año no está entre las opciones
  selMes.value  = String(mes);
  selAnio.value = String(anio);
}

/* ============================================================
   BACKEND STATUS
   ============================================================ */
async function checkBackendStatus() {
  const online = await API.checkBackend();
  const dot   = document.querySelector('.status-dot');
  const label = document.querySelector('.status-label');
  if (online) {
    dot.className   = 'status-dot online';
    label.textContent = 'Online';
  } else {
    dot.className   = 'status-dot offline';
    label.textContent = 'Local';
  }
}

/* ============================================================
   USER UI
   ============================================================ */
function updateUserUI(user) {
  if (!user) return;
  const avatarEl = document.getElementById('userAvatar');
  const nameEl   = document.getElementById('userName');
  const initials = user.displayName.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  if (avatarEl) avatarEl.textContent = initials;
  if (nameEl)   nameEl.textContent   = user.displayName;
}

/* ============================================================
   EVENT LISTENERS
   ============================================================ */
function initEvents() {
  // Nav items
  document.querySelectorAll('.nav-item').forEach(a => {
    a.addEventListener('click', e => {
      e.preventDefault();
      navigateTo(a.dataset.section);
    });
  });

  // Sidebar toggle
  document.getElementById('menuToggle').addEventListener('click', openSidebar);
  document.getElementById('sidebarClose').addEventListener('click', closeSidebar);
  document.getElementById('sidebarOverlay').addEventListener('click', closeSidebar);

  // Period selectors
  document.getElementById('selectMes').addEventListener('change', e => {
    AppState.mes = parseInt(e.target.value);
    renderCurrentSection();
  });
  document.getElementById('selectAnio').addEventListener('change', e => {
    AppState.anio = parseInt(e.target.value);
    renderCurrentSection();
  });

  // Modal close
  document.getElementById('modalClose').addEventListener('click', closeModal);
  document.getElementById('modalOverlay').addEventListener('click', e => {
    if (e.target === document.getElementById('modalOverlay')) closeModal();
  });

  // Logout
  document.getElementById('logoutBtn')?.addEventListener('click', () => Auth.logout());
}

/* ============================================================
   INIT — llamado por auth.js tras verificar sesión
   ============================================================ */
async function init() {
  updateUserUI(AppState.currentUser);
  initEvents();
  await loadData();
  applyDefaultPeriod();   // fija el mes en curso (o el último con transacciones)
  checkBackendStatus();
  renderDashboard();
}
