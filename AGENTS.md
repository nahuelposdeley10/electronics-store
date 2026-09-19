# Convenciones del proyecto

## Arquitectura de componentes y estilos (frontend)

Esta es la arquitectura obligatoria del frontend. Cualquier cambio de UI o
código debe respetarla.

- **Solo `.jsx`** (no TypeScript, no `.ts`/`.tsx`). La lógica pura va en `.js`.
- **Componentes globales** (usados en múltiples views): `src/components/<Nombre>/index.jsx` + `styles.css`.
  Hoy existen: `ProductCard`, `Stars`, `SearchSelect`, `Toast`, `Header`, `Footer`,
  `WhatsAppButton`, `DashboardLoading` e `Icons` (SVG propios, sin emoji/glifos).
- **Views**: `src/views/<Vista>/index.jsx` + `styles.css`. Views actuales:
  `Home`, `CartView`, `ProductDetail`, `OrderStatus`, `InfoPage`, `Dashboard`.
- **Sub-componentes exclusivos de una view**: `src/views/<Vista>/components/<Nombre>/index.jsx` + `styles.css`.
  No crear un componente global salvo que se use en más de una view.
- **Routing**: no hay librería de router; el estado de la vista lo maneja
  `src/lib/router.js` (`parseLocation` / `urlForView`) con `history.pushState`.
  URLs: `/`, `/p/:id`, `/cart`, `/info/:slug`, `/u/<slug>…` (prefijo de tienda),
  `/admin`. El seguimiento del pago va por query strings de Mercado Pago
  (`status`, `external_reference`).
- **Importación limpia**: importar el folder, nunca el archivo interno.
  - Global: `import Button from '@/components/Button'` (nunca `@/components/Button/index.jsx`).
  - Sub-componente de la misma view: `import GallerySection from './components/GallerySection'`.
- **Alias de módulos**: `@` → `src` (configurado en `vite.config.js`).
  - `@/lib/*`: helpers puros / clientes de API (`api.js`, `tenant.js`, `router.js`,
    `urls.js`, `seo.js`, `siteSettings.js`, `motion.js`, `orderSocket.js`, `useOrderEvents.js`).
  - `@/data/*`: formateadores (p. ej. `format.js` con `formatARS`).
  - `@/context/*`: contexto de React. Patrón por dominio: `<Nombre>Context.js`
    + `<Nombre>Provider.jsx` + hook `use<Nombre>.js`
    (ver `cartContext.js` / `CartProvider.jsx` / `useCart.js`).
- **CSS por carpeta**: cada `styles.css` contiene SOLO las clases exclusivas de
  ese componente/view. Las clases atómicas/compartidas (`primary-btn`, `mono`,
  `table`, `chip`, etc.) viven SOLO en `src/styles/ui.css`. No duplicar reglas
  compartidas en los `styles.css` de cada carpeta ni crear archivos CSS únicos
  gigantes.
- **No cambiar funcionalidad, lógica de negocio ni UI** al refactorizar o
  reorganizar archivos; solo se mueve estructura.

## Gotcha de resolución de módulos

- Los imports relativos a un archivo `.js` (sin carpeta) requieren la extensión
  explícita: `import x from '../consts.js'`. Sin extensión no resuelven en el
  bundler de este repo. Los imports por alias (`@/lib/×`, `@/context/×`,
  `@/data/×`) sí resuelven sin extensión.
- Recordar la profundidad: p. ej. las pantallas del panel viven en
  `src/views/Dashboard/components/<screen>/index.jsx`, por lo que el archivo
  compartido de constantes se importa como `'../../consts.js'` y los helpers
  compartidos del panel como `'../common'` (ver `Dashboard/components/common/`).
- Vista de ejemplo del patrón (Documentación viva):
  - `src/components/Stars/` (global, extraído de un duplicado ProductCard/ProductDetail)
  - `src/views/Home/components/GallerySection/` y `src/views/ProductDetail/components/RelatedProducts/` (exclusivos)
  - `src/views/Dashboard/components/<screen>/` (pantallas del panel con sus estilos)

## Panel de administración

- El Dashboard (`src/views/Dashboard/index.jsx`, ruta `/admin`) es una view `lazy`
  con login propio (JWT) y navegación por pantallas contenida en
  `src/views/Dashboard/components/<screen>/`: `pos`, `sales`, `products`,
  `stock`, `reports`, `cash`, `marketing`, `settings`, `users`. Cada pantalla
  tiene `index.jsx` + `styles.css` y comparte `../common` (`ScreenBlocked`,
  `ScreenLoading`, `EmptyNote`, `KpiTicket`, `StatusTag`, `ToggleRow`,
  `catalogOptions.js`, etc.) y `../../consts.js` (labels/chips/formato). El
  estado "pantalla activa" persiste en `sessionStorage` (`ts-admin-screen`).
- Roles: `superadmin` (dueño; inspecciona cualquier tienda con `?tenant=<userId>`)
  y `admin` (solo su tienda). Los permisos llegan como `perms` desde
  `POST /api/auth/login` / `GET /api/auth/me` (ver estrategia de
  `src/lib/tenant.js` → `tenantUrl`).

## Multi-tenant (frontend → server)

- Tienda pública: URL `/u/<business-slug>` (p. ej. `/u/full-hogar`). Sin prefijo
  `/u/` se usa el tenant global (`adminId = null`).
- `src/lib/tenant.js`: `getTenantSlug()`, `getTenantHeaders()` (agrega
  `x-tenant-slug` solo cuando hay slug), `storePathPrefix()`, `tenantUrl()`
  (el superadmin inyecta `?tenant=<userId>` en los calls `/api/admin`).
- El server resuelve `x-tenant-slug` al `adminId` de cada negocio y scopea toda
  la data por ese `adminId`.

## Contexto del servidor

- Backend Express + MongoDB (Mongoose) en `server/`: `routes/` (checkout,
  webhooks, catalog, admin, catalog-admin, promos, inventory, reports, users,
  auth, settings, cash), `models/` (Product, Variant, Brand, Category, Coupon,
  Order, User, StockMovement, Cash*, Counter, Quote, Purchase, Setting), `lib/`
  (query/`meta`, counter, money, order-*, payer, retention, settings, stock,
  tenant, webhook-signature…), `middleware/auth.js`, `services/` (cloudinary,
  mercadopago, pricing), `config/env.js`.
- **Multi-tenancy por `adminId`**: todo documento de negocio lleva `adminId`; una
  tienda nunca ve ni muta data de otra. No romper este scope.
- **Pagos**: Mercado Pago. El checkout crea la orden con un `refresh_token` único
  (anti-IDOR: `POST /api/orders/:id/refresh` exige `x-refresh-token`, en estados
  finales es de solo lectura) y devuelve el `init_point`. Las credenciales por
  tienda (`accessToken`, `publicKey`, `webhookSecret`) viven en los settings de
  la tienda en la BD, no en `.env`; sin token de tienda el checkout da `400` (el
  `MP_ACCESS_TOKEN` global es solo respaldo de lectura). Los webhooks validan la
  firma `x-signature` (`webhook-signature.js`) y la tienda del pago. Estado en
  vivo por Socket.IO (`server/socketio.js` + `server/lib/order-tracker.js`).
- **Env (producción)**: el server no arranca sin `NODE_ENV=production`,
  `JWT_SECRET`, `MONGODB_URI` y `CLIENT_URL` (`server/config/env.js` →
  `validateEnv()`). `CORS_ORIGINS` es opcional (default `CLIENT_URL`). Nunca
  subir credenciales/secretos al repo.
- **Tests**: `npm test` corre `node --test server/tests/*.test.js` y REQUIERE un
  MongoDB accesible (usa bases aisladas derivadas de `MONGODB_URI`, p. ej.
  `-test-tenancy`). Lint: `npm run lint`. El CI (`.github/workflows/ci.yml`)
  levanta un service container de Mongo y corre lint + tests sin credenciales.
- **Deploy**: dos targets. Render (`render.yaml`: `node server/index.js`, sirve
  `dist/` + API en un proceso) y Vercel (`vercel.json`: `api/index.js` como
  serverless). Hay `package-lock.json` y `yarn.lock` versionados: el CI usa npm,
  Render/Vercel usan yarn; no dejar que uno se desincronice del otro.
- Las migraciones/features de negocio en `server/` suelen venir de otra sesión
  de trabajo; antes de asumir que algo está terminado, verificar con `npm test`
  y no sobrescribir archivos ajenos sin confirmar.