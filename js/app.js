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
}

/* ============================================================
   INIT
   ============================================================ */
async function init() {
  initEvents();
  await loadData();
  checkBackendStatus();
  renderDashboard();
}

document.addEventListener('DOMContentLoaded', init);
