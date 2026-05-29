/* ============================================================
   FINANZAS E&K — PRESUPUESTO.JS
   ============================================================ */

function renderPresupuesto() {
  const container = document.getElementById('presupuesto-content');
  if (!container) return;

  const { mes, anio, transacciones, presupuesto } = AppState;
  const txMes = transaccionesDelMes(transacciones, mes, anio);

  const gastosPorCat = {};
  txMes.filter(t => t.tipo === 'Gasto').forEach(t => {
    gastosPorCat[t.categoria] = (gastosPorCat[t.categoria] || 0) + Number(t.monto);
  });

  container.innerHTML = `
    <div class="section-header">
      <span class="section-title">🗂️ Presupuesto — ${getMesNombre(mes)} ${anio}</span>
      <button class="btn btn-success" id="btnGuardarPresupuesto">💾 Guardar cambios</button>
    </div>

    <div class="card">
      <div class="table-wrap">
        <table id="tablaPres">
          <thead>
            <tr>
              <th>Categoría</th>
              <th style="min-width:140px">Presupuesto (S/)</th>
              <th>Gastado</th>
              <th>Disponible</th>
              <th style="min-width:160px">% Ejecutado</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            ${buildPresupuestoRows(presupuesto, gastosPorCat)}
          </tbody>
          <tfoot>
            ${buildPresupuestoTotals(presupuesto, gastosPorCat)}
          </tfoot>
        </table>
      </div>
    </div>
  `;

  // Actualizar totales cuando cambia cualquier input
  container.querySelectorAll('.budget-input').forEach(input => {
    input.addEventListener('input', updatePresupuestoTotals);
  });

  document.getElementById('btnGuardarPresupuesto').addEventListener('click', handleSavePresupuesto);
}

/* ---- Filas de presupuesto ---- */
function buildPresupuestoRows(presupuesto, gastosPorCat) {
  return presupuesto.map(p => {
    const gastado    = gastosPorCat[p.categoria] || 0;
    const pres       = Number(p.presupuesto) || 0;
    const disponible = pres - gastado;
    const pct        = pres > 0 ? (gastado / pres) * 100 : 0;
    const pctDisplay = pres > 0 ? pct.toFixed(0) + '%' : '—';

    let status, barClass;
    if (pct >= 100)     { status = '<span class="badge badge-over">Excedido</span>'; barClass = 'over'; }
    else if (pct >= 80) { status = '<span class="badge badge-warn">Atención</span>'; barClass = 'warn'; }
    else                { status = '<span class="badge badge-ok">OK</span>';          barClass = 'ok';   }

    const barWidth = Math.min(pct, 100).toFixed(1);

    return `
      <tr data-cat="${p.categoria}">
        <td><strong>${p.categoria}</strong></td>
        <td>
          <div style="display:flex;align-items:center;gap:4px">
            <span style="color:var(--color-muted);font-size:12px">S/</span>
            <input
              type="number"
              class="budget-input"
              data-cat="${p.categoria}"
              value="${pres}"
              min="0"
              step="10"
            />
          </div>
        </td>
        <td class="gastado-cell amount-expense">${formatMoney(gastado)}</td>
        <td class="disponible-cell ${disponible < 0 ? 'amount-expense' : 'amount-income'}">${formatMoney(disponible)}</td>
        <td class="progreso-cell">
          <div style="display:flex;align-items:center;gap:8px">
            <div class="progress-bar-wrap" style="flex:1;min-width:80px">
              <div class="progress-bar ${barClass}" style="width:${barWidth}%"></div>
            </div>
            <span style="font-size:11px;color:var(--color-muted);min-width:34px">${pctDisplay}</span>
          </div>
        </td>
        <td class="estado-cell">${status}</td>
      </tr>`;
  }).join('');
}

/* ---- Fila de totales ---- */
function buildPresupuestoTotals(presupuesto, gastosPorCat) {
  const totalPres    = presupuesto.reduce((s, p) => s + Number(p.presupuesto || 0), 0);
  const totalGastado = presupuesto.reduce((s, p) => s + (gastosPorCat[p.categoria] || 0), 0);
  const totalDisp    = totalPres - totalGastado;
  const pct          = totalPres > 0 ? ((totalGastado / totalPres) * 100).toFixed(0) + '%' : '—';

  return `
    <tr class="tfoot-row">
      <td>TOTAL</td>
      <td id="totalPres">${formatMoney(totalPres)}</td>
      <td id="totalGastado">${formatMoney(totalGastado)}</td>
      <td id="totalDisp" class="${totalDisp < 0 ? 'amount-expense' : 'amount-income'}">${formatMoney(totalDisp)}</td>
      <td id="totalPct">${pct}</td>
      <td></td>
    </tr>`;
}

/* ---- Actualizar totales en tiempo real ---- */
function updatePresupuestoTotals() {
  const { transacciones, mes, anio, presupuesto } = AppState;
  const txMes = transaccionesDelMes(transacciones, mes, anio);

  const gastosPorCat = {};
  txMes.filter(t => t.tipo === 'Gasto').forEach(t => {
    gastosPorCat[t.categoria] = (gastosPorCat[t.categoria] || 0) + Number(t.monto);
  });

  let totalPres    = 0;
  let totalGastado = 0;

  document.querySelectorAll('.budget-input').forEach(input => {
    const cat     = input.dataset.cat;
    const pres    = parseFloat(input.value) || 0;
    const gastado = gastosPorCat[cat] || 0;
    const disponible = pres - gastado;
    const pct     = pres > 0 ? (gastado / pres) * 100 : 0;
    const barWidth = Math.min(pct, 100).toFixed(1);

    totalPres    += pres;
    totalGastado += gastado;

    const row = input.closest('tr');
    if (!row) return;

    // Disponible
    const dispCell = row.querySelector('.disponible-cell');
    if (dispCell) {
      dispCell.textContent = formatMoney(disponible);
      dispCell.className = `disponible-cell ${disponible < 0 ? 'amount-expense' : 'amount-income'}`;
    }

    // Progress bar
    const progresoCell = row.querySelector('.progreso-cell');
    if (progresoCell) {
      let barClass = 'ok';
      if (pct >= 100)     barClass = 'over';
      else if (pct >= 80) barClass = 'warn';

      const pctDisplay = pres > 0 ? pct.toFixed(0) + '%' : '—';
      progresoCell.innerHTML = `
        <div style="display:flex;align-items:center;gap:8px">
          <div class="progress-bar-wrap" style="flex:1;min-width:80px">
            <div class="progress-bar ${barClass}" style="width:${barWidth}%"></div>
          </div>
          <span style="font-size:11px;color:var(--color-muted);min-width:34px">${pctDisplay}</span>
        </div>`;
    }

    // Estado
    const estadoCell = row.querySelector('.estado-cell');
    if (estadoCell) {
      if (pct >= 100)     estadoCell.innerHTML = '<span class="badge badge-over">Excedido</span>';
      else if (pct >= 80) estadoCell.innerHTML = '<span class="badge badge-warn">Atención</span>';
      else                estadoCell.innerHTML = '<span class="badge badge-ok">OK</span>';
    }
  });

  // Footer totals
  const totalDisp = totalPres - totalGastado;
  const pctTotal  = totalPres > 0 ? ((totalGastado / totalPres) * 100).toFixed(0) + '%' : '—';

  const elPres    = document.getElementById('totalPres');
  const elGastado = document.getElementById('totalGastado');
  const elDisp    = document.getElementById('totalDisp');
  const elPct     = document.getElementById('totalPct');

  if (elPres)    elPres.textContent    = formatMoney(totalPres);
  if (elGastado) elGastado.textContent = formatMoney(totalGastado);
  if (elDisp) {
    elDisp.textContent = formatMoney(totalDisp);
    elDisp.className   = totalDisp < 0 ? 'amount-expense' : 'amount-income';
  }
  if (elPct)     elPct.textContent = pctTotal;
}

/* ---- Guardar presupuesto ---- */
async function handleSavePresupuesto() {
  const btn = document.getElementById('btnGuardarPresupuesto');
  btn.disabled = true;
  btn.textContent = '⏳ Guardando…';

  const nuevoPresupuesto = [];
  document.querySelectorAll('.budget-input').forEach(input => {
    nuevoPresupuesto.push({
      categoria:   input.dataset.cat,
      presupuesto: parseFloat(input.value) || 0,
    });
  });

  try {
    await API.updatePresupuesto(nuevoPresupuesto);
    AppState.presupuesto = nuevoPresupuesto;
    showToast('Presupuesto guardado correctamente', 'success');
  } catch (err) {
    showToast('Error al guardar presupuesto: ' + err.message, 'error');
  }

  btn.disabled = false;
  btn.innerHTML = '💾 Guardar cambios';
}
