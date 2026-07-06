/**
 * FINANZAS E&K — Google Apps Script Backend
 * Hoja de cálculo: 2 hojas → "Transacciones" y "Presupuesto"
 *
 * Columnas Transacciones: ID | Fecha | Descripcion | Categoria | Tipo | Monto | Notas
 * Columnas Presupuesto:   Categoria | Presupuesto
 */

const SPREADSHEET_ID = '1fjalFTPBcp5-z8tmrYhdbJwPRmB-k3UZjk6dYLzBtfU'; // <-- Pegar el ID de tu Google Sheet aquí
const SHEET_TX       = 'Transacciones';
const SHEET_BUDGET   = 'Presupuesto';

/* Clave de acceso: NO se guarda en este código (el repo es público).
   Vive en las Propiedades del Script (privadas del dueño) + en la cabeza del usuario.
   Para fijarla o cambiarla:
     1. Reemplaza PON_TU_CLAVE_AQUI por tu clave secreta.
     2. En el editor, selecciona la función setToken y pulsa Ejecutar (una sola vez).
     3. Vuelve a dejar el placeholder PON_TU_CLAVE_AQUI (para no subir la clave al repo). */
function setToken() {
  PropertiesService.getScriptProperties().setProperty('API_TOKEN', 'PON_TU_CLAVE_AQUI');
}

function _checkToken(token) {
  const real = PropertiesService.getScriptProperties().getProperty('API_TOKEN');
  return !!real && token === real;
}

/* Serializa las escrituras para evitar corrupción por accesos simultáneos */
function _withLock(fn) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000); // espera hasta 10 s por el turno
  try {
    return fn();
  } finally {
    lock.releaseLock();
  }
}

/* ============================================================
   CORS HELPERS
   ============================================================ */
function corsResponse(data) {
  const output = ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
  return output;
}

/* ============================================================
   doGet — Acciones de lectura
   ============================================================ */
function doGet(e) {
  try {
    const action = e.parameter.action;

    // ping: solo prueba de conectividad, no expone datos → sin token
    if (action === 'ping') return corsResponse({ ok: true });

    // auth: valida la clave de acceso y responde true/false (para la pantalla de login)
    if (action === 'auth') return corsResponse({ ok: _checkToken(e.parameter.token) });

    // El resto de lecturas requieren token
    if (!_checkToken(e.parameter.token))
      return corsResponse({ error: 'No autorizado' });

    if (action === 'getTransacciones') return corsResponse(getTransacciones());
    if (action === 'getPresupuesto')   return corsResponse(getPresupuesto());

    return corsResponse({ error: 'Acción desconocida: ' + action });
  } catch (err) {
    return corsResponse({ error: err.message });
  }
}

/* ============================================================
   doPost — Acciones de escritura
   ============================================================ */
function doPost(e) {
  try {
    const body   = JSON.parse(e.postData.contents);

    if (!_checkToken(body.token))
      return corsResponse({ error: 'No autorizado' });

    const action = body.action;

    // Escrituras serializadas con LockService para evitar corrupción concurrente
    if (action === 'addTransaccion')    return corsResponse(_withLock(() => addTransaccion(body)));
    if (action === 'updateTransaccion') return corsResponse(_withLock(() => updateTransaccion(body)));
    if (action === 'deleteTransaccion') return corsResponse(_withLock(() => deleteTransaccion(body.id)));
    if (action === 'updatePresupuesto') return corsResponse(_withLock(() => updatePresupuesto(body.presupuesto)));

    return corsResponse({ error: 'Acción desconocida: ' + action });
  } catch (err) {
    return corsResponse({ error: err.message });
  }
}

/* ============================================================
   HELPERS DE HOJA
   ============================================================ */
function getSheet(name) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  return ss.getSheetByName(name);
}

function generateId() {
  return 'tx_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
}

/* ============================================================
   TRANSACCIONES
   ============================================================ */
/* Convierte una celda de fecha (Date o string) a 'yyyy-MM-dd' en zona Lima */
function _parseSheetDate(cell) {
  if (!cell) return '';
  // Si ya es un string con formato yyyy-MM-dd, devolverlo directo
  if (typeof cell === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(cell)) return cell;
  // Si es un objeto Date (como Sheets lo almacena cuando detecta fecha)
  try {
    return Utilities.formatDate(new Date(cell), 'America/Lima', 'yyyy-MM-dd');
  } catch (e) {
    return String(cell).substring(0, 10);
  }
}

function getTransacciones() {
  const sheet  = getSheet(SHEET_TX);
  const data   = sheet.getDataRange().getValues();
  const headers = data[0]; // ID, Fecha, Descripcion, Categoria, Tipo, Monto, Notas

  const transacciones = data.slice(1).map(row => ({
    id:          String(row[0]),
    fecha:       _parseSheetDate(row[1]),
    descripcion: String(row[2]),
    categoria:   String(row[3]),
    tipo:        String(row[4]),
    monto:       Number(row[5]),
    notas:       String(row[6] || ''),
  })).filter(t => t.id && t.id !== 'undefined');

  return { transacciones };
}

function addTransaccion(data) {
  const sheet = getSheet(SHEET_TX);
  const id    = generateId();
  sheet.appendRow([
    id,
    data.fecha,
    data.descripcion,
    data.categoria,
    data.tipo,
    data.monto,
    data.notas || ''
  ]);
  return { success: true, id };
}

function updateTransaccion(data) {
  const sheet = getSheet(SHEET_TX);
  const rows  = sheet.getDataRange().getValues();

  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === String(data.id)) {
      sheet.getRange(i + 1, 1, 1, 7).setValues([[
        data.id,
        data.fecha,
        data.descripcion,
        data.categoria,
        data.tipo,
        data.monto,
        data.notas || ''
      ]]);
      return { success: true };
    }
  }
  return { success: false, error: 'Transacción no encontrada' };
}

function deleteTransaccion(id) {
  const sheet = getSheet(SHEET_TX);
  const rows  = sheet.getDataRange().getValues();

  for (let i = rows.length - 1; i >= 1; i--) {
    if (String(rows[i][0]) === String(id)) {
      sheet.deleteRow(i + 1);
      return { success: true };
    }
  }
  return { success: false, error: 'Transacción no encontrada' };
}

/* ============================================================
   PRESUPUESTO
   ============================================================ */
function getPresupuesto() {
  const sheet = getSheet(SHEET_BUDGET);
  const data  = sheet.getDataRange().getValues();

  const presupuesto = data.slice(1).map(row => ({
    categoria:   String(row[0]),
    presupuesto: Number(row[1]),
  })).filter(p => p.categoria && p.categoria !== 'undefined');

  return { presupuesto };
}

function updatePresupuesto(presupuesto) {
  const sheet = getSheet(SHEET_BUDGET);

  // Limpiar y reescribir
  const lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    sheet.getRange(2, 1, lastRow - 1, 2).clearContent();
  }

  const rows = presupuesto.map(p => [p.categoria, p.presupuesto]);
  if (rows.length > 0) {
    sheet.getRange(2, 1, rows.length, 2).setValues(rows);
  }

  return { success: true };
}

/* ============================================================
   SETUP INICIAL — Ejecutar una vez para crear encabezados
   ============================================================ */
function setupSheets() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

  // Hoja Transacciones
  let sheetTx = ss.getSheetByName(SHEET_TX);
  if (!sheetTx) sheetTx = ss.insertSheet(SHEET_TX);
  sheetTx.getRange(1, 1, 1, 7).setValues([['ID','Fecha','Descripcion','Categoria','Tipo','Monto','Notas']]);

  // Hoja Presupuesto
  let sheetBudget = ss.getSheetByName(SHEET_BUDGET);
  if (!sheetBudget) sheetBudget = ss.insertSheet(SHEET_BUDGET);
  sheetBudget.getRange(1, 1, 1, 2).setValues([['Categoria','Presupuesto']]);

  // Insertar categorías por defecto
  const categorias = [
    ['Vivienda',700],['Alimentación',600],['Transporte',160],
    ['Salud',100],['Educación',80],['Servicios',100],['Comunicaciones',120],
    ['Ropa y Calzado',150],['Entretenimiento',80],['Deudas/Cuotas',350],
    ['Bebé/Familia',200],['Regalos/Ocasiones',50],['Ahorro/Inversión',400],
    ['Emergencias',100],['Otros Gastos',80]
  ];
  sheetBudget.getRange(2, 1, categorias.length, 2).setValues(categorias);

  Logger.log('Hojas creadas correctamente.');
}
