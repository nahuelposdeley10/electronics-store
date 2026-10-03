# Producto — Tienda BNP

## Resumen

Tienda BNP es una plataforma SaaS multi-tenant para comercios pequeños y
medianos. Cada negocio obtiene una tienda online pública y un panel privado
para administrar catálogo, ventas presenciales, stock, caja, compras,
reportes, promociones y cobros.

La propuesta combina e-commerce y gestión del local en una sola herramienta.
Cada comercio mantiene su marca, URL, catálogo y cuenta de Mercado Pago. La
plataforma no retiene el dinero de las ventas.

## Usuarios

### Comercios clientes

Dueños y equipos de locales que necesitan vender por internet y ordenar la
operación diaria sin depender de un desarrollador.

### Clientes de cada tienda

Personas que navegan el catálogo, agregan productos al carrito, aplican cupones
y compran con Mercado Pago o envían el pedido por WhatsApp si el comercio no
tiene habilitado el pago online.

### Operador de la plataforma

Superadmin que crea y administra negocios, asigna planes, revisa suscripciones
y puede asistir a una tienda seleccionada sin mezclar sus datos con otros
comercios.

## Propuesta de valor

- Tienda online propia con marca, catálogo, precios, ofertas y URL del negocio.
- POS para ventas presenciales conectado al mismo stock de la tienda web.
- Control de inventario, movimientos, compras, recuentos y stock mínimo.
- Caja con apertura, arqueos, movimientos y cierre.
- Reportes de ventas, productos, ganancias, stock y clientes.
- Cobros directos mediante la cuenta de Mercado Pago de cada comercio.
- WhatsApp como canal alternativo de venta.
- Usuarios con roles y permisos para distribuir tareas dentro del negocio.
- Arquitectura multi-tenant con aislamiento por comercio.

## Oferta comercial actual

Los planes comerciales se presentan en `/home` y se contratan desde la landing
con Mercado Pago. Los importes son mensuales y están expresados en pesos
argentinos:

| Plan | Precio mensual | Alcance principal |
| --- | ---: | --- |
| Inicial | $49.900 | Tienda, catálogo, stock básico y pedidos por WhatsApp |
| Profesional | $89.900 | Inicial + Mercado Pago, POS, caja y reportes |
| Negocio | $149.900 | Profesional + equipo, permisos, compras e inventario avanzado |

La configuración inicial se presenta por separado, desde $250.000. Los cargos
de Mercado Pago son independientes y los paga cada comercio según las
condiciones del procesador.

El alta comercial funciona así:

1. La persona elige un plan y completa sus datos en `/home`.
2. Mercado Pago confirma la suscripción mediante un webhook firmado.
3. El sistema envía un enlace de activación al email informado.
4. El cliente crea su contraseña desde `/activar-cuenta`.
5. Se crea el usuario administrador, el negocio y la suscripción con el plan
   contratado.

El enlace de activación es de un solo uso y tiene vencimiento. La contraseña no
es temporal: la define el cliente durante la activación y luego puede cambiarla
desde su panel. El contacto comercial de la landing es +54 9 11 7673-1388.

## Superficies del producto

### Landing comercial — `/home`

Presenta la propuesta de Tienda BNP, funcionalidades, vistas representativas,
planes, preguntas frecuentes y el flujo de contratación. Los ejemplos de la
landing son datos ficticios y no crean una tienda ni una cuenta operativa.

### Activación — `/activar-cuenta`

Permite que un cliente confirmado por Mercado Pago cree su contraseña y
complete el alta de su cuenta de administración.

### Tienda pública — `/u/<slug>`

Cada comercio tiene su propio catálogo, carrito, checkout, información de
contacto, envíos, cuotas y métodos de pago. La tienda pública no expone las
credenciales privadas del negocio.

### Panel — `/admin`

El panel cambia sus accesos según el rol, los permisos y el plan del negocio.
Incluye puesta en marcha para administradores, configuración del negocio,
catálogo, ventas, stock, caja, reportes, promociones, usuarios y suscripción.

## Capacidades actuales

### Catálogo y tienda

- Productos, categorías, marcas, ofertas y fotos.
- Creación de marca o categoría desde el alta de un producto cuando todavía no
  existe.
- Importación de productos desde JSON y herramientas de ajuste de precios.
- Búsqueda, filtros, detalle, relacionados, carrito y cupones.
- Validación server-side de precio, descuento y stock.
- Protección contra agregar al carrito productos sin stock.

### Ventas y cobros

- POS con descuentos por ticket y medios efectivo, tarjeta y transferencia.
- Checkout online con Mercado Pago por comercio.
- Pedido alternativo por WhatsApp.
- Webhooks firmados, verificación de monto y tenant, y actualización del
  estado del pedido en vivo.
- Refresh de órdenes con token único anti-IDOR.
- Historial, re-chequeo de pagos, devoluciones y presupuestos.

### Inventario y operación

- Movimientos de stock con motivo y responsable.
- Ajustes, inventario físico, sobras, faltas y stock mínimo.
- Compras a proveedores y actualización del costo del producto.
- Apertura, arqueo, movimientos y cierre de caja.
- Reportes de ventas, productos, ganancias, stock y clientes.
- Cupones de descuento porcentual.

### Equipo y puesta en marcha

- Roles `superadmin`, `admin` y `operator`.
- Permisos por módulo y operación.
- El administrador puede cambiar su contraseña y la del operador según sus
  permisos.
- Onboarding persistente por negocio para configurar datos, catálogo, cobros,
  entregas y revisión final.
- El onboarding conserva las credenciales existentes y nunca muestra secretos
  completos en el frontend.

### Emails comerciales

La activación de cuentas usa Resend. El dominio verificado es `tiendabnp.com` y
el remitente configurado es `Tienda BNP <accesos@tiendabnp.com>`. Las respuestas
se dirigen a `tiendabnp@gmail.com`. Las claves permanecen en variables de
entorno y no se versionan.

## Límites y funcionalidades no anunciadas

No presentar como disponibles, salvo que se implementen y validen
explícitamente:

- Facturación ARCA.
- Logística integrada.
- Cuentas corrientes o crédito de clientes.
- Variantes en el checkout.
- Dominio personalizado automatizado.
- Newsletter funcional.
- Testimonios, métricas comerciales o clientes ficticios presentados como
  reales.

El catálogo y los datos de la tienda de ejemplo son material de demostración.

## Arquitectura y seguridad

- Frontend React 19 + Vite.
- Backend Node.js + Express + Socket.IO.
- MongoDB + Mongoose.
- Multi-tenancy por `adminId` y `x-tenant-slug`.
- JWT, bcrypt, roles y permisos.
- Mercado Pago con credenciales por tienda guardadas en settings.
- Firma HMAC de webhooks, validación de tenant y monto.
- Cloudinary para imágenes.
- Render y Vercel documentados como targets; producción actual en DigitalOcean.

## Criterios de producto

1. El comercio debe poder operar catálogo, venta y stock desde un mismo panel.
2. La información y el dinero de un negocio nunca deben cruzarse con otro.
3. El checkout debe recalcular precios y disponibilidad en el servidor.
4. La landing debe distinguir claramente ejemplos de funcionalidades reales.
5. Los planes comerciales deben mantenerse centralizados para evitar diferencias
   entre la landing, el backend y los mensajes de contacto.
