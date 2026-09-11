# Visión: Dashboard completo de administración

Objetivo a largo plazo del proyecto. La tienda actual (web + admin de productos/ventas) va evolucionando hacia este panel. Cada módulo de los que existen hoy o se agreguen debe encajar en esta estructura.

## Ventas

- Nueva venta / POS
- Historial de ventas
- Devoluciones
- Presupuestos

## Productos

- Productos
- Categorías
- Marcas
- Variantes
- Precios
- Importar productos

## Inventario

- Stock
- Movimientos
- Ajustes
- Stock mínimo
- Inventario físico

## Compras

- Nueva compra
- Historial
- Proveedores

## Clientes

- Clientes
- Historial de compras
- Créditos / cuentas corrientes

## Caja

- Caja actual
- Movimientos
- Apertura / cierre
- Arqueos

## Reportes

- Ventas
- Productos
- Ganancias
- Stock
- Clientes

## Promociones

- Descuentos
- Cupones

## Configuración

- Usuarios
- Roles y permisos
- Métodos de pago
- Datos del negocio
- Configuración general

## Estado actual (septiembre 2026)

- Inicio: no existe aún.
- Ventas: existe "Historial de ventas" en `Dashboard.jsx` (SalesScreen), con captura de datos del pagador (email, nombre, DNI).
- Productos: existen "Productos" (CRUD con buscador y paginación server-side), "Categorías", "Marcas", "Variantes", "Precios" (edición inline + ajuste masivo) e "Importar productos" (JSON). Todo bajo `server/routes/catalog-admin.js` y el submenú de Productos en el Dashboard.
- Configuración: existe "Usuarios" (roles superadmin/admin).
- Inventario, Compras, Clientes, Caja, Reportes, Promociones: pendientes.