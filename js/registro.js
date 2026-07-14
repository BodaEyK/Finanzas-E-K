/* ============================================================
   FINANZAS E&K — REGISTRO.JS
   ============================================================ */

let _filtroTipo = 'Todos';
let _filtroCategoria = 'Todas';
let _formCollapsed = window.innerWidth < 640;

/* ============================================================
   AUTOCOMPLETADO DE DESCRIPCIÓN
   Desplegable propio (no el nativo del navegador): solo aparece al escribir
   2+ letras, muestra máx. 8 coincidencias y respeta el tema oscuro.
   Escala bien aunque haya miles de descripciones distintas.
   ============================================================ */
function attachAutocomplete(input, { autoFill = false } = {}) {
  if (!input) return;

  // Envolver el input para poder posicionar la lista debajo
  const wrap = document.createElement('div');
  wrap.className = 'ac-wrap';
  input.parentNode.insertBefore(wrap, input);
  wrap.appendChild(input);

  const list = document.createElement('div');
  list.className = 'ac-list hidden';
  wrap.appendChild(list);

  let items  = [];
  let activo = -1;

  const cerrar = () => { list.classList.add('hidden'); activo = -1; };

  const pintar = () => {
    if (!items.length) { cerrar(); return; }
    list.innerHTML = items.map((s, i) => `
      <div class="ac-item ${i === activo ? 'active' : ''}" data-i="${i}">
        <span class="ac-desc">${escapeHtml(s.descripcion)}</span>
        <span class="ac-meta">${escapeHtml(s.categoria)} · ${formatMoney(s.monto)}${s.veces > 1 ? ` · ${s.veces}×` : ''}</span>
      </div>`).join('');
    list.classList.remove('hidden');
  };

  const elegir = (s) => {
    if (!s) return;
    input.value = s.descripcion;
    cerrar();
    if (autoFill) aplicarSugerencia(s);
  };

  input.addEventListener('input', () => {
    items  = buscarSugerencias(input.value);
    activo = -1;
    pintar();
  });

  // Navegación con teclado: ↑ ↓ Enter Esc
  input.addEventListener('keydown', e => {
    if (list.classList.contains('hidden') || !items.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault(); activo = (activo + 1) % items.length; pintar();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault(); activo = (activo - 1 + items.length) % items.length; pintar();
    } else if (e.key === 'Enter' && activo >= 0) {
      e.preventDefault(); elegir(items[activo]);   // no envía el form
    } else if (e.key === 'Escape') {
      cerrar();
    }
  });

  // mousedown (no click) para que el blur no cierre la lista antes de tiempo
  list.addEventListener('mousedown', e => {
    const it = e.target.closest('.ac-item');
    if (!it) return;
    e.preventDefault();
    elegir(items[Number(it.dataset.i)]);
  });

  input.addEventListener('blur', () => setTimeout(cerrar, 120));
}

/* Rellena tipo/categoría (y monto si está vacío) al elegir una sugerencia */
function aplicarSugerencia(s) {
  const selTipo  = document.getElementById('txTipo');
  const selCat   = document.getElementById('txCategoria');
  const inpMonto = document.getElementById('txMonto');

  if (selTipo) selTipo.value = s.tipo;
  if (selCat)  selCat.innerHTML = buildCategoryOptions(s.tipo, s.categoria);
  if (inpMonto && !inpMonto.value) inpMonto.value = s.monto;
}

/* Aplica los filtros activos (tipo + categoría) */
function filtrarTx(txMesAll) {
  let r = _filtroTipo === 'Todos'
    ? txMesAll
    : txMesAll.filter(t => t.tipo === _filtroTipo);
  if (_filtroCategoria !== 'Todas') {
    r = r.filter(t => t.categoria === _filtroCategoria);
  }
  return r;
}

function localDateString() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function renderRegistro() {
  const container = document.getElementById('registro-content');
  if (!container) return;

  const { mes, anio, transacciones } = AppState;
  const txMes = transaccionesDelMes(transacciones, mes, anio);

  const txFiltradas   = filtrarTx(txMes);
  const totalFiltrado = txFiltradas.reduce((s, t) => s + Number(t.monto), 0);

  container.innerHTML = `
    <!-- Formulario nueva transacción -->
    <div class="form-card">
      <div class="form-title form-toggle-btn" id="formToggleBtn">
        <span>➕ Nueva Transacción</span>
        <span class="form-toggle-icon ${_formCollapsed ? 'collapsed' : ''}">▾</span>
      </div>
      <div class="form-body ${_formCollapsed ? 'collapsed' : ''}" id="formBody">
      <form id="formNuevaTx" autocomplete="off">
        <div class="form-grid">
          <div class="form-group">
            <label class="form-label" for="txFecha">Fecha</label>
            <input type="date" id="txFecha" class="form-control" required
              value="${localDateString()}" />
          </div>
          <div class="form-group" style="flex:2;min-width:200px">
            <label class="form-label" for="txDescripcion">Descripción</label>
            <input type="text" id="txDescripcion" class="form-control"
              autocomplete="off"
              placeholder="Ej: Mototaxi" required />
          </div>
          <div class="form-group">
            <label class="form-label" for="txTipo">Tipo</label>
            <select id="txTipo" class="form-control" required>
              <option value="Ingreso">Ingreso</option>
              <option value="Gasto" selected>Gasto</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label" for="txCategoria">Categoría</label>
            <select id="txCategoria" class="form-control" required>
              ${buildCategoryOptions('Gasto', '')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label" for="txMonto">Monto (S/)</label>
            <input type="number" id="txMonto" class="form-control"
              placeholder="0.00" min="0.01" step="0.01" required />
          </div>
          <div class="form-group" style="flex:2;min-width:180px">
            <label class="form-label" for="txNotas">Notas</label>
            <input type="text" id="txNotas" class="form-control" placeholder="Opcional" />
          </div>
          <div class="form-group" style="align-self:flex-end">
            <button type="submit" class="btn btn-primary" id="btnGuardarTx">
              💾 Guardar
            </button>
          </div>
        </div>
      </form>
      </div>
    </div>

    <!-- Filtros -->
    <div class="filter-bar">
      <span style="font-size:12px;color:var(--color-muted);font-weight:600;">Filtrar:</span>
      <button class="filter-btn ${_filtroTipo === 'Todos' ? 'active' : ''}" data-filtro="Todos">Todos</button>
      <button class="filter-btn ${_filtroTipo === 'Ingreso' ? 'active' : ''}" data-filtro="Ingreso">Ingresos</button>
      <button class="filter-btn ${_filtroTipo === 'Gasto' ? 'active' : ''}" data-filtro="Gasto">Gastos</button>

      <select id="filtroCategoria" class="period-select">
        <option value="Todas">Todas las categorías</option>
        ${TODAS_CATEGORIAS.map(c =>
          `<option value="${escapeHtml(c)}" ${c === _filtroCategoria ? 'selected' : ''}>${escapeHtml(c)}</option>`
        ).join('')}
      </select>

      <span style="margin-left:auto;font-size:12px;color:var(--color-muted)">
        ${txFiltradas.length} de ${txMes.length} · <strong>${formatMoney(totalFiltrado)}</strong> en ${getMesNombre(mes)} ${anio}
      </span>

      <button class="btn btn-ghost btn-excel" id="btnExportar" title="Exportar a Excel">⬇ Excel</button>
    </div>

    <!-- Tabla -->
    <div class="card" id="tablaTxCard">
      ${buildTransaccionesTable(txMes)}
    </div>
  `;

  // Toggle formulario (móvil)
  document.getElementById('formToggleBtn').addEventListener('click', () => {
    _formCollapsed = !_formCollapsed;
    document.getElementById('formBody').classList.toggle('collapsed', _formCollapsed);
    document.querySelector('.form-toggle-icon').classList.toggle('collapsed', _formCollapsed);
  });

  // Sincronizar categorías al cambiar tipo
  document.getElementById('txTipo').addEventListener('change', e => {
    const catSelect = document.getElementById('txCategoria');
    catSelect.innerHTML = buildCategoryOptions(e.target.value, '');
  });

  // Autocompletado propio en la descripción (con autorelleno de tipo/cat/monto)
  attachAutocomplete(document.getElementById('txDescripcion'), { autoFill: true });

  // Filtros
  container.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      _filtroTipo = btn.dataset.filtro;
      renderRegistro();
    });
  });

  // Filtro por categoría
  document.getElementById('filtroCategoria').addEventListener('change', e => {
    _filtroCategoria = e.target.value;
    renderRegistro();
  });

  // Exportar a Excel
  document.getElementById('btnExportar').addEventListener('click', openExportModal);

  // Submit formulario
  document.getElementById('formNuevaTx').addEventListener('submit', handleAddTx);
}

/* ---- Tabla de transacciones ---- */
function buildTransaccionesTable(txMesAll) {
  const txFiltradas = filtrarTx(txMesAll);

  const sorted = [...txFiltradas].sort((a, b) => b.fecha.localeCompare(a.fecha));

  if (sorted.length === 0) {
    return `<div class="empty-state">
      <div class="empty-state-icon">${_filtroTipo === 'Ingreso' ? '💵' : _filtroTipo === 'Gasto' ? '🛒' : '📭'}</div>
      <div class="empty-state-msg">Sin transacciones para mostrar</div>
    </div>`;
  }

  const rows = sorted.map(t => `
    <tr data-id="${t.id}">
      <td>${formatDate(t.fecha)}</td>
      <td>${escapeHtml(t.descripcion)}</td>
      <td><span style="font-size:12px;color:var(--color-muted)">${escapeHtml(t.categoria)}</span></td>
      <td><span class="badge ${t.tipo === 'Ingreso' ? 'badge-ingreso' : 'badge-gasto'}">${t.tipo}</span></td>
      <td class="${t.tipo === 'Ingreso' ? 'amount-income' : 'amount-expense'}">${formatMoney(t.monto)}</td>
      <td style="font-size:12px;color:var(--color-muted2);max-width:140px;overflow:hidden;text-overflow:ellipsis">${escapeHtml(t.notas || '')}</td>
      <td>
        <div style="display:flex;gap:6px">
          <button class="btn-icon edit-btn" title="Editar" data-id="${t.id}">✏️</button>
          <button class="btn-icon delete btn-delete" title="Eliminar" data-id="${t.id}">🗑️</button>
        </div>
      </td>
    </tr>`).join('');

  const cards = sorted.map(t => `
    <div class="tx-card" data-id="${t.id}">
      <div class="tx-card-top">
        <div class="tx-card-main">
          <span class="tx-card-desc">${escapeHtml(t.descripcion)}</span>
          <span class="tx-card-date">${formatDate(t.fecha)}</span>
        </div>
        <span class="tx-card-amount ${t.tipo === 'Ingreso' ? 'amount-income' : 'amount-expense'}">
          ${formatMoney(t.monto)}
        </span>
      </div>
      <div class="tx-card-bottom">
        <span class="tx-card-cat">${escapeHtml(t.categoria)}</span>
        <span class="badge ${t.tipo === 'Ingreso' ? 'badge-ingreso' : 'badge-gasto'}">${t.tipo}</span>
        <div class="tx-card-actions">
          <button class="btn-icon edit-btn" title="Editar" data-id="${t.id}">✏️</button>
          <button class="btn-icon delete btn-delete" title="Eliminar" data-id="${t.id}">🗑️</button>
        </div>
      </div>
      ${t.notas ? `<div class="tx-card-notes">📝 ${escapeHtml(t.notas)}</div>` : ''}
    </div>`).join('');

  return `
    <div class="table-wrap tx-table-desktop">
      <table>
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Descripción</th>
            <th>Categoría</th>
            <th>Tipo</th>
            <th>Monto</th>
            <th>Notas</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    <div class="tx-cards-mobile">${cards}</div>`;
}

/* ---- Agregar transacción ---- */
async function handleAddTx(e) {
  e.preventDefault();
  const btn = document.getElementById('btnGuardarTx');
  btn.disabled = true;
  btn.textContent = '⏳ Guardando…';

  const tx = {
    fecha:       document.getElementById('txFecha').value,
    descripcion: document.getElementById('txDescripcion').value.trim(),
    tipo:        document.getElementById('txTipo').value,
    categoria:   document.getElementById('txCategoria').value,
    monto:       parseFloat(document.getElementById('txMonto').value),
    notas:       document.getElementById('txNotas').value.trim(),
  };

  try {
    await API.addTransaccion(tx);
    await loadData();
    showToast('Transacción guardada correctamente', 'success');
    document.getElementById('formNuevaTx').reset();
    document.getElementById('txFecha').value = localDateString();
    renderRegistro();
  } catch (err) {
    showToast('Error al guardar: ' + err.message, 'error');
    btn.disabled = false;
    btn.textContent = '💾 Guardar';
  }
}

/* ---- Editar transacción ---- */
function openEditModal(id) {
  const tx = AppState.transacciones.find(t => t.id === id);
  if (!tx) return;

  const body = `
    <form id="formEditTx" autocomplete="off">
      <div class="form-grid">
        <div class="form-group">
          <label class="form-label">Fecha</label>
          <input type="date" id="editFecha" class="form-control" value="${tx.fecha}" required />
        </div>
        <div class="form-group" style="flex:2">
          <label class="form-label">Descripción</label>
          <input type="text" id="editDesc" class="form-control"
            autocomplete="off" value="${escapeHtml(tx.descripcion)}" required />
        </div>
        <div class="form-group">
          <label class="form-label">Tipo</label>
          <select id="editTipo" class="form-control">
            <option value="Ingreso" ${tx.tipo === 'Ingreso' ? 'selected' : ''}>Ingreso</option>
            <option value="Gasto"   ${tx.tipo === 'Gasto'   ? 'selected' : ''}>Gasto</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Categoría</label>
          <select id="editCategoria" class="form-control">
            ${buildCategoryOptions(tx.tipo, tx.categoria)}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Monto (S/)</label>
          <input type="number" id="editMonto" class="form-control" value="${tx.monto}" min="0.01" step="0.01" required />
        </div>
        <div class="form-group" style="flex:2">
          <label class="form-label">Notas</label>
          <input type="text" id="editNotas" class="form-control" value="${escapeHtml(tx.notas || '')}" />
        </div>
      </div>
      <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:20px">
        <button type="button" class="btn btn-ghost" id="modalCancelBtn">Cancelar</button>
        <button type="submit" class="btn btn-primary" id="modalSaveBtn">💾 Guardar cambios</button>
      </div>
    </form>`;

  openModal('Editar Transacción', body);

  // Sugerencias también al editar (sin autorellenar: aquí estás corrigiendo algo puntual)
  attachAutocomplete(document.getElementById('editDesc'));

  document.getElementById('editTipo').addEventListener('change', e => {
    document.getElementById('editCategoria').innerHTML = buildCategoryOptions(e.target.value, '');
  });

  document.getElementById('modalCancelBtn').addEventListener('click', closeModal);

  document.getElementById('formEditTx').addEventListener('submit', async e => {
    e.preventDefault();
    const saveBtn = document.getElementById('modalSaveBtn');
    saveBtn.disabled = true;
    saveBtn.textContent = '⏳ Guardando…';
    try {
      await API.updateTransaccion({
        id,
        fecha:       document.getElementById('editFecha').value,
        descripcion: document.getElementById('editDesc').value.trim(),
        tipo:        document.getElementById('editTipo').value,
        categoria:   document.getElementById('editCategoria').value,
        monto:       parseFloat(document.getElementById('editMonto').value),
        notas:       document.getElementById('editNotas').value.trim(),
      });
      await loadData();
      showToast('Transacción actualizada', 'success');
      closeModal();
      renderRegistro();
    } catch (err) {
      showToast('Error al actualizar: ' + err.message, 'error');
      saveBtn.disabled = false;
      saveBtn.textContent = '💾 Guardar cambios';
    }
  });
}

/* ---- Eliminar transacción ---- */
async function handleDeleteTx(id) {
  const tx = AppState.transacciones.find(t => t.id === id);
  if (!tx) return;
  if (!confirm(`¿Eliminar "${tx.descripcion}" (${formatMoney(tx.monto)})?`)) return;

  try {
    await API.deleteTransaccion(id);
    await loadData();
    showToast('Transacción eliminada', 'warning');
    renderRegistro();
  } catch (err) {
    showToast('Error al eliminar: ' + err.message, 'error');
  }
}

/* ---- Delegación de eventos en tabla ---- */
document.addEventListener('click', e => {
  const editBtn = e.target.closest('.edit-btn');
  if (editBtn) { openEditModal(editBtn.dataset.id); return; }

  const delBtn = e.target.closest('.btn-delete');
  if (delBtn) { handleDeleteTx(delBtn.dataset.id); }
});

/* ---- Escape HTML ---- */
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
