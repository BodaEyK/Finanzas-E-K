/* ============================================================
   FINANZAS E&K — EVENTOS
   Vista de los gastos agrupados por evento (viaje, mudanza, baby shower…).
   A diferencia del resto de la app, NO se filtra por mes: un evento puede
   cruzar meses y eso es justamente su razón de ser.
   ============================================================ */

function renderEventos() {
  const container = document.getElementById('eventos-content');
  if (!container) return;

  const eventos = AppState.eventos || [];

  if (eventos.length === 0) {
    container.innerHTML = `
      <div class="card">
        <div class="empty-state">
          <div class="empty-state-icon">🏷️</div>
          <div class="empty-state-msg">Todavía no hay eventos</div>
          <p style="font-size:12px;color:var(--color-muted2);margin-top:10px;max-width:420px;margin-inline:auto;line-height:1.6">
            Al registrar un gasto, escribe algo en el campo <strong>Evento</strong>
            (por ejemplo <em>“Viaje a Lima”</em>). Todos los gastos con esa misma
            etiqueta se juntarán aquí, sin importar su categoría ni el mes.
          </p>
        </div>
      </div>`;
    return;
  }

  const totalGeneral = eventos.reduce((s, e) => s + e.gastos, 0);

  container.innerHTML = `
    <div class="section-header">
      <span class="section-title">🏷️ Eventos</span>
      <span style="font-size:12px;color:var(--color-muted)">
        ${eventos.length} evento${eventos.length !== 1 ? 's' : ''} ·
        <strong style="color:var(--color-text)">${formatMoney(totalGeneral)}</strong> en total
      </span>
    </div>
    <div class="eventos-grid">
      ${eventos.map(buildEventoCard).join('')}
    </div>`;

  container.querySelectorAll('.evento-card').forEach(card => {
    card.addEventListener('click', () => openEventoDetalle(card.dataset.evento));
  });
}

/* ---- Tarjeta de un evento ---- */
function buildEventoCard(e) {
  // Top 4 categorías; el resto se agrupa en "Otras"
  const cats = Object.entries(e.porCategoria).sort((a, b) => b[1] - a[1]);
  const top  = cats.slice(0, 4);
  const resto = cats.slice(4).reduce((s, c) => s + c[1], 0);
  if (resto > 0) top.push(['Otras categorías', resto]);

  const barras = top.map(([cat, monto]) => {
    const pct = e.gastos > 0 ? (monto / e.gastos) * 100 : 0;
    return `
      <div class="evento-cat">
        <div class="evento-cat-top">
          <span>${escapeHtml(cat)}</span>
          <span>${formatMoney(monto)} <span class="evento-cat-pct">${pct.toFixed(0)}%</span></span>
        </div>
        <div class="progress-bar-wrap">
          <div class="progress-bar ok" style="width:${pct.toFixed(1)}%"></div>
        </div>
      </div>`;
  }).join('');

  const rango = e.desde === e.hasta
    ? formatDate(e.desde)
    : `${formatDate(e.desde)} — ${formatDate(e.hasta)}`;

  const neto = e.ingresos > 0
    ? `<div class="evento-neto">Ingresos asociados: ${formatMoney(e.ingresos)} · Neto: <strong>${formatMoney(e.gastos - e.ingresos)}</strong></div>`
    : '';

  return `
    <div class="card evento-card" data-evento="${escapeHtml(e.evento)}">
      <div class="evento-head">
        <div>
          <div class="evento-nombre">${escapeHtml(e.evento)}</div>
          <div class="evento-meta">${e.nGastos} gasto${e.nGastos !== 1 ? 's' : ''} · ${rango}</div>
        </div>
        <div class="evento-total">${formatMoney(e.gastos)}</div>
      </div>
      <div class="evento-cats">${barras}</div>
      ${neto}
      <div class="evento-hint">clic para ver el detalle</div>
    </div>`;
}

/* ---- Modal con el detalle de un evento ---- */
function openEventoDetalle(nombreEvento) {
  const key = String(nombreEvento).toLowerCase();
  const txs = (AppState.transacciones || [])
    .filter(t => String(t.evento || '').trim().toLowerCase() === key)
    .sort((a, b) => String(a.fecha).localeCompare(String(b.fecha)));

  if (!txs.length) return;

  const totalGastos = txs.filter(t => t.tipo === 'Gasto')
    .reduce((s, t) => s + Number(t.monto), 0);

  const filas = txs.map(t => `
    <tr>
      <td style="white-space:nowrap">${formatDate(t.fecha)}</td>
      <td>
        ${escapeHtml(t.descripcion)}
        <div style="font-size:11px;color:var(--color-muted2);margin-top:2px">${escapeHtml(t.categoria)}</div>
      </td>
      <td class="${t.tipo === 'Ingreso' ? 'amount-income' : 'amount-expense'}"
          style="white-space:nowrap;text-align:right">${formatMoney(t.monto)}</td>
    </tr>`).join('');

  const body = `
    <div class="detalle-scroll">
      <table>
        <thead><tr><th>Fecha</th><th>Descripción</th><th style="text-align:right">Monto</th></tr></thead>
        <tbody>${filas}</tbody>
      </table>
    </div>
    <div class="detalle-total">
      <span>${txs.length} movimiento${txs.length !== 1 ? 's' : ''}</span>
      <strong>${formatMoney(totalGastos)}</strong>
    </div>
    <div style="display:flex;justify-content:flex-end;margin-top:16px">
      <button type="button" class="btn btn-ghost" id="btnCerrarEvento">Cerrar</button>
    </div>`;

  openModal(`🏷️ ${nombreEvento}`, body);
  document.getElementById('btnCerrarEvento')?.addEventListener('click', closeModal);
}
