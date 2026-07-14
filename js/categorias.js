/* ============================================================
   FINANZAS E&K — CATEGORÍAS
   ÚNICA FUENTE DE VERDAD de las categorías de la app.

   ¿Quieres agregar/quitar una categoría? Hazlo AQUÍ y en ningún otro lado.
   Todo lo demás (formularios, presupuesto, gráficas, datos de muestra)
   se alimenta de este archivo.
   ============================================================ */

const CATEGORIAS_INGRESO = [
  'Sueldo',
  'Negocio/Emprendimiento',
  'Freelance/Extra',
  'Otros Ingresos',
];

const CATEGORIAS_GASTO = [
  'Vivienda',
  'Alimentación',
  'Transporte',
  'Salud',
  'Educación',
  'Servicios',
  'Comunicaciones',
  'Ropa y Calzado',
  'Entretenimiento',
  'Deudas/Cuotas',
  'Bebé/Familia',
  'Regalos/Ocasiones',
  'Ahorro/Inversión',
  'Emergencias',
  'Otros Gastos',
];

const TODAS_CATEGORIAS = [...CATEGORIAS_INGRESO, ...CATEGORIAS_GASTO];

/* Categoría especial: NO es un gasto real, es un traspaso.
   El dinero no se va, solo cambia de bolsillo → no reduce patrimonio
   ni tasa de ahorro. (Ver esAhorro() en app.js) */
const CATEGORIA_AHORRO = 'Ahorro/Inversión';

/* Montos sugeridos al arrancar un presupuesto desde cero (S/) */
const PRESUPUESTO_DEFAULT = {
  'Vivienda':          700,
  'Alimentación':      600,
  'Transporte':        160,
  'Salud':             100,
  'Educación':          80,
  'Servicios':         100,
  'Comunicaciones':    120,
  'Ropa y Calzado':    150,
  'Entretenimiento':    80,
  'Deudas/Cuotas':     350,
  'Bebé/Familia':      200,
  'Regalos/Ocasiones':  50,
  'Ahorro/Inversión':  400,
  'Emergencias':       100,
  'Otros Gastos':       80,
};
