# Projecto explicado: Tienda online + panel de administración para locales

> Este documento describe **todo** lo que hace este proyecto, pensado para que
> una IA ayude a presentarlo **en persona a negocios locales** y prepare un
> **Q&A**. Está escrito en español rioplatense (como el producto) y separa
> claramente lo que **ya funciona**, lo que es **demo/ficticio** y lo que está
> **pendiente**.

---

## 1. Qué es el proyecto (en una frase)

Una **plataforma web que le da a un comercio local una tienda online propia y
un panel completo de administración** (ventas, stock, caja, productos,
reportes y pagos con Mercado Pago), con una particularidad fuerte: es
**multi-tenant** — una sola instalación sirve a **muchas tiendas**, cada una
con su propia URL, sus propios productos, clientes, precios y cuenta de pago.

Es decir: no es "una tienda", es **la plataforma sobre la que corren muchas
tiendas** (o una sola, si el local no quiere el modo multi).

### El punto de venta que se le presenta a un local

- El local **no necesita programadores ni conocimientos técnicos** para tener
  su e-commerce.
- Obtiene **su propia URL** (`/u/su-negocio`), su **marca**, sus productos, sus
  precios y cuotas, su **carrito**, y su **cobro con Mercado Pago**.
- Además recibe un **panel de gestión** estilo "sistema de local": registrar
  ventas presenciales (POS), manejar stock, caja chica, devoluciones,
  presupuestos, cupones y reportes.
- Cada tienda cobra con **su propia cuenta de Mercado Pago**: el dinero va
  directo a la caja del negocio, la plataforma nunca toca la plata.
- El flujo de compra también puede ser **por WhatsApp** si el local elige no
  cobrar online.

---

## 2. Cómo está hecho por dentro (arquitectura)

| Capa | Tecnología | Rol |
|---|---|---|
| Frontend | React 19 + Vite (JSX, sin TypeScript) | La tienda pública y el panel `/admin` |
| Backend | Node.js ≥ 22 + Express 5 | API REST, auth, pagos, stock, reportes |
| Base de datos | MongoDB (Mongoose) | Todo: productos, órdenes, caja, settings |
| Pagos | Mercado Pago (SDK oficial) | Checkout, preferencias, webhooks firmados |
| Tiempo real | Socket.IO | El panel ve órdenes/pagos en vivo |
| Imágenes | Cloudinary | Subida de logos, portadas y fotos |
| Deploy | Render (process) y/o Vercel (serverless) | La misma app se sirve en un solo proceso |

### Cómo se separan las "tiendas" (multi-tenant)

- Cada tienda es un usuario **admin** con un `businessSlug` único.
- URL pública de la tienda: `https://dominio/u/<slug>` (aunque también
  funciona sin prefijo para una tienda única).
- Todo documento en la base de datos lleva un `adminId`. **Una tienda jamás ve
  ni toca los datos de otra** (esto está garantizado por tests dedicados).
- El frontend manda `x-tenant-slug` en las llamadas; el server resuelve el slug
  al `adminId` de esa tienda.
- El **superadmin** (dueño de la plataforma) puede inspeccionar cualquier
  tienda desde su panel con `?tenant=<id>`.

### Roles y permisos del panel

- **superadmin**: el dueño de la plataforma; ve todas las tiendas, crea
  negocios y admins de tienda.
- **admin**: el dueño de un local; gestiona SOLO su tienda (productos, ventas,
  caja, stock, config).
- **operator**: un empleado del local, con permisos acotados (por ejemplo,
  atender el POS y la caja, pero no tocar configuraciones de pago).

Los permisos se controlan finamente (`pos.manage`, `cash.manage`,
`catalog.manage`, `coupons.manage`, `settings.manage`, `users.manage`, etc.).
El login usa JWT (expira a las 12 h) y protege los accesos por rol.

---

## 3. Lo que ve el cliente: la tienda online

Vistas: **Home**, **Resultados de búsqueda**, **Detalle de producto**,
**Carrito**, **Estado del pedido** y **Páginas informativas** (cómo comprar,
medios de pago, envíos, garantía, devoluciones, contacto).

### Home
- **Hero** tipo vidriera: nombre de la tienda, dirección, claim ("Tecnología
  de galería. Precio de mostrador."), CTA a comprar y tres sellos de confianza:
  garantía oficial, servicio técnico propio, retiro en el local.
- **Ofertas de la semana**: productos con descuento (con % OFF).
- **Banda de envío**: sello "ENVÍO GRATIS" por encima del umbral o "RETIRO
  GRATIS" en el local (según configure el negocio).
- **Recién llegados**: productos marcados como "Nuevo".
- **Galería paginada** con filtros por **categoría**, **marca** y **orden de
  precio**, más una franja de **marcas oficiales**.
- **Newsletter** (solo cosmética en la demo actual, aún no guarda correos).

### Certificaciones de confianza que se muestran
- **Cuotas sin interés** escalonadas según el precio (configurable: ej. 12
  cuotas desde $100.000, 6 desde $50.000, 3 desde $0).
- **Envío gratis** con umbral configurable, o retiro en el local.
- **Garantía oficial** + **servicio técnico propio** + **retiro en el local**
  (dirección, horarios y mapa de Google en el footer).
- **Stock**: "Quedan solo N unidades" cuando queda poco (urgencia honesta).

### Flujo de compra completo
1. El cliente busca (por nombre, marca o categoría) y abre un producto.
2. En el detalle: precio taped en formato argentino, cuotas, especificaciones,
   stock, rating y productos relacionados.
3. Agrega al carrito; el carrito persiste en `localStorage`, limita cantidades
   al stock real y aplica **cupones de descuento** cargados por la tienda.
4. **Checkout**: elige cómo pagar:
   - **Mercado Pago online**: se crea la orden, se redirige a MP, y al volver
     (o por webhook) el pago se confirma en vivo con Socket.IO.
   - **Pedido por WhatsApp** (si la tienda desactiva el pago online): arma un
     mensaje con el resumen del pedido y lo envía al WhatsApp del negocio.
5. **Estado del pedido**: el cliente ve "pago aprobado", "esperando pago" o
   "no se completó", y el negocio lo contacta para coordinar envío/retiro.

### Seguridad de pagos (importante para transmitir confianza)
- Cada orden tiene un **refresh token único** que solo conoce el navegador que
  la creó (anti-IDOR: nadie puede consultar la orden de otro).
- Los **webhooks de Mercado Pago se validan por firma HMAC**, y se verifica que
  el pago pertenezca a la tienda correcta y que el monto coincida.
- Las **credenciales de pago viven en la base por tienda** (nunca en el código
  ni expuestas a la web).

---

## 4. Lo que hace el local: el panel de administración (`/admin`)

El panel es una vista con **login propio**, navegación por pantallas y estado
persistente. Pantallas actuales:

### POS — "Nueva venta / Punto de venta"
- Catálogo con buscador para armar la venta como en un mostrador.
- Líneas con cantidades y **descuento por ticket**.
- Cliente y **método de pago**: efectivo / tarjeta / transferencia.
- Al cobrar: **descuenta stock automáticamente** y, si fue en efectivo y hay
  caja abierta, **registra el ingreso en la caja**.

### Ventas / Historial
- Listado con paginación, filtros por **estado** (aprobadas, pendientes,
  rechazadas, devueltas), **método** (web vs POS) y **rango de fechas**.
- Captura de datos del pagador (email, nombre, DNI) y **re-chequeo del estado
  real en Mercado Pago**.
- Actualización de ventas **en tiempo real** por Socket.IO (el panel ve cuando
  entra un pago sin recargar).

### Devoluciones
- Flujo "Devolver": marca la venta como devuelta, registra la fecha y, si
  corresponde, **restaura el stock** al catálogo. Si fue efectivo, registra el
  egreso en caja.

### Presupuestos (cotizaciones)
- CRUD completo con **numeración secuencial** (empieza en 1000), estados
  borrador / confirmado / cancelado, búsqueda por cliente/producto/nota y
  paginación.

### Productos, Categorías, Marcas y Ofertas
- CRUD completo de productos con imágenes (Cloudinary), precios, descuentos,
  rating, stock, especificaciones y badge ("Nuevo").
- Categorías y marcas propias de la tienda (desde la base, no fijas).
- **Ajuste de precios masivo por categoría**: porcentaje (subir/bajar ±%),
  redondeo a múltiplo, o fijar un precio.
- **Importar productos** desde un JSON.
- **Ofertas**: estantería de descuentos de la web (marcar producto en oferta
  con precio anterior).

### Stock e inventario
- **Stock y movimientos**: cada venta/compra/ajuste/devolución registra un
  movimiento con stock antes/después y responsable.
- **Ajustes de stock** con motivo (obligatorio).
- **Inventario físico / recuento**: ingresás las unidades contadas y el sistema
  calcula sobras/faltas.
- **Stock mínimo**: alerta de productos "sin stock" o "bajo stock".
- **Compras a proveedores**: registro con numeración propia, actualiza stock y
  el costo de los productos (base para el cálculo de ganancia).
- Los movimientos tienen **retención de datos** (TTL, por defecto 365 días) y
  se limpian solos; las ventas y cierres de caja se conservan.

### Caja (turno + arqueo)
- **Apertura de caja** con fondo inicial y numeración de turno.
- **Movimientos**: ventas en efectivo entran automáticamente; ingresos/egresos
  manuales; devoluciones como egreso.
- **Arqueos** (conteo en mitad del turno) y **cierre de caja** con diferencia
  esperada vs contada (sobra / falta).
- El cierre calcula: `esperado = fondo inicial + entradas − salidas`; la
  diferencia se informa por turno.

### Reportes
- **Ventas**: totales, ticket promedio, serie diaria, desglose por método de
  pago y por origen (web vs POS), y total devuelto.
- **Productos**: unidades y facturación por producto.
- **Ganancias**: ingreso − costo de mercadería, por producto y con margen.
- **Stock**: valor del inventario, costo, ganancia potencial, listado de
  productos bajos y de mayor valor.
- **Clientes**: cantidad de compras, total gastado y ticket promedio por
  cliente (identificado por email o nombre).

### Marketing / Cupones
- Cupones de **descuento porcentual** (1–100%) con código propio, activados y
  desactivados desde el panel. Se validan en el checkout server-side y se ven
  en la web del local.

### Configuración
- **Datos del negocio**: nombre, lema, logo, portada, teléfono, WhatsApp,
  email, dirección, horarios, banda promocional, hero de la home.
- **Envío**: activar/desactivar envío, costo y umbral de envío gratis.
- **Métodos de pago**: activar pago online, métodos (efectivo/tarjeta/
  transferencia) y **credenciales de Mercado Pago de la tienda** (access token,
  public key, secret de webhook).
- **General**: cinta del marquee y tramos de cuotas sin interés.

### Usuarios
- Listado de **negocios** (para superadmin) con métricas y activación/desactivación
  de la venta online por tienda.
- Crear/edit/eliminar usuarios del panel y asignar roles/permisos.

---

## 5. Cómo se cobra y se confirma un pago (el corazón)

1. El cliente arma el carrito y hace checkout con un cupón opcional.
2. El server **recalcula todo** (precios, descuento, envío) — nunca confía en
   lo que mande el navegador — valida stock y crea la **orden pendiente**.
3. Crea una **preferencia en Mercado Pago** con los items, el descuento (como
   línea negativa), el `external_reference` = id de la orden y el tenant en
   `metadata`. Redirige al cliente a MP (init_point).
4. La confirmación llega por **dos vías independientes**:
   - **Webhook firmado** de MP (server-initiated): valida firma HMAC + tienda +
     monto, marca la orden, y si está aprobada **descuesta stock una sola vez**
     (con rollback si algo falla).
   - **Polling** (client-initiated): el "refresh" de la orden re-verifica el
     pago en MP cada 4 s hasta 10 minutos.
5. El panel del local ve el cambio **al instante** por Socket.IO.
6. Estados posibles: `pending`, `in_process`, `approved`, `rejected`,
   `cancelled`, `refunded`, `charged_back`. Los estados finales son de solo
   lectura (no se puede volver atrás a "pendiente").

Nota de diseño: la plataforma **no es un pasarela ni un reembolso**; una vez
aprobada la venta, el seguimiento/entrega lo hace el local por WhatsApp o
teléfono (así lo pide el modelo de negocio).

---

## 6. Estado real del proyecto

### Listo y funcionando
- Tienda pública completa (home, catálogo, búsqueda, detalle, carrito,
  cupones, checkout online y por WhatsApp, estado de pedido).
- Panel de administración completo con las 9 pantallas del punto 4.
- Pagos Mercado Pago por tienda, webhooks firmados, refresh anti-IDOR,
  tracking en vivo.
- Multi-tenancy total, roles y permisos, settings por tienda.
- Suite de **tests automatizados** (webhooks, multi-tenancy, stock, checkout,
  caja, cupones, secuencias, settings) y **CI** (GitHub Actions con MongoDB).
- Cobertura de features: caja, stock/inventario/compras, reportes, cupones,
  presupuestos, importar productos, ajuste de precios masivo.

### Demo / ficticio (IMPORTANTE para presentar con honestidad)
- El catálogo actual, los precios, cupones, datos de contacto y hasta el nombre
  de la tienda de ejemplo son **ficticios**. El dueño confirmó que "por el
  momento nada es real". No vender como logros de clientes reales.
- El **newsletter** aún no guarda correos (es solo visual).
- La imagen de ejemplo es de Unsplash remota.

### Pendiente / en desarrollo (según la visión del proyecto)
- **Variantes** de producto (color/talle): el modelo y endpoints existen en el
  server, pero no tienen pantalla en el panel ni participan del checkout.
- **Módulo de proveedores** como entidad propia (hoy las compras registran al
  proveedor como texto).
- **Historial de cliente / cuentas corrientes** (hoy solo hay reporte de
  clientes).
- **Descuentos** como módulo aparte (hoy solo cupones porcentuales).
- **Importar productos** hoy es vía JSON (no CSV/Excel).
- La home "Inicio" del panel (hoy se usa un resumen/overview básico).

---

## 7. Punto de venta para la presentación en persona

Para cerrar el argumento frente a un dueño de local, usar estos ejes:

1. **"Tu local, en internet, sin pagar desarrolladores."** URL propia,
   branding propio, catálogo cargado por vos, cuotas, envío o retiro.
2. **"La plata forma de venta que ya conocés."** Un POS presencial, caja con
   apertura/arqueo/cierre, stock, compras y reportes — como el sistema al que
   ya está acostumbrado un negocio, pero que además te da la web.
3. **"La plata la cobra tu cuenta, no la plataforma."** Cada negocio conecta su
   Mercado Pago; el dinero entra directo a la caja del local. La plataforma
   solo confirma la venta.
4. **"El WhatsApp como canal de venta."** Si el local no quiere cobrar online,
   el pedido llega por WhatsApp con el detalle armado: el cliente habla con un
   humano del negocio.
5. **"Multi-tienda = negocio para vos."** Si el presentador es quien vende la
   plataforma: una sola instalación puede tener N locales (ej. franquicias,
   varias sucursales, o clientes distintos), cada uno aislado.
6. **"Está probado y testeado."** Hay tests automáticos para pagos, aislamiento
   entre tiendas y stock; los webhooks validados por firma; anti-fraude en las
   órdenes.

---

## 8. Preguntas y respuestas (Q&A esperado)

### Costos / modelo
**¿Cuánto cuesta?** — Los costos son: hosting de la app (Render/Vercel),
MongoDB y los cargos propios de Mercado Pago (que pagan los comercios
habitualmente). No hay licencias obligatorias de pago por usar la plataforma;
es un proyecto propio.

**¿Cada tienda paga su Monotributo/impuestos?** — Cada local maneja su propia
caja y su cuenta de Mercado Pago; la facturación es responsabilidad del local,
la plataforma no opera como cuentapropista de los clientes.

### Pagos
**¿Qué pasa si el cliente paga y el webhook se pierde?** — El sistema tiene dos
vías independientes (webhook + polling de refrescado cada 4 s). Además el panel
puede "re-chequear" el pago contra Mercado Pago manualmente desde el historial.

**¿La plataforma cobra comisión?** — No toca el dinero: la preferencia de pago
se crea con el access token de la tienda, así que el dinero va a la cuenta de
Mercado Pago del local. Los costos son los que aplica MP.

**¿Puedo operar solo con WhatsApp sin Mercado Pago?** — Sí. Si la tienda
desactiva el pago online, el carrito se convierte en un "pedido por WhatsApp"
que llega directo al celular del negocio.

**¿El cliente ve el estado real de su pago?** — Sí, en "estado del pedido" con
actualización en vivo (Socket.IO) y también al volver de Mercado Pago.

### Datos / privacidad / seguridad
**¿Puede otra tienda ver mis datos?** — No. El aislamiento está en el modelo de
datos (`adminId` en cada documento), en el servidor y cubierto por tests de
apertura/cierre.

**¿Dónde se guardan mi access token y mis datos?** — En la base de datos, por
tienda, nunca en el navegador ni en el código. El frontend solo recibe si el
pago online está habilitado, jamás las claves.

**¿Qué pasa con la información de mis clientes?** — Está autolimitada a lo
necesario para la venta (nombre, email, DNI, dirección si aplica). Las
preguntas de RGPD/Ley de Protección de Datos argentina se responden según la
estrategia del operador de la plataforma.

### Operación diaria
**¿Puedo vender en el mostrador y por la web al mismo tiempo?** — Sí. El POS
vende en persona (y toca la caja física), la web vende online y ambos bajan el
stock en tiempo real. El origen de cada venta (`web`/`pos`) queda registrado.

**¿Cómo sé cuánta plata hay en la caja?** — Abrís el turno, las ventas en
efectivo entran solas, y al cierre el sistema te dice el esperado vs. lo
contado (sobra/falta). También se pueden hacer arqueos a mitad de turno.

**¿Y si devuelvo una venta?** — La marcas como devuelta, se restaura el stock y
( si era efectivo) sale el egreso de caja.

**¿Cómo manejo el stock?** — Cada movimiento queda registrado con stock
anterior/posterior; ajustes con motivo; recuento físico con sobras/faltas;
stock mínimo para alertar "quedan pocas"; registro de compras a proveedores.

**¿Saco reportes?** — Sí: ventas (por día/método/origen), productos
(unidades/facturación), ganancias (por producto y margen), stock (valor y
ganancia potencial) y clientes (gasto total, frecuencia, ticket promedio).

**¿Puedo dar descuentos?** — Sí, con cupones porcentuales (en la web) y
descuento por ticket en el POS. El ajuste de precios masivo permite
reeditar precios de toda una categoría rápido.

### Técnica / soporte
**¿En qué está hecho?** — React para la interfaz, Node/Express para la API,
MongoDB para datos, Mercado Pago para cobros. No requiere que el local maneje
ninguna de estas cosas.

**¿Puedo cambiar el logo, colores, textos, la portada?** — Sí, desde
Configuración, sin tocar código.

**¿Cómo se agrega otra sucursal o negocio?** — El superadmin crea un nuevo
admin de tienda con su slug; esa tienda arranca de cero, aislada.

**¿Qué pasa si no arranca? / soporte** — Es un proyecto propio, los puntos de
soporte se definen con quien lo opera. Está todo automatizado: tests, CI y
deploy.

---

## 9. Glosario rápido (para que la IA hable el mismo idioma)

- **Tenant / adminId**: cada tienda es un "tenant"; `adminId` es el dueño de
  cada documento en la base.
- **Slug**: el identificador de la tienda en la URL (`/u/mi-negocio`).
- **refresh_token**: clave única por orden que impide que otra persona consulte
  una orden ajena.
- **init_point**: la URL de Mercado Pago a la que se manda al cliente a pagar.
- **Webhook**: la llamada automática que hace Mercado Pago al server cuando un
  pago cambia de estado; se valida por firma.
- **Arqueo**: conteo de la caja física en mitad del turno (sin cerrar).
- **COGS**: costo de mercadería vendida (base del cálculo de ganancia).
- **POS**: punto de venta presencial.
- **TTL**: vencimiento automático de datos temporales (movimientos de stock y
  caja se borran solos a los 365 días por defecto).