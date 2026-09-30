# Cloudinary → Cloudflare R2

Estado inicial: Cloudinary sigue activo. Preparar R2 y migrar antes de activar nuevas subidas.

## Configuración

1. En https://dash.cloudflare.com/ abrir R2 Object Storage, activar la facturación y crear un bucket Standard.
2. En la configuración del bucket conectar un dominio público propio (por ejemplo `imagenes.tudominio.com`). El endpoint S3 no es la URL pública. `r2.dev` es para desarrollo y tiene límites; usar dominio propio en producción.
3. Crear credenciales S3 de R2 con Object Read & Write restringidas a ese bucket.
4. Configurar en `.env` y después en Render/Vercel: `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_PUBLIC_URL`. No usar prefijo `VITE_`: son variables del servidor.
5. Mantener `IMAGE_STORAGE_PROVIDER=cloudinary` hasta terminar la migración.

Precios oficiales: https://developers.cloudflare.com/r2/pricing/
Dominio público: https://developers.cloudflare.com/r2/buckets/public-buckets/
Credenciales: https://developers.cloudflare.com/r2/api/tokens/

## Migración de las imágenes utilizadas por la web

Ejecutar desde la raíz del proyecto, en una única terminal. Usa la misma base `electronics-store` que el servidor y `MONGODB_URI` del entorno. Incluye todas las tiendas, con claves separadas por `adminId`.

```sh
node server/migrate-images-r2.js inventory --all-tenants
node server/migrate-images-r2.js copy --all-tenants
node server/migrate-images-r2.js apply --all-tenants
```

- `inventory`: lee productos (portada y galería) y settings (logos, portadas, fondos, gaming y otros valores anidados). Solo selecciona URLs HTTPS de `res.cloudinary.com/<CLOUDINARY_CLOUD_NAME>/image/upload/`. No inventaría archivos de Cloudinary que la web no usa, recursos privados, videos ni dominios personalizados. Revisar aparte esos casos antes de cerrar Cloudinary.
- Guarda `.r2-migration/manifest.json`, excluido de Git, con URLs anteriores/nuevas y referencias, sin copiar credenciales de settings. Conservar una copia segura para rollback. No sobrescribe un inventario existente.
- `copy`: descarga los archivos actuales sin modificar sus transformaciones, los sube y compara SHA-256 con la descarga desde el dominio público de R2. No cambia MongoDB. Se puede repetir tras un fallo: las claves son deterministas y no se duplican objetos. Límite de 25 MB por imagen, PNG/JPG/WEBP/GIF.
- `apply`: verifica todas las copias antes del primer cambio y reemplaza cada referencia solo si conserva su URL anterior y pertenece a la misma tienda. Puede repetirse. Un conflicto detiene la ejecución; cambios anteriores pueden haberse aplicado. Resolver el conflicto o usar rollback.

Pausar ediciones de imágenes durante el inventario/copia/aplicación para no dejar referencias nuevas fuera del inventario. No correr dos migraciones simultáneamente. Respaldar MongoDB antes de aplicar.

Después de `apply`, revisar productos y personalización en cada tienda. Cambiar `IMAGE_STORAGE_PROVIDER=r2` en el deploy y reiniciar/desplegar el servidor. Las nuevas cargas validan el formato real, mantienen las URLs como antes y usan carpetas separadas por tienda. El dominio público necesita permitir lectura anónima; no se requieren permisos de escritura desde el navegador.

## Volver atrás

Restablecer `IMAGE_STORAGE_PROVIDER=cloudinary` y ejecutar:

```sh
node server/migrate-images-r2.js rollback --all-tenants
```

Restaura las referencias inventariadas sin sobrescribir ediciones concurrentes. Las imágenes nuevas subidas a R2 después de activar el proveedor siguen en R2. Ningún comando elimina originales ni objetos copiados. Mantener ambos servicios hasta verificar la transición.

## Validación

```sh
node --test server/tests/image-migration.test.js
npm run lint
npm test
npm run build
```

Los tests generales requieren MongoDB accesible y usan bases aisladas. La verificación de transferencia real requiere el bucket, las credenciales y el dominio público configurados.
