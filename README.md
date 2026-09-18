# Electronics Store

Tienda online multi-tenant (una base de datos, muchas tiendas) con panel de
administración, carrito y pago con Mercado Pago. Frontend React (Vite) + API
Express + MongoDB (Mongoose), compartiendo el mismo deploy.

## Stack

- **Frontend**: React 19 + Vite, React Compiler, socket.io-client (estado de pagos en vivo)
- **Backend**: Node.js ≥ 22, Express 5, Socket.IO
- **Datos**: MongoDB (Mongoose), multi-tenant por `adminId`
- **Pagos**: Mercado Pago (preferencias, webhooks firmados, refresh de órdenes)
- **CRM/media**: Cloudinary (imágenes de producto), JWT para el panel

## Requisitos

- Node.js ≥ 22.12
- MongoDB (local, Docker o Atlas)
- Cuenta de desarrollador de Mercado Pago (Access Token + Webhook secret)
- Cuenta de Cloudinary (solo para subir imágenes de productos)

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
   credenciales de Cloudinary. Detalle de cada variable en [Variables de entorno](#variables-de-entorno).

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
| `MONGODB_URI`             | Conexión a MongoDB                                               | —                           |
| `MOVEMENT_RETENTION_DAYS` | TTL de movimientos de stock/caja (índice `expiresAt`)            | `365`                       |
| `CLIENT_URL`              | URL pública del frontend (dev: `http://localhost:5173`)          | `http://localhost:5173`     |
| `SERVER_URL`              | URL pública del backend (webhooks MP)                            | `http://localhost:4000`     |
| `PORT`                    | Puerto del backend                                               | `4000`                      |
| `CORS_ORIGINS`            | Orígenes extra permitidos (coma separada)                        | `CLIENT_URL`                |
| `BODY_LIMIT`              | Límite del body JSON/uploads                                     | `100kb`                     |
| `JWT_SECRET`              | Firma del JWT del panel; **obligatorio en producción**           | fallback dev (no usar en prod) |
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
| `npm test`             | Test runner (`node --test server/tests/`)              |
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

## Tests

Los tests viven en `server/tests/*.test.js`. Cada archivo se conecta a una base
**aislada** (nombres tipo `electronics-store-test-tenancy`, `-test-promos`,
`-test-refresh`, etc.) derivada de `MONGODB_URI`, así que se pueden correr contra
tu MongoDB local o contra Atlas sin pisar la base real.

```bash
npm test            # toda la suite
npm run test:refresh    # refresh de órdenes / IDOR
npm run test:webhooks   # firma de webhooks y transiciones
```

**CI**: hay un workflow de GitHub Actions (`.github/workflows/ci.yml`) que levanta
un Mongo (service container), corre `npm ci`, lint y `npm test` con
`MONGODB_URI=mongodb://127.0.0.1:27017`. No hace falta ninguna credencial en el
repo.