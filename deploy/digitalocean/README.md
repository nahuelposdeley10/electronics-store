# Producción en DigitalOcean

Despliegue verificado el 3 de octubre de 2026.

- Sitio: https://tiendabnp.com
- Panel: https://tiendabnp.com/admin
- Tiendas existentes: https://tiendabnp.com/u/local y https://tiendabnp.com/u/mi-tienda
- SSH desde esta PC: `ssh digitalocean` (usuario `appuser`).
- Proyecto: `/var/www/electronics-store`.
- Runtime aislado: Node 22.23.3 en `/opt/electronics-runtime/node_modules/node/bin/node`.
- Backend: `127.0.0.1:3000`; Nginx expone solamente HTTP/HTTPS.
- Servicio: `electronics-store-user.service`, ejecutado como servicio de usuario de `appuser`.
- El proceso anterior de PM2 quedó detenido y su servicio de inicio deshabilitado.

## Operación

```bash
systemctl --user status electronics-store-user.service
systemctl --user restart electronics-store-user.service
journalctl --user -u electronics-store-user.service -n 100 --no-pager
curl --fail https://tiendabnp.com/api/health
sudo nginx -t
```

El servicio se opera con `systemctl --user` como `appuser`; no requiere sudo.

## HTTPS

Certificado público de Let's Encrypt para la IP, perfil `shortlived`. Primera expiración: 8 de octubre de 2026. La renovación se comprueba dos veces al día con `electronics-cert-renew.timer`; al renovar se valida y recarga Nginx. Se verificó `certbot renew --dry-run --run-deploy-hooks` con éxito.

```bash
systemctl list-timers electronics-cert-renew.timer
sudo journalctl -u electronics-cert-renew.service --no-pager
```

El puerto 80 debe seguir abierto para validar renovaciones. El tráfico normal HTTP redirige a HTTPS. Al comprar un dominio habrá que apuntarlo a esta IP, emitir su certificado y actualizar Nginx, CLIENT_URL, SERVER_URL y CORS_ORIGINS; no ejecutar otra vez los scripts iniciales sin adaptarlos.

## Copias de seguridad

`electronics-backup.timer` ejecuta una copia diaria a las 05:00 UTC con hasta 15 minutos de variación. Las copias MongoDB comprimidas se guardan con permisos privados en `/var/backups/electronics-store` y se verifica su lectura con `mongorestore --dryRun`. Esto NO equivale a una restauración completa ensayada ni a un snapshot consistente entre colecciones mientras hay escrituras concurrentes.

La copia inicial `electronics-store-2026-10-01T19-13-28-226Z.archive.gz` también está en esta PC, en `C:/Users/nahue/.codex/backups/electronics-store/`, con SHA256 verificado. Contiene datos privados: no subirla al repositorio ni compartirla públicamente.

Las copias diarias posteriores quedan en el mismo servidor. Falta conectar almacenamiento externo automático. No se configuró borrado automático; revisar espacio y definir retención cuando se conecte ese almacenamiento. Las imágenes siguen almacenadas en Cloudinary y no están incluidas en el archivo de MongoDB.

Se conservaron copias previas de Nginx, configuración y frontend en `/root/electronics-deploy-backup-*`, y una copia del código previo en `/root/electronics-source-*.tar.gz`.

## Validaciones realizadas

- Lint y build correctos; 21 pruebas automáticas aprobadas.
- Auditoría npm sin vulnerabilidades conocidas para la instalación desplegada.
- API, catálogo de dos tiendas, rechazo de administración sin sesión, aislamiento de tienda inexistente y handshake Socket.IO correctos por HTTPS.
- Pantalla de login y tienda `/u/local` verificadas en Chrome.
- Cloudinary autenticó correctamente mediante ping.
- Reinicio del servicio comprobado; reinicio completo del Droplet no ensayado.
- No se hizo una compra real ni se probó el login con contraseña: no había credenciales de usuario disponibles para esa prueba.

## Pendientes para cobrar y lanzar comercialmente

- Las credenciales de Mercado Pago se configuran por tienda desde el panel; no se deben subir al repositorio.
- La suscripción comercial usa Mercado Pago global de Tienda BNP y webhook separado para crear nuevas cuentas.
- Resend está verificado para `tiendabnp.com` y el remitente de activación es `accesos@tiendabnp.com`.
- Revisar datos de contacto, políticas, stock y precios: hay productos a $1 y textos/contactos de ejemplo. No se modificaron datos comerciales sin instrucciones del dueño.
- La tienda global `/` no tiene productos; cada comercio tiene su propia URL `/u/<slug>`.
- Elegir dominio y tienda a lanzar, completar copias externas y ensayar restauración antes de operar a escala.

## Archivos de esta carpeta

Los scripts `bootstrap.sh`, `certificate.sh`, `activate.sh` e `install-backup.sh` documentan la instalación inicial de este Droplet; NO son un pipeline idempotente para otros servidores. Revisarlos antes de reutilizarlos. `configure-env.cjs` y `send-env.cjs` configuraron las URLs y copiaron solamente las credenciales de Cloudinary existentes por SSH, sin imprimir secretos. El JWT débil previo fue reemplazado; las sesiones anteriores deben iniciar sesión otra vez.

El release desplegado se conserva en `/home/appuser/deploy-production/release.tar.gz` y en `C:/Users/nahue/.codex/electronics-production-20261001.tar.gz`; incluye el lockfile exacto usado con `npm ci --omit=dev`. Los lockfiles siguen excluidos de Git según la configuración actual del repositorio.

Las correcciones React eliminaron estado sin uso y sincronización redundante en un efecto siguiendo la guía de buenas prácticas, manteniendo la UI. `server/index.js` permite seleccionar la interfaz mediante `HOST` para mantener el backend privado detrás de Nginx.
