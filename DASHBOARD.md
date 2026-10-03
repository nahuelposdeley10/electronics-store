# Panel de administración

El panel vive en `/admin` y se adapta al rol, permisos y plan del negocio. La
navegación se conserva en `sessionStorage` para que el usuario pueda retomar la
última pantalla después de recargar.

## Módulos disponibles

### Ventas

- Nueva venta / POS.
- Historial de ventas.
- Devoluciones.
- Presupuestos.

### Productos

- Productos.
- Categorías.
- Marcas.
- Ofertas.
- Importación JSON.
- Ajuste masivo de precios por categoría.

Al crear o editar un producto, el administrador puede crear una marca o
categoría sin salir de la pantalla si todavía no existe.

### Inventario

- Stock y movimientos.
- Ajustes con motivo.
- Stock mínimo.
- Inventario físico con sobras y faltas.
- Compras y actualización de costo.

### Caja

- Apertura de turno.
- Movimientos de caja.
- Arqueos.
- Cierre con diferencia entre monto esperado y contado.

### Reportes

- Ventas por fecha, método y origen.
- Productos y facturación.
- Ganancias y margen.
- Valor y estado del stock.
- Clientes y ticket promedio.

### Marketing

- Cupones porcentuales.
- Activación y desactivación de códigos.

### Configuración

- Datos y marca del negocio.
- Envíos, cuotas y métodos de pago.
- Credenciales de Mercado Pago por tienda.
- Usuarios, roles y permisos.
- Cambio de contraseña del administrador y operadores autorizados.
- Estado de suscripción y plan.

### Puesta en marcha

El onboarding del administrador guía la configuración de datos del negocio,
URL, catálogo, stock, canal de cobro, entregas y revisión final. Se guarda por
negocio, se puede pausar y retomar, y no elimina credenciales existentes.

## Roles

- `superadmin`: propietario de la plataforma. Puede crear negocios, asignar
  planes y asistir a un negocio seleccionado.
- `admin`: administra exclusivamente su propio negocio y las funciones
  habilitadas por sus permisos y plan.
- `operator`: trabaja con las pantallas autorizadas por el administrador; no
  configura el negocio ni gestiona credenciales.

## Principios de aislamiento

Cada documento de negocio lleva `adminId`. El backend resuelve el tenant desde
`x-tenant-slug` y aplica el filtro en cada operación. Un administrador nunca
puede leer ni modificar los datos de otro negocio.

## Funcionalidades que no deben anunciarse como disponibles

Variantes de producto en checkout, facturación ARCA, logística integrada,
cuentas corrientes, dominio automatizado y newsletter funcional siguen fuera
del alcance comercial validado.

## Ubicación del código

- Vista: `src/views/Dashboard/`.
- Pantallas: `src/views/Dashboard/components/<screen>/`.
- Helpers compartidos: `src/views/Dashboard/components/common/`.
- Rutas API: `server/routes/`.
- Modelos: `server/models/`.
- Autorización: `server/middleware/auth.js` y permisos del usuario.
