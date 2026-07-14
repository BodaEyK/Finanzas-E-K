/* ============================================================
   FINANZAS E&K — EXPORTACIÓN A EXCEL (.xlsx)
   Genera archivos Excel reales con SheetJS: sin líos de acentos ni de
   separadores, y con los montos como NÚMEROS (se pueden sumar y usar en
   tablas dinámicas), no como texto.
   ============================================================ */

const MONEDA_FMT = '"S/" #,##0.00';

/* Redondea a 2 decimales: evita el ruido de coma flotante
   (1774.0899999999997 → 1774.09) en las celdas calculadas */
const r2 = n => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

/* Aplica formato de moneda a una columna (desde la fila 2, saltando el encabezado) */
function _formatoMoneda(ws, col, nFilas) {
  for (let i = 2; i <= nFilas + 1; i++) {
    const celda = ws[col + i];
    if (celda && typeof celda.v === 'number') {
      celda.t = 'n';
      celda.z = MONEDA_FMT;
    }
  }
}

/* ---- Hoja: listado de transacciones ---- */
function _hojaTransacciones(txs) {
  const rows = [...txs]
    .sort((a, b) => String(a.fecha).localeCompare(String(b.fecha)))
    .map(t => ({
      'Fecha':       t.fecha,
      'Descripción': t.descripcion,
      'Categoría':   t.categoria,
      'Tipo':        t.tipo,
      'Monto':       Number(t.monto),
      'Notas':       t.notas || '',
    }));

  const ws = XLSX.utils.json_to_sheet(rows, {
    header: ['Fecha', 'Descripción', 'Categoría', 'Tipo', 'Monto', 'Notas']
  });
  ws['!cols'] = [{ wch: 12 }, { wch: 34 }, { wch: 20 }, { wch: 10 }, { wch: 13 }, { wch: 28 }];
  _formatoMoneda(ws, 'E', rows.length);   // columna Monto
  return ws;
}

/* ---- Hoja: Presupuesto vs Real (para un mes) ---- */
function _hojaPresupuestoVsReal(txMes, presupuesto) {
  const gastos = {};
  txMes.filter(t => t.tipo === 'Gasto').forEach(t => {
    gastos[t.categoria] = (gastos[t.categoria] || 0) + Number(t.monto);
  });

  const mapaPres = Object.fromEntries(
    (presupuesto || []).map(p => [p.categoria, Number(p.presupuesto) || 0])
  );

  const cats = [...new Set([...Object.keys(mapaPres), ...Object.keys(gastos)])].sort();

  const rows = cats.map(c => {
    const pres = mapaPres[c] || 0;
    const gas  = gastos[c]   || 0;
    return {
      'Categoría':    c,
      'Presupuesto':  r2(pres),
      'Gastado':      r2(gas),
      'Disponible':   r2(pres - gas),
      '% Ejecutado':  pres > 0 ? Math.round((gas / pres) * 100) : 0,
    };
  });

  // Fila de totales
  const totPres = rows.reduce((s, r) => s + r['Presupuesto'], 0);
  const totGas  = rows.reduce((s, r) => s + r['Gastado'], 0);
  rows.push({
    'Categoría':   'TOTAL',
    'Presupuesto': r2(totPres),
    'Gastado':     r2(totGas),
    'Disponible':  r2(totPres - totGas),
    '% Ejecutado': totPres > 0 ? Math.round((totGas / totPres) * 100) : 0,
  });

  const ws = XLSX.utils.json_to_sheet(rows, {
    header: ['Categoría', 'Presupuesto', 'Gastado', 'Disponible', '% Ejecutado']
  });
  ws['!cols'] = [{ wch: 22 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 13 }];
  ['B', 'C', 'D'].forEach(col => _formatoMoneda(ws, col, rows.length));
  return ws;
}

/* ---- Hoja: resumen mes a mes (para el historial completo) ---- */
function _hojaResumenMensual(txs) {
  const meses = {};
  (txs || []).forEach(t => {
    const p = String(t.fecha).slice(0, 7);   // yyyy-MM
    if (!meses[p]) meses[p] = { ing: 0, gas: 0, ahorro: 0 };
    if (t.tipo === 'Ingreso')   meses[p].ing    += Number(t.monto);
    else if (esAhorro(t))       meses[p].ahorro += Number(t.monto);  // traspaso, no consumo
    else                        meses[p].gas    += Number(t.monto);
  });

  let acumulado = 0;
  const rows = Object.keys(meses).sort().map(p => {
    const m       = meses[p];
    const balance = m.ing - m.gas;
    acumulado    += balance;
    const [y, mm] = p.split('-');
    return {
      'Mes':                getMesNombre(Number(mm)) + ' ' + y,
      'Ingresos':           r2(m.ing),
      'Gastos (consumo)':   r2(m.gas),
      'Ahorro/Inversión':   r2(m.ahorro),
      'Balance del mes':    r2(balance),
      'Saldo acumulado':    r2(acumulado),
    };
  });

  const ws = XLSX.utils.json_to_sheet(rows, {
    header: ['Mes', 'Ingresos', 'Gastos (consumo)', 'Ahorro/Inversión', 'Balance del mes', 'Saldo acumulado']
  });
  ws['!cols'] = [{ wch: 16 }, { wch: 14 }, { wch: 17 }, { wch: 17 }, { wch: 16 }, { wch: 16 }];
  ['B', 'C', 'D', 'E', 'F'].forEach(col => _formatoMoneda(ws, col, rows.length));
  return ws;
}

/* ---- Generar y descargar ---- */
function exportarExcel(alcance) {
  if (typeof XLSX === 'undefined') {
    showToast('No se pudo cargar el motor de Excel. Revisa tu conexión.', 'error');
    return;
  }

  const { mes, anio, transacciones } = AppState;
  const wb = XLSX.utils.book_new();
  let nombre;

  if (alcance === 'mes') {
    const txMes = transaccionesDelMes(transacciones, mes, anio);
    const txs   = filtrarTx(txMes);   // respeta los filtros activos en pantalla

    if (!txs.length) {
      showToast('No hay transacciones que exportar', 'warning');
      return;
    }
    XLSX.utils.book_append_sheet(wb, _hojaTransacciones(txs), 'Transacciones');
    XLSX.utils.book_append_sheet(
      wb, _hojaPresupuestoVsReal(txMes, presupuestoDelPeriodo(mes, anio)), 'Presupuesto vs Real'
    );
    nombre = `Finanzas-EK_${getMesNombre(mes)}-${anio}.xlsx`;

  } else {
    if (!transacciones.length) {
      showToast('No hay transacciones que exportar', 'warning');
      return;
    }
    XLSX.utils.book_append_sheet(wb, _hojaTransacciones(transacciones), 'Transacciones');
    XLSX.utils.book_append_sheet(wb, _hojaResumenMensual(transacciones), 'Resumen mensual');
    nombre = 'Finanzas-EK_Historial-completo.xlsx';
  }

  XLSX.writeFile(wb, nombre);
  showToast('Excel descargado ✓', 'success');
}

/* ---- Modal para elegir el alcance ---- */
function openExportModal() {
  const { mes, anio, transacciones } = AppState;
  const txMes       = transaccionesDelMes(transacciones, mes, anio);
  const nFiltradas  = filtrarTx(txMes).length;
  const hayFiltros  = _filtroTipo !== 'Todos' || _filtroCategoria !== 'Todas';

  const body = `
    <p style="font-size:13px;color:var(--color-muted);margin-bottom:16px">
      Se descargará un archivo <strong>.xlsx</strong> que abre directo en Excel.
    </p>
    <div class="export-opts">
      <button type="button" class="export-opt" data-alcance="mes">
        <span class="export-opt-title">📅 ${getMesNombre(mes)} ${anio}</span>
        <span class="export-opt-desc">
          ${nFiltradas} transacción${nFiltradas !== 1 ? 'es' : ''}${hayFiltros ? ' <em>(con los filtros que tienes puestos)</em>' : ''}
          · incluye la hoja <strong>Presupuesto vs Real</strong>
        </span>
      </button>
      <button type="button" class="export-opt" data-alcance="todo">
        <span class="export-opt-title">📚 Todo el historial</span>
        <span class="export-opt-desc">
          ${transacciones.length} transacciones · incluye <strong>resumen mes a mes</strong> con el saldo acumulado
        </span>
      </button>
    </div>`;

  openModal('Exportar a Excel', body);

  document.querySelectorAll('.export-opt').forEach(btn => {
    btn.addEventListener('click', () => {
      closeModal();
      exportarExcel(btn.dataset.alcance);
    });
  });
}
