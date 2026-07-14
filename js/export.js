/* ============================================================
   FINANZAS E&K — EXPORTACIÓN A EXCEL (.xlsx) CON ESTILOS
   Usa xlsx-js-style (fork de SheetJS con soporte de estilos).
   Los montos van como NÚMEROS con formato de moneda: se pueden sumar
   y usar en tablas dinámicas.
   ============================================================ */

const MONEDA_FMT = '"S/" #,##0.00';

/* Redondea a 2 decimales: evita el ruido de coma flotante
   (1774.0899999999997 → 1774.09) en las celdas calculadas */
const r2 = n => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

/* ---- Paleta (alineada con la app) ---- */
const XL = {
  header:  '1E3A8A',  // azul marino
  zebra:   'F4F7FB',  // gris muy claro (filas alternas)
  blanco:  'FFFFFF',
  texto:   '1E293B',
  verde:   '15803D',
  rojo:    'B91C1C',
  ambar:   'B45309',
  cyan:    '0E7490',
  totalBg: 'E2E8F0',
  okBg:    'DCFCE7',
  warnBg:  'FEF3C7',
  overBg:  'FEE2E2',
};

const _borde  = { style: 'thin', color: { rgb: 'D9DEE7' } };
const _BORDES = { top: _borde, bottom: _borde, left: _borde, right: _borde };

const _estiloHeader = () => ({
  font:      { bold: true, sz: 11, color: { rgb: XL.blanco } },
  fill:      { fgColor: { rgb: XL.header } },
  alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
  border:    _BORDES,
});

/* Recorre todas las celdas y aplica: header, zebra y bordes.
   `porCelda` permite personalizar cada celda del cuerpo. */
function _estilizar(ws, nCols, nFilas, porCelda) {
  for (let R = 0; R <= nFilas; R++) {
    for (let C = 0; C < nCols; C++) {
      const ref  = XLSX.utils.encode_cell({ r: R, c: C });
      const cell = ws[ref];
      if (!cell) continue;

      if (R === 0) { cell.s = _estiloHeader(); continue; }

      cell.s = {
        font:      { sz: 11, color: { rgb: XL.texto } },
        fill:      { fgColor: { rgb: R % 2 === 0 ? XL.zebra : XL.blanco } },
        border:    _BORDES,
        alignment: { vertical: 'center' },
      };
      if (porCelda) porCelda(cell, R, C);
    }
  }
  ws['!rows'] = [{ hpt: 24 }];   // header un poco más alto
}

/* Marca una celda como moneda (número, alineado a la derecha) */
function _moneda(cell, colorRgb, negrita = false) {
  cell.s.numFmt    = MONEDA_FMT;
  cell.s.alignment = { horizontal: 'right', vertical: 'center' };
  if (colorRgb) cell.s.font = { sz: 11, bold: negrita, color: { rgb: colorRgb } };
  else if (negrita) cell.s.font = { sz: 11, bold: true, color: { rgb: XL.texto } };
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
      'Monto':       r2(t.monto),
      'Notas':       t.notas || '',
    }));

  const ws = XLSX.utils.json_to_sheet(rows, {
    header: ['Fecha', 'Descripción', 'Categoría', 'Tipo', 'Monto', 'Notas']
  });
  ws['!cols'] = [{ wch: 12 }, { wch: 34 }, { wch: 20 }, { wch: 11 }, { wch: 14 }, { wch: 28 }];
  ws['!autofilter'] = { ref: `A1:F${rows.length + 1}` };   // filtros nativos de Excel

  const tipos = rows.map(r => r['Tipo']);

  _estilizar(ws, 6, rows.length, (cell, R, C) => {
    if (C === 0 || C === 3) {                       // Fecha, Tipo → centrados
      cell.s.alignment = { horizontal: 'center', vertical: 'center' };
    }
    if (C === 3) {                                  // Tipo → verde/rojo
      const esIngreso = tipos[R - 1] === 'Ingreso';
      cell.s.font = { sz: 11, bold: true, color: { rgb: esIngreso ? XL.verde : XL.rojo } };
    }
    if (C === 4) {                                  // Monto → moneda coloreada
      _moneda(cell, tipos[R - 1] === 'Ingreso' ? XL.verde : XL.rojo, true);
    }
    if (C === 5) {                                  // Notas → gris
      cell.s.font = { sz: 10, italic: true, color: { rgb: '64748B' } };
    }
  });

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
      'Categoría':   c,
      'Presupuesto': r2(pres),
      'Gastado':     r2(gas),
      'Disponible':  r2(pres - gas),
      '% Ejecutado': pres > 0 ? Math.round((gas / pres) * 100) : 0,
    };
  });

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
  ws['!cols'] = [{ wch: 22 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 14 }];

  const ultima = rows.length;   // fila del TOTAL (1-indexada respecto al header)

  _estilizar(ws, 5, rows.length, (cell, R, C) => {
    const fila     = rows[R - 1];
    const esTotal  = R === ultima;

    if (esTotal) {   // fila TOTAL: fondo gris + negrita + línea superior
      cell.s.fill   = { fgColor: { rgb: XL.totalBg } };
      cell.s.font   = { sz: 11, bold: true, color: { rgb: XL.texto } };
      cell.s.border = { ..._BORDES, top: { style: 'medium', color: { rgb: '94A3B8' } } };
    }

    if (C === 1 || C === 2) _moneda(cell, null, esTotal);

    if (C === 3) {   // Disponible → verde si sobra, rojo si se pasó
      _moneda(cell, fila['Disponible'] < 0 ? XL.rojo : XL.verde, true);
    }

    if (C === 4) {   // % Ejecutado → semáforo (igual que en la app)
      const pct = fila['% Ejecutado'];
      cell.s.numFmt    = '0"%"';
      cell.s.alignment = { horizontal: 'center', vertical: 'center' };
      cell.s.font      = { sz: 11, bold: true, color: {
        rgb: pct >= 100 ? XL.rojo : pct >= 80 ? XL.ambar : XL.verde
      }};
      if (!esTotal) {
        cell.s.fill = { fgColor: { rgb:
          pct >= 100 ? XL.overBg : pct >= 80 ? XL.warnBg : XL.okBg
        }};
      }
    }
  });

  return ws;
}

/* ---- Hoja: resumen mes a mes (para el historial completo) ---- */
function _hojaResumenMensual(txs) {
  const meses = {};
  (txs || []).forEach(t => {
    const p = String(t.fecha).slice(0, 7);   // yyyy-MM
    if (!meses[p]) meses[p] = { ing: 0, gas: 0, ahorro: 0 };
    if (t.tipo === 'Ingreso')  meses[p].ing    += Number(t.monto);
    else if (esAhorro(t))      meses[p].ahorro += Number(t.monto);  // traspaso, no consumo
    else                       meses[p].gas    += Number(t.monto);
  });

  let acumulado = 0;
  const rows = Object.keys(meses).sort().map(p => {
    const m       = meses[p];
    const balance = m.ing - m.gas;
    acumulado    += balance;
    const [y, mm] = p.split('-');
    return {
      'Mes':              getMesNombre(Number(mm)) + ' ' + y,
      'Ingresos':         r2(m.ing),
      'Gastos (consumo)': r2(m.gas),
      'Ahorro/Inversión': r2(m.ahorro),
      'Balance del mes':  r2(balance),
      'Saldo acumulado':  r2(acumulado),
    };
  });

  const ws = XLSX.utils.json_to_sheet(rows, {
    header: ['Mes', 'Ingresos', 'Gastos (consumo)', 'Ahorro/Inversión', 'Balance del mes', 'Saldo acumulado']
  });
  ws['!cols'] = [{ wch: 16 }, { wch: 14 }, { wch: 18 }, { wch: 18 }, { wch: 17 }, { wch: 18 }];

  _estilizar(ws, 6, rows.length, (cell, R, C) => {
    const fila = rows[R - 1];
    if (C === 1) _moneda(cell, XL.verde);                                   // Ingresos
    if (C === 2) _moneda(cell, XL.rojo);                                    // Gastos
    if (C === 3) _moneda(cell, XL.cyan);                                    // Ahorro
    if (C === 4) _moneda(cell, fila['Balance del mes'] < 0 ? XL.rojo : XL.verde, true);
    if (C === 5) {                                                          // Saldo acumulado
      _moneda(cell, fila['Saldo acumulado'] < 0 ? XL.rojo : XL.cyan, true);
      cell.s.fill = { fgColor: { rgb: 'E0F2FE' } };                         // resaltado
    }
  });

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
  const txMes      = transaccionesDelMes(transacciones, mes, anio);
  const nFiltradas = filtrarTx(txMes).length;
  const hayFiltros = _filtroTipo !== 'Todos' || _filtroCategoria !== 'Todas';

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
