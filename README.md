# 🍺 Control Birras - PWA Móvil para iOS

> **Sistema ultra rápido de registro de ventas, mercadería y cuadre de caja de cervezas para tienda de barrio en Ecuador (USD $).**  
> Diseñado especialmente con estilo nativo de iPhone para que el dueño en **Manta** pueda monitorear las ventas en tiempo real y evitar faltantes de dinero en el mostrador.

---

## 📱 Vista General y Características Principales

- **⚡ Registro en menos de 3 segundos:** Botones táctiles grandes, interfaz de alto contraste optimizada para mostrador rápido.
- **👥 4 Vendedores configurados:** Selector superior con un toque para cambiar al instante entre:
  - **Jhojann Gabriel**
  - **Jenny Anabel (Mami)**
  - **Luis Demera**
  - **Jhojann Luis Demera**
- **💵 Cuadre de Caja Exacto:**
  - Desglose de **Efectivo Físico en Cajón** (lo que debe haber en billetes y monedas).
  - Dinero recibido por **Deuna / Transferencias**.
  - Control de **Fiados Pendientes** con botón para marcar como pagado cuando el cliente liquide su cuenta.
  - Cálculo automático de **Ganancia Neta** (Precio de venta menos costo de compra).
- **📦 Control de Stock y Jabas:**
  - Conversión rápida de **Jabas a unidades** (ej. 5 jabas de 12 botellas = 60 unidades) para registrar los camiones de Dinadec / Cervecería Nacional.
  - Alertas visuales cuando queden pocas botellas.
  - Ajuste rápido de inventario físico (conteo de nevera).
- **📲 Reporte diario para WhatsApp:** Con 1 solo toque copia el resumen diario formateado con emojis para enviarlo al dueño en Manta al cerrar la tienda.
- **☁️ Sincronización en la Nube en Tiempo Real:** Compatible con Firebase Firestore gratuito. Cada venta en el iPhone de la tienda se refleja al segundo en el teléfono del dueño en Manta.
- **📴 100% Funcional Offline:** Si se cae el internet en la tienda, el sistema sigue vendiendo y guardando en memoria local; al reconectarse sincroniza automáticamente.
- **🔔 Efectos de Sonido y Haptic Feedback:** Sonido de caja registradora al registrar venta mediante Web Audio API (sin archivos pesados, funciona sin internet).

---

## 🛠️ Estructura del Proyecto

```text
Cervezas app/
├── index.html            # Shell principal PWA con meta tags para iOS
├── manifest.json         # Manifiesto PWA para instalación en pantalla de inicio
├── sw.js                 # Service Worker para funcionamiento offline
├── css/
│   └── app.css           # Estilos iOS Cupertino, desenfoques y animaciones
├── js/
│   ├── app.js            # Controlador de vistas, eventos, modales y WhatsApp
│   ├── store.js          # Estado reactivo, persistencia y cliente Firestore
│   └── catalog.js        # Catálogo base de cervezas ecuatorianas y vendedores
├── icons/
│   ├── apple-touch-icon.png  # Ícono oficial para iOS
│   ├── icon-192.png          # Ícono 192x192
│   ├── icon-512.png          # Ícono 512x512
│   └── icon.svg              # Gráfico vectorial en alta definición
└── README.md             # Guía completa de uso e instalación
```

---

## 🚀 PASO 1: Cómo Subir la App GRATIS a Internet (En 2 Minutos)

Para que la app tenga un enlace web seguro (HTTPS) y se pueda instalar en los iPhones, súbela gratis con cualquiera de estas opciones:

### Opción A: Netlify Drop (La más fácil, sin programar nada)
1. Ingresa en tu computadora o teléfono a: **[app.netlify.com/drop](https://app.netlify.com/drop)**
2. Si te pide crear cuenta, inicia sesión gratis con Google.
3. **Arrastra la carpeta completa `Cervezas app`** y suéltala en el recuadro que dice *"Drag and drop your site folder here"*.
4. En 10 segundos Netlify te generará un enlace público seguro (ejemplo: `https://control-birras-manta.netlify.app`).
5. *(Opcional)* En *Site settings* puedes cambiar el nombre del subdominio para que sea fácil de recordar.

### Opción B: Vercel
1. Entra a **[vercel.com](https://vercel.com)** e inicia sesión con GitHub o email.
2. Crea un nuevo proyecto estático y vincula tu repositorio o sube la carpeta.
3. Te entregará tu dominio `https://tutienda.vercel.app`.

---

## 📱 PASO 2: Cómo Instalar en los iPhones (Tienda y Dueño en Manta)

En iOS no se descarga desde la App Store; se instala como una **PWA nativa** en 10 segundos:

1. Abre el enlace generado (ej. `https://control-birras-manta.netlify.app`) en el navegador **Safari** del iPhone.
2. Toca el botón **Compartir** de Safari (el ícono cuadrado con una flecha hacia arriba `⎋` en la barra inferior del navegador).
3. Desliza hacia abajo en el menú de opciones y selecciona **"Agregar a pantalla de inicio"** (*Add to Home Screen*).
4. Verifica el nombre ("Control Birras") y toca **"Agregar"** en la esquina superior derecha.
5. ¡Listo! En la pantalla de inicio de tu iPhone aparecerá el ícono dorado de **Control Birras**. Al abrirlo, se ejecutará a pantalla completa sin barras de navegación ni bordes de Safari, exactamente igual que una app nativa de la App Store.

---

## ☁️ PASO 3: Sincronización en Tiempo Real con Firebase (100% Gratis)

Para que el dueño en **Manta** y las personas en la tienda física vean la misma base de datos sincronizada en vivo:

1. Entra a **[console.firebase.google.com](https://console.firebase.google.com/)** con tu cuenta de Google.
2. Haz clic en **"Crear un proyecto"** (nómbralo por ejemplo `control-birras`).
3. Desactiva Google Analytics (no es necesario) y haz clic en **"Crear proyecto"**.
4. Una vez creado el proyecto:
   - En el menú izquierdo, ve a **Compilación > Firestore Database**.
   - Haz clic en **"Crear base de datos"**.
   - Elige una ubicación cercana (ej. `nam5 (us-central)`).
   - En reglas de seguridad, selecciona **"Comenzar en modo de prueba"** (*Test mode*) y pulsa **Habilitar**.
5. Ahora ve a la **Configuración del proyecto** (ícono de tuerca ⚙️ arriba a la izquierda).
6. En la pestaña *General*, baja hasta la sección *"Tus apps"* y haz clic en el ícono Web **`</>`**.
7. Ponle de apodo `Control Birras Web` y haz clic en **"Registrar app"**.
8. Te mostrará un bloque de código que dice `const firebaseConfig = { ... }`.
9. **Copia ese bloque** (las credenciales con `apiKey`, `authDomain`, `projectId`, etc.).
10. Abre la app **Control Birras** en tu teléfono:
    - Ve a la pestaña **⚙️ Ajustes**.
    - En el campo *"Configuración de Firebase"*, pega el bloque de texto copiado.
    - Asegúrate de que el *"Código de tienda"* sea el mismo en ambos teléfonos (por defecto: `tienda-principal`).
    - Toca el botón dorado **"CONECTAR Y SINCRONIZAR NUBE"**.
11. Verás que la píldora superior cambiará a **`🟢 Nube Manta`**.
12. ¡A partir de este momento, cualquier venta o abastecimiento hecho en la tienda se reflejará al instante en el teléfono en Manta!

---

## 📖 Guía de Uso Diario en el Mostrador

### 1. Registrar una venta (< 3 segundos)
1. Toca arriba quién está atendiendo: `[Jhojann Gabriel]`, `[Jenny Anabel (Mami)]`, `[Luis Demera]` o `[Jhojann Luis]`.
2. Toca la cerveza que el cliente pide (ej. tocas 2 veces *Pilsener 600ml*).
3. En la barra flotante inferior verás el total (ej. `$3.00`).
4. Toca **"COBRAR"**:
   - Selecciona `[💵 Efectivo]` o `[📲 Deuna]`.
   - Si el cliente deja fiado, activa el switch `[📋 Fiado / Por Cobrar]` y escribe su nombre.
5. Toca el botón gigante **"🍺 REGISTRAR VENTA"**.
6. Sonará el timbre de caja, se descuenta el stock de las botellas y la venta queda guardada con fecha, hora y vendedor.

### 2. Cuadrar la caja al final del día
1. Abre la pestaña **💰 Caja y Día**.
2. Mira la tarjeta verde **"💵 EFECTIVO FÍSICO EN CAJÓN"**: esa cantidad exacta es la que debe estar en billetes y monedas.
3. Revisa la tarjeta **"📲 DEUNA / TRANSFERENCIAS"** y contrástala con las notificaciones de la app de Banco Pichincha / Deuna.
4. Si un cliente viene a pagar un fiado pendiente:
   - En la sección *"Fiados Pendientes de Cobro"*, toca **"COBRAR ✓"**.
   - Te preguntará si pagó en efectivo o por Deuna y automáticamente sumará ese dinero al cuadre del día.
5. Si hubo una equivocación al marcar una venta:
   - En el historial de ventas abajo, toca **"✕ Anular Venta"**.
   - El sistema devolverá inmediatamente esas botellas al stock y restará el dinero de la caja.

### 3. Registrar llegada de camión de cervezas (Jabas)
1. Ve a la pestaña **📦 Stock**.
2. Toca **"+ REGISTRAR INGRESO DE MERCADERÍA"**.
3. Selecciona el producto (ej. *Pilsener 600ml*).
4. Elige `[📦 Por Jabas]`, ingresa cuántas llegaron (ej. `5`) y el factor (`12 botellas`).
5. El sistema calculará automáticamente `5 × 12 = 60 unidades`.
6. Ingresa el costo pagado (opcional) y toca **"GUARDAR INGRESO"**.

### 4. Enviar reporte diario al dueño en Manta
1. Ve a la pestaña **⚙️ Ajustes**.
2. Toca el botón verde **"📋 COPIAR REPORTE"** o **"💬 ABRIR WHATSAPP"**.
3. Pega el mensaje directamente en la conversación con el dueño. Recibirá un resumen limpio, profesional y listo para archivar:
   ```text
   🍺 CONTROL BIRRAS - CUADRE DEL DÍA
   📅 Fecha: Sábado 15/11/2026
   🏪 Tienda: Registro Principal
   ━━━━━━━━━━━━━━━━━━━━━━
   💰 TOTAL VENDIDO: $185.50
   📈 GANANCIA NETA: $48.20
   🍾 CERVEZAS VENDIDAS: 112 unidades
   ━━━━━━━━━━━━━━━━━━━━━━
   💵 CUADRE DE CAJA:
   • 💵 Efectivo en Cajón: $142.50
   • 📲 Deuna / Transfer: $35.00
   • 📋 Fiados Pendientes: $8.00
   ━━━━━━━━━━━━━━━━━━━━━━
   👥 VENTAS POR VENDEDOR:
   • Jhojann G.: $95.00 (24 ventas - 58 un.)
   • Mami (Jenny): $62.50 (18 ventas - 36 un.)
   • Luis D.: $20.00 (5 ventas - 12 un.)
   • Jhojann L.: $8.00 (2 ventas - 6 un.)
   ━━━━━━━━━━━━━━━━━━━━━━
   ⚠️ ALERTAS DE STOCK (¡PEDIR MERCADERÍA!):
   • Pilsener 600ml: 4 un. restantes (mínimo 12)
   • Club Verde 330ml: 3 un. restantes (mínimo 8)
   ━━━━━━━━━━━━━━━━━━━━━━
   ✅ Reporte generado automáticamente desde Control Birras PWA
   ```

---

## 🔒 Privacidad y Respaldo de Datos
- Todos los datos se almacenan localmente en el dispositivo de forma predeterminada mediante `localStorage` de alta velocidad.
- Puedes descargar en cualquier momento una copia de seguridad en formato `.json` desde la pestaña **⚙️ Ajustes > Copias de Seguridad** para tener un archivo de respaldo en tu computadora o enviarlo por correo.
