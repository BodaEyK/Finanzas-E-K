/* ============================================================
   FINANZAS E&K — DASHBOARD.JS
   ============================================================ */

let _chartDonut  = null;
let _chartBarras = null;

function renderDashboard() {
  const container = document.getElementById('dashboard-content');
  if (!container) return;

  const { mes, anio, transacciones } = AppState;
  const txMes = transaccionesDelMes(transacciones, mes, anio);
  const presupuesto = presupuestoDelPeriodo(mes, anio);

  const totalIngresos = txMes
    .filter(t => t.tipo === 'Ingreso')
    .reduce((s, t) => s + Number(t.monto), 0);

  // Gastos = solo consumo real. Los traspasos a Ahorro/Inversión no cuentan
  // como gasto (el dinero no se fue, sigue siendo tuyo).
  const totalGastos = gastosDeConsumo(txMes);
  const ahorroMes   = ahorroExplicito(txMes);

  const balance = totalIngresos - totalGastos;
  const tasaAhorro = totalIngresos > 0
    ? ((balance / totalIngresos) * 100).toFixed(1)
    : '0.0';
  const subTasa = ahorroMes > 0
    ? `Incluye ${formatMoney(ahorroMes)} en Ahorro/Inversión`
    : 'Del total de ingresos';

  // Saldo arrastrado desde los meses anteriores + el balance de este mes
  const saldoAnt   = saldoAnterior(transacciones, mes, anio);
  const saldoFinal = saldoAnt + balance;
  const subSaldo   = saldoAnt !== 0
    ? `Viene ${formatMoney(saldoAnt)} del mes anterior`
    : 'Sin arrastre previo';
  const claseSaldo = saldoFinal >= 0 ? 'kpi-saldo' : 'kpi-saldo neg';

  container.innerHTML = `
    <!-- KPI Cards -->
    <div class="kpi-grid">
      ${kpiCard('Ingresos del Mes', formatMoney(totalIngresos), 'kpi-income',  getMesNombre(mes) + ' ' + anio, '↑')}
      ${kpiCard('Gastos del Mes',   formatMoney(totalGastos),  'kpi-expense', getMesNombre(mes) + ' ' + anio, '↓')}
      ${kpiCard('Balance del Mes',  formatMoney(balance),      'kpi-balance', balance >= 0 ? 'Positivo' : 'Negativo', balance >= 0 ? '✓' : '!')}
      ${kpiCard('Saldo Acumulado',  formatMoney(saldoFinal),   claseSaldo,    subSaldo, '🏦')}
      ${kpiCard('Tasa de Ahorro',   tasaAhorro + '%',          'kpi-savings', subTasa, '🎯')}
    </div>

    <!-- Gráficos -->
    <div class="charts-grid">
      <div class="chart-card">
        <div class="chart-card-title">📊 Gastos por Categoría</div>
        <div class="chart-wrapper donut">
          <canvas id="chartDonut"></canvas>
        </div>
      </div>
      <div class="chart-card">
        <div class="chart-card-title">📈 Ingresos vs Gastos — Últimos 6 meses</div>
        <div class="chart-wrapper">
          <canvas id="chartBarras" style="max-height:220px"></canvas>
        </div>
      </div>
    </div>

    <!-- Tabla Presupuesto vs Real -->
    <div class="card">
      <div class="card-header">
        <span class="card-title">📋 Presupuesto vs Real — ${getMesNombre(mes)} ${anio}</span>
      </div>
      <div class="table-wrap">
        ${buildBudgetTable(txMes, presupuesto)}
      </div>
    </div>
  `;

  // Inicializar gráficos después de inyectar HTML
  requestAnimationFrame(() => {
    buildDonutChart(txMes);
    buildBarChart(transacciones, mes, anio);
  });
}

/* ---- KPI Card HTML ---- */
function kpiCard(label, value, cssClass, sub, icon) {
  return `
    <div class="kpi-card ${cssClass}">
      <div class="kpi-label">${icon} ${label}</div>
      <div class="kpi-value">${value}</div>
      <div class="kpi-sub">${sub}</div>
    </div>`;
}

/* ---- Tabla Presupuesto vs Real ---- */
function buildBudgetTable(txMes, presupuesto) {
  if (!presupuesto || presupuesto.length === 0) {
    return '<div class="empty-state"><div class="empty-state-icon">📭</div><div class="empty-state-msg">Sin datos de presupuesto</div></div>';
  }

  const gastosPorCat = {};
  txMes.filter(t => t.tipo === 'Gasto').forEach(t => {
    gastosPorCat[t.categoria] = (gastosPorCat[t.categoria] || 0) + Number(t.monto);
  });

  let totalPresupuesto = 0;
  let totalGastado = 0;

  const rows = presupuesto.map(p => {
    const gastado    = gastosPorCat[p.categoria] || 0;
    const pct        = p.presupuesto > 0 ? Math.min((gastado / p.presupuesto) * 100, 100) : 0;
    const pctReal    = p.presupuesto > 0 ? ((gastado / p.presupuesto) * 100).toFixed(0) : '—';
    const disponible = p.presupuesto - gastado;

    totalPresupuesto += Number(p.presupuesto);
    totalGastado     += gastado;

    let status, barClass;
    if (pct >= 100)      { status = '<span class="badge badge-over">Excedido</span>';   barClass = 'over'; }
    else if (pct >= 80)  { status = '<span class="badge badge-warn">Atención</span>';   barClass = 'warn'; }
    else                 { status = '<span class="badge badge-ok">OK</span>';            barClass = 'ok';   }

    return `
      <tr>
        <td><strong>${escapeHtml(p.categoria)}</strong></td>
        <td class="amount-neutral">${formatMoney(p.presupuesto)}</td>
        <td class="amount-expense">${formatMoney(gastado)}</td>
        <td class="${disponible < 0 ? 'amount-expense' : 'amount-income'}">${formatMoney(disponible)}</td>
        <td>
          <div style="display:flex;align-items:center;gap:8px;">
            <div class="progress-bar-wrap">
              <div class="progress-bar ${barClass}" style="width:${pct}%"></div>
            </div>
            <span style="font-size:11px;color:var(--color-muted);min-width:32px">${pctReal}%</span>
          </div>
        </td>
        <td>${status}</td>
      </tr>`;
  }).join('');

  const pctTotal = totalPresupuesto > 0
    ? ((totalGastado / totalPresupuesto) * 100).toFixed(0) + '%' : '—';

  return `
    <table>
      <thead>
        <tr>
          <th>Categoría</th>
          <th>Presupuesto</th>
          <th>Gastado</th>
          <th>Disponible</th>
          <th style="min-width:140px">% Ejecutado</th>
          <th>Estado</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
      <tfoot>
        <tr class="tfoot-row">
          <td>TOTAL</td>
          <td>${formatMoney(totalPresupuesto)}</td>
          <td>${formatMoney(totalGastado)}</td>
          <td class="${totalPresupuesto - totalGastado < 0 ? 'amount-expense' : 'amount-income'}">${formatMoney(totalPresupuesto - totalGastado)}</td>
          <td>${pctTotal}</td>
          <td></td>
        </tr>
      </tfoot>
    </table>`;
}

/* ---- Gráfico Dona ---- */
function buildDonutChart(txMes) {
  const canvas = document.getElementById('chartDonut');
  if (!canvas) return;

  // Solo consumo real: los traspasos a Ahorro/Inversión no son gasto
  const gastosPorCat = {};
  txMes.filter(t => t.tipo === 'Gasto' && !esAhorro(t)).forEach(t => {
    gastosPorCat[t.categoria] = (gastosPorCat[t.categoria] || 0) + Number(t.monto);
  });

  const labels = Object.keys(gastosPorCat);
  const data   = Object.values(gastosPorCat);

  if (labels.length === 0) {
    canvas.parentElement.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📭</div><div class="empty-state-msg">Sin gastos este mes</div></div>';
    return;
  }

  const palette = [
    '#2563EB','#16A34A','#DC2626','#D97706','#7C3AED',
    '#0891B2','#BE185D','#65A30D','#EA580C','#0F766E',
    '#1D4ED8','#15803D','#B91C1C','#B45309','#6D28D9'
  ];

  if (_chartDonut) { _chartDonut.destroy(); _chartDonut = null; }

  _chartDonut = new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: palette.slice(0, labels.length),
        borderColor: '#1E293B',
        borderWidth: 2,
        hoverOffset: 6,
      }]
    },
    options: {
      responsive: true,
      cutout: '68%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            color: '#94A3B8',
            font: { size: 11, family: 'Inter' },
            boxWidth: 10,
            padding: 8,
          }
        },
        tooltip: {
          callbacks: {
            label: ctx => ` ${ctx.label}: S/ ${ctx.parsed.toFixed(2)}`
          }
        }
      }
    }
  });
}

/* ---- Gráfico de Barras (últimos 6 meses) ---- */
function buildBarChart(transacciones, mesActual, anioActual) {
  const canvas = document.getElementById('chartBarras');
  if (!canvas) return;

  const meses = [];
  for (let i = 5; i >= 0; i--) {
    let m = mesActual - i;
    let a = anioActual;
    if (m <= 0) { m += 12; a -= 1; }
    meses.push({ mes: m, anio: a, label: getMesNombre(m).substring(0, 3) + ' ' + a });
  }

  const ingresos = meses.map(({ mes, anio }) =>
    transaccionesDelMes(transacciones, mes, anio)
      .filter(t => t.tipo === 'Ingreso')
      .reduce((s, t) => s + Number(t.monto), 0)
  );

  const gastos = meses.map(({ mes, anio }) =>
    gastosDeConsumo(transaccionesDelMes(transacciones, mes, anio))
  );

  if (_chartBarras) { _chartBarras.destroy(); _chartBarras = null; }

  _chartBarras = new Chart(canvas, {
    type: 'bar',
    data: {
      labels: meses.map(m => m.label),
      datasets: [
        {
          label: 'Ingresos',
          data: ingresos,
          backgroundColor: 'rgba(22,163,74,.75)',
          borderColor: '#16A34A',
          borderWidth: 1,
          borderRadius: 4,
        },
        {
          label: 'Gastos',
          data: gastos,
          backgroundColor: 'rgba(220,38,38,.7)',
          borderColor: '#DC2626',
          borderWidth: 1,
          borderRadius: 4,
        }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          labels: {
            color: '#94A3B8',
            font: { size: 12, family: 'Inter' },
          }
        },
        tooltip: {
          callbacks: {
            label: ctx => ` ${ctx.dataset.label}: S/ ${ctx.parsed.y.toFixed(2)}`
          }
        }
      },
      scales: {
        x: {
          ticks: { color: '#64748B', font: { size: 11 } },
          grid:  { color: 'rgba(255,255,255,.05)' }
        },
        y: {
          ticks: {
            color: '#64748B',
            font: { size: 11 },
            callback: v => 'S/ ' + v.toLocaleString('es-PE')
          },
          grid: { color: 'rgba(255,255,255,.05)' }
        }
      }
    }
  });
}
