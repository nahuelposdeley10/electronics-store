<!--
  README orientado a reclutadores: comunica el valor primero (quién/para qué),
  destaca los diferenciales técnicos y deja el setup al final.
  Screenshots: agregá capturas en docs/screenshots/ y referencialas abajo.
-->

# Tienda BNP

Tienda BNP es una plataforma de software para comercios: e-commerce y gestión
del local en un mismo lugar. Es **multi-tenant**: una sola base de datos, muchas
tiendas completamente aisladas, y cada tienda con su **tienda online pública** y
un **panel de administración completo** (ventas, stock, caja, reportes, pagos).

Construida como sistema monolítico full-stack que sirve frontend + API en un
solo deploy: React 19 + Express 5 + MongoDB, con pagos reales de Mercado Pago,
estado en vivo por Socket.IO y validaciones de lint y compilación en CI.

No es una tienda aislada: es la plataforma sobre la que pueden correr muchas — cada
negocio con su propia URL, marca, productos, precios y cuenta de Mercado Pago
que cobra directo a su caja.

## Sitio comercial

### Puesta en marcha del comercio (local, sin despliegue)

En `/admin` → **Puesta en marcha**, el titular configura su negocio con una
guía de seis pasos: datos y URL, catálogo, stock, canal de cobro, entregas y
revisión final. No es una demo ni un registro público; la contratación del
servicio sigue por WhatsApp desde `/home`.

- El nombre, contactos y entrega se guardan en los ajustes reales del negocio.
  Los contactos de ejemplo se muestran vacíos para reemplazarlos; la dirección
  `/u/<slug>` solo puede asignarse desde la guía cuando todavía no existe, y se
  comprueba su unicidad. Una URL existente no se cambia.
- Catálogo y stock se verifican contra productos visibles (marca y categoría),
  con precio positivo y, para disponibilidad, stock positivo. Se usan las
  pantallas existentes para cargar/importar productos y ajustar inventario.
- Mercado Pago requiere Access Token y clave de webhook **guardados**. Esto no
  verifica su validez ni realiza una transacción. WhatsApp requiere un número
  propio y desactiva el pago online sin borrar las credenciales. La API de la
  guía devuelve indicadores de presencia, nunca las claves.
- La entrega se confirma explícitamente aunque conserve los valores actuales.
  El mínimo 0 desactiva el envío gratis por importe; el costo 0 significa envío
  sin cargo. No se integra ni contrata logística.
- La revisión final ofrece el enlace real de la tienda y copiarlo; exige que
  los cinco pasos anteriores estén completos. No publica una tienda nueva ni
  bloquea una existente: `/u/<slug>` conserva su funcionamiento actual. Caja,
  diseño y equipo son accesos opcionales, no requisitos para vender online.
- `Onboarding` persiste por `adminId` el último paso, la pausa y las revisiones.
  Se puede retomar después de recargar o iniciar otra sesión. Los requisitos se
  recalculan: si cambian los datos o ya no hay productos disponibles, se solicita
  una revisión; no se altera el funcionamiento del negocio.
- **Entrada por rol:** el admin del comercio entra automáticamente a la guía
  pendiente al iniciar sesión. Se decide una sola vez por sesión/pestaña: volver
  al panel, cambiar de pantalla o recargar no lo redirige de nuevo. “Seguir
  después” y una guía terminada impiden la apertura automática en futuros
  ingresos. Una guía completada que necesita revisión solo muestra un aviso.
- El superadmin tiene **Asistir a negocio**, un acceso manual que requiere
  seleccionar un comercio. No recibe banners ni consultas automáticas de
  onboarding en otras pantallas. Volver al panel no pausa la guía del comercio,
  y recorrer sus pasos no revoca una pausa elegida por el titular. Los vendedores
  no tienen acceso a esta configuración.
- `GET/PUT /api/admin/onboarding`: administrador activo con `settings.manage`
  o superadmin con negocio seleccionado; operadores y modo agregado no pueden
  configurar la guía. Los administradores no pueden seleccionar otro tenant.
  El superadmin puede usar las pantallas de edición solo con negocio elegido,
  según los permisos ya existentes del servidor.
- Sustituye el banner descartable basado en `ts-guided-done` y el aviso modal de
  Mercado Pago. No cambia planes, suscripciones ni permisos del backend. El
  menú del panel ahora permite desplazamiento horizontal en pantallas pequeñas.

Componentes y lógica en `src/views/Dashboard/components/onboarding/`; modelo,
servicio y rutas en `server/models/Onboarding.js`, `server/lib/onboarding.js`
y `server/routes/onboarding.js`. Sin dependencias nuevas ni migración manual.

La validación del proyecto se realiza con `npm run lint` y `npm run build`.

### Rutas públicas y comerciales

- `/home`: landing principal de Tienda BNP, orientada a presentar el servicio,
  sus beneficios, módulos y planes.
- `/planes`: acceso heredado que reemplaza la URL por `/home#planes`; los
  precios y prestaciones se muestran una sola vez en la landing.
- `/u/<slug>`: tienda pública individual de cada comercio.
- `/admin`: panel privado del administrador o del equipo del comercio.

La plataforma se vende como servicio mensual. Cada comercio puede comenzar con
una tienda online y sumar gestión de productos, ventas presenciales, stock,
caja, reportes, promociones y pagos online.

### Rediseño comercial (revisión local, sin despliegue)

`CompanyHome` contiene navegación móvil, portada con ilustración 3D original,
vistas representativas con pestañas, funcionalidades, cobros/personalización,
puesta en marcha, planes, preguntas frecuentes y contacto. Los ejemplos son
**datos ficticios**, no una demo operativa y no crean pedidos ni ventas.

- Datos comerciales centralizados en `src/views/CompanyHome/content.js`:
  Inicial **$49.900/mes**, Profesional **$89.900/mes**, Negocio **$149.900/mes**
  (ARS). Configuración inicial **desde $250.000**, separada del abono.
- Contacto comercial: **+54 9 11 7673-1388**. Cada plan permite iniciar una
  suscripción mensual con Mercado Pago usando las credenciales globales de
  Tienda BNP, sin reutilizar las credenciales de ningún comercio.
- Cuando Mercado Pago confirma la suscripción, el backend envía un link de
  activación al email informado. El link vence en 48 horas, se puede usar una
  sola vez y permite que el cliente cree su propia contraseña; recién entonces
  se crea el usuario admin, su negocio y su suscripción en la base.
- `App` separa, mediante carga diferida, `CompanyHome` de `StoreApp`.
  En `/home` no se montan catálogo, carrito, ajustes ni autenticación de la
  tienda, y no se necesita que su API esté disponible. `/admin` y `/u/<slug>`
  conservan el árbol de proveedores y la lógica de tienda anterior.
- Sora/Manrope y estilos propios; seguimiento de cursor con `requestAnimationFrame`,
  inclinación limitada y restablecimiento al salir. Se desactiva para entrada
  táctil y movimiento reducido. Pestañas con flechas/Home/End, FAQ nativa,
  menú con Escape, foco visible y enlace para saltar al contenido.
- Imagen hero con dimensiones reservadas y WebP 480/960/1280; la única imagen
  raster de contenido está en la portada. Las vistas de ejemplo son HTML/SVG,
  sin solicitudes de imágenes ni datos al backend. Metadatos sociales propios.
- Referencias, prompt original y procedencia: [Recursos visuales](docs/company-home-assets.md).

No se anuncian como disponibles facturación ARCA, logística integrada,
cuentas corrientes, variantes en checkout, dominio automático ni newsletter
funcional. No hay testimonios ni cifras comerciales inventadas.

### HTML inicial de la landing (SEO, revisión local)

`/home` y `/planes` entregan el contenido comercial completo antes de cargar
JavaScript: portada, funciones, planes, preguntas frecuentes y contacto. El
HTML y los datos JSON-LD se generan desde los mismos componentes y precios
que utiliza React; no hay una copia manual de la página ni consultas a MongoDB.

- `npm run build` genera `dist/home.html` mediante el plugin
  `scripts/company-prerender.js`. Incluye los estilos necesarios, metadatos,
  canonical y datos de empresa/software desde la primera respuesta.
- `src/main.jsx` conecta React al contenido existente mediante hidratación.
  Los menús, pestañas, animaciones y selección de planes siguen siendo
  interactivos al cargar JavaScript. Sin JavaScript se pueden leer textos,
  precios y preguntas frecuentes; la suscripción requiere JavaScript.
- El prerender funciona también con `npm run dev` y `npm run preview`.
  Express sirve el archivo únicamente en las rutas comerciales. Vercel tiene
  las reescrituras equivalentes. `/admin`, `/activar-cuenta` y `/u/<slug>`
  conservan la aplicación habitual y no reciben el canonical ni el JSON-LD
  comercial. No se precarga el panel al abrir la landing.
- En cada publicación se debe volver a ejecutar `npm run build` y desplegar
  el `dist/` completo, incluido `home.html`; un pull y reinicio sin recompilar
  no actualiza el HTML publicado. No se agregaron dependencias.
- Validación de la landing: `npm run build` y revisión manual de las rutas
  comerciales.

### Exclusiones de indexación

La landing (`/home` y `/planes`), las tiendas públicas, sus productos y sus
páginas informativas quedan indexables. El panel (`/admin`), la activación de
cuentas, los carritos y los estados o retornos de pago reciben `noindex, follow`
desde el servidor mediante `X-Robots-Tag` y también desde el meta tag de la SPA.
Los parámetros de retorno de Mercado Pago (`status`, `external_reference`,
`payment_id` y equivalentes) se cubren aunque vuelvan a la URL de la tienda.

Las rutas privadas no se bloquean en `robots.txt`: deben poder ser rastreadas
para que Google lea su exclusión. Solo la API queda fuera del rastreo. El
sitemap conserva únicamente URLs comerciales indexables. La regla compartida
vive en `src/lib/indexing.js`, se aplica en Express/Vite y se replica en los
headers de Vercel. Validación: `npm run build` y revisión manual de las rutas
indexables.

### Efectos de la web comercial

- Entrada escalonada del título y de la ilustración; fondo con luz y retícula.
- Profundidad de imagen, luz y etiqueta que responde al cursor con interpolación
  suave. Sin seguimiento táctil ni ciclos de animación permanentes.
- Apariciones de secciones y tarjetas al desplazarse, una vez por visita;
  barra de progreso de lectura y encabezado con sombra al hacer scroll.
- Indicador deslizante en las pestañas, transiciones de sus vistas y gráfico de
  ejemplo, tarjetas de planes con elevación, respuestas FAQ y botones reactivos.
- `prefers-reduced-motion` desactiva animaciones y seguimiento. Las apariciones
  nunca ocultan el contenido por defecto y se cancelan si un control recibe foco.
  No se agregaron dependencias. La lógica vive en los módulos `motion.js` de la view.

Revisión local sin MongoDB: `npm run build`.

## Capturas

Rediseño comercial local:

- [Escritorio](docs/screenshots/company-home-desktop.png)
- [Página completa](docs/screenshots/company-home-full-desktop.png)
- [Celular](docs/screenshots/company-home-mobile.png)
- [Planes](docs/screenshots/company-plans-desktop.png)

Detalle de la validación visual: [Validación de la landing](docs/company-home-validation.md).
Las capturas del panel, tienda y pagos se pueden agregar por separado.

## Lo que más vale la pena mirar

- **Multi-tenancy de verdad**: cada tienda vive en su URL (`/u/<slug>`) y toda
  su data queda escopeada por `adminId`. Una tienda jamás ve ni muta datos de
  otra; el aislamiento se aplica en cada consulta y mutación del servidor.
- **Seguridad en pagos reales**: webhooks de Mercado Pago validados por firma
  **HMAC-SHA256**, refresh tokens **anti-IDOR** por orden (imposible consultar
  una orden ajena), credenciales de pago por tienda guardadas en la base,
  verificación de monto y tenant en cada notificación, y stock que se descuenta
  **una sola vez** con rollback si algo falla a mitad de camino.
- **Estado en vivo**: las ventas y pagos aprobados aparecen en el panel al
  instante (Socket.IO + change streams de Mongo), sin recargar.
- **Panel de negocio completo, no solo CRUDs**: POS con caja, stock con
  inventario físico, compras a proveedores, reportes de ganancia, presupuestos,
  cupones, roles y permisos granulares. También incluye importación de productos
  desde JSON o CSV y onboarding de primeros pasos.
- **CI de calidad**: GitHub Actions ejecuta lint sin requerir credenciales ni
  servicios externos.

## Features

### Tienda online (lo que ve el cliente)

- Home con hero, ofertas, recién llegados, galería filtrable por categoría /
  marca / precio y marcas. La presentación de newsletter no incluye un
  servicio funcional de suscripción o envíos.
- Detalle de producto con cuotas, stock, rating, especificaciones y
  relacionados.
- Carrito con cupones, control de stock real y barra de envío gratis; persiste
  en `localStorage`.
- Checkout con **Mercado Pago** (pago online) o **pedido por WhatsApp** si la
  tienda no cobra online.
- Seguimiento del pedido con el estado del pago en vivo.
- Páginas de info: cómo comprar, medios de pago, envíos, garantía, devoluciones.

### Panel de administración (`/admin`)

- **POS**: venta presencial con descuento por ticket y métodos efectivo /
  tarjeta / transferencia; descuenta stock y anota la caja.
- **Ventas**: historial con filtros, captura de datos del pagador y
  re-verificación del pago contra Mercado Pago.
- **Devoluciones**: restaura stock y registra el egreso de caja.
- **Presupuestos**: numeración secuencial, estados, búsqueda y paginación.
- **Productos / Categorías / Marcas / Ofertas**: CRUD completo, ajuste de
  precios masivo por categoría e importación desde JSON o CSV con plantilla.
- **Stock**: movimientos, ajustes con motivo, inventario físico con
  sobras/faltas, stock mínimo y compras a proveedores.
- **Caja**: apertura de turno, arqueos y cierre con diferencia (sobra/falta).
- **Reportes**: ventas, productos, ganancias, stock y clientes.
- **Marketing**: cupones de descuento porcentual.
- **Configuración**: datos del negocio, envío, métodos de pago (credenciales de
  Mercado Pago por tienda) y tramos de cuotas.
- **Usuarios**: roles superadmin / admin / operator con permisos por código.

### Propuesta de valor para el comercio

- **Una tienda propia sin programadores**: URL, marca, catálogo, carrito y
  configuración desde el panel.
- **Venta online y mostrador conectados**: el POS y la web comparten stock y
  registran el origen de cada venta.
- **Cobros directos**: cada comercio conecta sus propias credenciales de
  Mercado Pago; la plataforma no retiene el dinero.
- **WhatsApp como alternativa de venta**: si el comercio no quiere cobrar
  online, el pedido se arma y se envía directamente al WhatsApp del local.
- **Control del negocio**: caja, compras, inventario físico, devoluciones,
  presupuestos, promociones y reportes de margen.
- **Escala multi-tienda**: el operador de la plataforma puede administrar
  múltiples comercios aislados desde una misma instalación.

## Stack

- **Frontend**: React 19 + Vite, React Compiler, socket.io-client, SVG propios.
- **Backend**: Node.js >= 22, Express 5, Socket.IO.
- **Datos**: MongoDB + Mongoose, multi-tenant por `adminId`, indices TTL para
  retención de movimientos.
- **Pagos**: Mercado Pago (preferencias, webhooks firmados, refresh de órdenes
  anti-IDOR).
- **Media**: Cloudinary (productos, logo, portada).
- **Auth**: JWT + bcrypt, roles y permisos evaluados por request.
- **Deploy**: Render (proceso único) y Vercel (serverless) desde el mismo repo.

## Setup

1. Instalar dependencias:
   ```bash
   npm install
   ```

2. Crear el `.env` a partir del ejemplo:
   ```bash
   cp .env.example .env
   ```
   Completá al menos `MONGODB_URI`, `MP_ACCESS_TOKEN`, `JWT_SECRET` y las
   credenciales de Cloudinary. Detalle de cada variable en
   [Variables de entorno](#variables-de-entorno).

3. Crear/sincronizar los usuarios del panel:
   ```bash
   npm run seed:users
   ```
   Usa los valores de `SUPERADMIN_*`, `ADMIN_*` y `OPERATOR_*` del `.env`.
   Para redefinir contraseñas por consola (recomendado la primera vez):
   ```bash
   npm run seed:users -- --ask
   ```

4. (Opcional) Sembrar órdenes demo para ver el panel con datos:
   ```bash
   npm run seed
   ```

5. Correr la API (hot reload) y el frontend:
   ```bash
   npm run server:dev   # API en http://localhost:4000
   npm run dev          # Frontend en http://localhost:5173
   ```
   O un solo proceso para producción:
   ```bash
   npm run build
   npm start            # sirve dist/ + API en http://localhost:4000
   ```

## Variables de entorno

| Variable                  | Uso                                                              | Default                     |
| ------------------------- | ---------------------------------------------------------------- | --------------------------- |
| `MP_ACCESS_TOKEN`         | Token de pago de Mercado Pago (solo backend)                     | —                           |
| `MP_PUBLIC_KEY`           | Clave pública MP (checkout)                                      | —                           |
| `MP_WEBHOOK_SECRET`       | Firma de webhooks MP; sin ella, los webhooks se rechazan (503)   | —                           |
| `EMAIL_PROVIDER`          | Proveedor de emails de activación (`none` o `resend`)            | `none`                      |
| `ALLOW_EXTERNAL_PROVIDERS_IN_DEV` | Habilita Resend, R2, Cloudinary y Mercado Pago fuera de producción | `false` |
| `RESEND_API_KEY`          | API key del proveedor de emails (solo backend)                   | —                           |
| `EMAIL_FROM`              | Remitente verificado de los emails comerciales                   | —                           |
| `EMAIL_REPLY_TO`          | Dirección opcional de respuesta                                  | —                           |
| `MONGODB_URI`             | Conexión a MongoDB                                               | —                           |
| `MOVEMENT_RETENTION_DAYS` | TTL de movimientos de stock/caja (índice `expiresAt`)            | `365`                       |
| `CLIENT_URL`              | URL pública del frontend (dev: `http://localhost:5173`)          | `http://localhost:5173`     |
| `SERVER_URL`              | URL pública del backend (webhooks MP)                            | `http://localhost:4000`     |
| `PORT`                    | Puerto del backend                                               | `4000`                      |
| `CORS_ORIGINS`            | Orígenes extra permitidos (coma separada)                        | `CLIENT_URL`                |
| `BODY_LIMIT`              | Límite del body JSON/uploads                                     | `100kb`                     |
| `JWT_SECRET`              | Firma del JWT del panel; **obligatorio en producción**           | fallback dev (no usar en prod) |
| `IMAGE_STORAGE_PROVIDER`  | Imágenes (`local`, `cloudinary` o `r2`); en dev se fuerza `local` salvo autorización explícita | `local` en dev |
| `CLOUDINARY_*`            | Cloudinary (subida de imágenes)                                  | —                           |
| `SUPERADMIN_*`            | Usuario dueño (rol `superadmin`) para `seed:users`               | —                           |
| `ADMIN_*`                 | Encargado y slug de la tienda principal (`ADMIN_BUSINESS_SLUG`)  | —                           |
| `OPERATOR_*`              | Operador de la tienda (opcional)                                 | —                           |
| `SEED_DB_NAME`            | Base donde siembran `seed` / `seed:users`                        | `electronics-store`         |

> **Sincronizar contraseñas (`.env` vs DB):** `seed:users` reescribe las passwords
> de la DB con las del `.env`. Si la DB quedó desincronizada (por ejemplo con una
> password vieja tipo `123456`), corré `npm run seed:users -- --ask` y fijá las
> nuevas contraseñas; quedan guardadas en el `.env` automáticamente.

## Scripts

| Script                 | Descripción                                            |
| ---------------------- | ------------------------------------------------------ |
| `npm run dev`          | Frontend Vite (HMR)                                    |
| `npm run build`        | Build de producción del frontend                       |
| `npm start`            | Sirve `dist/` + API en un solo proceso                 |
| `npm run server`       | API sola (sin servir el frontend build)                |
| `npm run server:dev`   | API con `node --watch`                                 |
| `npm run lint`         | ESLint                                                  |
| `npm run seed`         | Órdenes demo                                           |
| `npm run seed:users`   | Usuarios del panel (passwords desde `.env` o `--ask`)  |
| `npm run set-passwords`| Alias de `seed:users --ask`                            |

## Multi-tienda

Cada tienda es un usuario **admin** con un `businessSlug` único. Todo lo que
crea (productos, cupones, órdenes, movimientos, turnos de caja) queda bajo su
`adminId`; los datos de una tienda nunca se cruzan con otra.

- **URL pública de la tienda**: `http://host/u/<businessSlug>` (ej. `/u/full-hogar`).
  El frontend envía `x-tenant-slug: <businessSlug>` en las llamadas al catálogo
  y al checkout; el server resuelve el slug al `adminId` correspondiente.
- **Sin slug**: se usa el tenant global (`adminId = null`), para una tienda única
  sin subpath.
- **Panel**: `/admin`. El admin de cada tienda solo ve su propia data. El
  `superadmin` puede inspeccionar una tienda determinada con `?tenant=<userId>`.

El slug se define en `ADMIN_BUSINESS_SLUG` al correr `seed:users`.

## Pagos y webhooks

- **Checkout**: `POST /api/checkout` crea la orden, la asocia a un token de
  refresh único (`refresh_token`) y devuelve el `init_point` de Mercado Pago.
  El carrito guarda ese token y, al volver del pago, `OrderStatus` lo usa para
  pedir `POST /api/orders/:id/refresh`. El checkout **requiere que la tienda
  tenga su propio `Access Token`** cargado en sus settings: si no hay token por
  tenant, responde `400` aunque exista un `MP_ACCESS_TOKEN` global (el env solo
  se usa como respaldo de lectura, no para cobrar).
- **Refresh de órdenes**: el endpoint exige `x-refresh-token` (o `refreshToken`
  en el body); sin el token correcto responde `404` y no revela si la orden
  existe (anti-IDOR). Además solo muta la orden (verificación de pago, tracker,
  descuento de stock) cuando el estado es `pending`/`in_process`; en estados
  finales es de solo lectura.
- **Webhooks**: `POST /api/webhooks/mercadopago` valida la firma `x-signature`
  (`MP_WEBHOOK_SECRET`) y, para órdenes con tenant, exige que el pago declare el
  mismo `adminId` en `metadata.tenant`. Cada tienda cobra por **su propia cuenta
  de Mercado Pago**: las credenciales (`accessToken`, `publicKey`,
  `webhookSecret`) se cargan por negocio desde `Configuración → Métodos de
  pago`. El `MP_ACCESS_TOKEN` global del `.env` queda solo como respaldo de
  lectura para resolver notificaciones/legacy, no habilita pagos online.

> El tracking de pagos pendientes (estado en vivo por socket) lo maneja
> `server/lib/order-tracker.js`.

## Calidad del código

El workflow de GitHub Actions ejecuta `npm run lint`. La compilación de
producción se verifica localmente con `npm run build`.
## Suscripciones de locales

Desde `/home`, los nuevos clientes pueden elegir un plan y crear una
suscripción mensual de Mercado Pago. El webhook firmado de
`/api/webhooks/mercadopago/subscriptions` confirma la autorización y dispara el
email de activación. El endpoint `/activar-cuenta` recibe el token de un solo
uso, crea la cuenta del admin con una contraseña definida por el cliente y
asigna el plan contratado.

El superadmin administra el abono desde **Negocios → Suscripción**. Cada negocio
tiene su plan, precio mensual en ARS, vencimiento y estado. Las suscripciones
activas o en prueba se muestran vencidas al día siguiente del vencimiento, usando
la fecha de Argentina. Los negocios existentes comienzan sin configurar.

Los negocios existentes todavía pueden administrarse manualmente desde el
panel junto con la fecha de pago, medio, referencia y nuevo vencimiento. Los
reintentos no crean duplicados; una revisión evita sobrescribir cambios hechos
desde otra sesión. Un negocio con una suscripción registrada no se puede
eliminar mientras conserve esos datos.

Las URLs públicas de negocios inexistentes o desactivados muestran **Tienda no
disponible**. Sus APIs devuelven HTTP 404 con el código STORE_UNAVAILABLE y no
consultan la tienda global. La URL sin prefijo de negocio conserva su comportamiento.
