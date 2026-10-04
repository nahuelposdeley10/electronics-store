# SEO paso 4: HTML inicial de /home

Validación local realizada el 3 de octubre de 2026. Sin commit, push ni despliegue.

## Resultado

- La compilación genera `dist/home.html` (aproximadamente 41 kB sin comprimir)
  usando `CompanyHome`, sus componentes y sus datos comerciales reales.
- La primera respuesta incluye portada, funciones, planes, respuestas FAQ,
  contacto, canonical, metadatos y JSON-LD. También enlaza el CSS de la landing.
- React hidrata el contenido existente. Se mantiene la separación del panel,
  catálogo y proveedores de cada comercio. El prerender no consulta la API ni
  la base de datos.
- El canonical comercial dejó de estar en el HTML compartido con las tiendas:
  ahora se genera únicamente en el documento de la landing y su acceso `/planes`.

## Validación de compilación y revisión manual

`npm run lint` y `npm run build` finalizaron correctamente. Se conserva la
advertencia previa de tamaño del paquete del Dashboard.

Durante la revisión manual se comprobó:

- HTML comercial completo en `/home`, `/home/`, `/planes` y URLs con parámetros.
- Precios visibles coherentes con el JSON-LD y la fuente comercial.
- Un único título y canonical, además de hojas de estilo accesibles por HTTP.
- Ausencia del prerender y canonical comercial en `/admin`, activación,
  `/u/mi-tienda`, producto, carrito y `/`.
- Respuestas de health, robots, sitemap y solicitud HEAD a `/home`.
- Conservación de contenido literal al insertar el HTML y fallo explícito
  si cambia la plantilla y ya no se puede encontrar la raíz de React.

## Chrome

- Desarrollo en `localhost:5173` y build servido por Vite Preview en el puerto
  temporal 4175.
- Con JavaScript desactivado temporalmente en la pestaña, la portada mantuvo
  su diseño y el documento contenía los tres precios y el JSON-LD.
- JavaScript reactivado y página recargada: los tres botones de suscripción
  abrieron el formulario del plan y precio correctos. No se enviaron datos ni
  se inició ningún pago.
- Pestañas de ventas e inventario, apertura de FAQ, menú móvil abierto/cerrado
  y acceso `/planes` → `/home#planes` verificados.
- Viewport móvil de 390 px: sin desbordamiento horizontal. Se restauró el
  tamaño original al finalizar. Consola sin errores ni advertencias durante
  estas comprobaciones.
- Captura: [Landing local](screenshots/company-home-prerender-desktop.png).

## Publicación pendiente

Se debe compilar y publicar el `dist/` completo, incluido `home.html`. Un pull
y reinicio sin reconstruir los archivos estáticos no publica este cambio.
La configuración de Express y las reescrituras de Vercel están preparadas en
el repositorio; en esta etapa no se verificó ni modificó producción. La
indexación real por Google debe verificarse después en Search Console.
