# Finanzas E&K 💰

Control financiero personal para **Edgardo & Kiara** — Sullana, Perú.

Moneda: **Soles peruanos (S/)**

---

## Características

- **Dashboard** con KPI cards, gráfico de dona (gastos por categoría) y barras (6 meses).
- **Registro de Transacciones** con formulario inline, edición y eliminación.
- **Presupuesto** editable por categoría con barras de progreso y semáforo.
- Modo oscuro, diseño responsive (mobile-first).
- Funciona **sin backend** usando datos de muestra locales.
- Se conecta a **Google Sheets** mediante Apps Script cuando se configure la URL.

---

## Estructura de archivos

```
Finanzas-E-K/
├── index.html
├── css/
│   └── style.css
├── js/
│   ├── api.js          ← configurar APPS_SCRIPT_URL aquí
│   ├── app.js
│   ├── dashboard.js
│   ├── registro.js
│   └── presupuesto.js
├── backend/
│   └── Code.gs         ← Google Apps Script
└── README.md
```

---

## Uso inmediato (sin backend)

1. Abrir `index.html` en cualquier navegador.
2. La app carga con **15 transacciones de muestra** de mayo 2026.
3. Todas las operaciones (agregar, editar, eliminar, presupuesto) funcionan en memoria local.

---

## Configurar el Backend (Google Apps Script + Google Sheets)

### Paso 1 — Crear la hoja de cálculo

1. Ir a [Google Sheets](https://sheets.google.com) y crear una hoja nueva.
2. Copiar el **ID** de la URL: `https://docs.google.com/spreadsheets/d/`**`<ID_AQUI>`**`/edit`.

### Paso 2 — Crear el Apps Script

1. En la hoja, ir a **Extensiones → Apps Script**.
2. Borrar el contenido por defecto.
3. Pegar todo el contenido del archivo `backend/Code.gs`.
4. En la línea `const SPREADSHEET_ID = '';` pegar el ID copiado en el paso 1.
5. Guardar el proyecto (Ctrl+S).

### Paso 3 — Inicializar las hojas

1. En el editor de Apps Script, seleccionar la función `setupSheets` en el menú desplegable.
2. Hacer clic en **Ejecutar**.
3. Aceptar los permisos cuando se soliciten.
4. Verificar que se crearon las hojas "Transacciones" y "Presupuesto" con sus encabezados.

### Paso 4 — Desplegar como Web App

1. Clic en **Implementar → Nueva implementación**.
2. Tipo: **Aplicación web**.
3. Configurar:
   - **Ejecutar como**: Yo (tu cuenta de Google)
   - **Quién tiene acceso**: Cualquier usuario
4. Clic en **Implementar** y aceptar permisos.
5. **Copiar la URL** que aparece (comienza con `https://script.google.com/macros/s/...`).

### Paso 5 — Conectar el frontend

1. Abrir el archivo `js/api.js`.
2. Pegar la URL en la constante:
   ```js
   const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/TU_URL_AQUI/exec';
   ```
3. Guardar y recargar la app. El indicador cambiará a **Online** 🟢.

> **Nota:** Cada vez que modifiques `Code.gs` debes crear una **nueva implementación** (no actualizar la existente) para que los cambios tomen efecto.

---

## Activar GitHub Pages

1. Subir el proyecto a un repositorio en GitHub:
   ```bash
   git init
   git add .
   git commit -m "feat: Finanzas E&K SPA"
   git remote add origin https://github.com/TU_USUARIO/finanzas-ek.git
   git push -u origin main
   ```

2. En el repositorio de GitHub:
   - Ir a **Settings → Pages**.
   - En **Source** seleccionar `Deploy from a branch`.
   - Branch: `main` / Folder: `/ (root)`.
   - Clic en **Save**.

3. En ~2 minutos la app estará en:
   `https://TU_USUARIO.github.io/finanzas-ek/`

> **Importante:** GitHub Pages sirve archivos estáticos. El frontend funciona perfectamente desde Pages. El backend sigue siendo Google Apps Script (no se aloja en GitHub).

---

## Categorías

> **Fuente única de verdad: [`js/categorias.js`](js/categorias.js)**
>
> Para agregar, quitar o renombrar una categoría, edita **solo ese archivo**.
> Los formularios, el presupuesto, las gráficas y los datos de muestra se
> alimentan de ahí automáticamente. No hay listas duplicadas en otros sitios.

Nota: `Ahorro/Inversión` es una categoría **especial**. Aunque se registra como
"Gasto", la app la trata como un **traspaso**, no como consumo: no reduce tu
saldo acumulado ni tu tasa de ahorro (el dinero no se fue, solo cambió de
bolsillo). Sí se mide como meta en la pantalla Presupuesto.

---

## Tecnologías

- HTML5 + CSS3 + Vanilla JavaScript (sin frameworks)
- [Chart.js](https://www.chartjs.org/) via CDN
- [Inter](https://fonts.google.com/specimen/Inter) via Google Fonts
- Google Apps Script (backend opcional)
- Google Sheets (base de datos)
