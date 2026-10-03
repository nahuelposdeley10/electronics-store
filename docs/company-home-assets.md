# Recursos visuales de Tienda BNP /home

## Dirección y referencias

- [Video de referencia: Crea Webs Interactivas con IA](https://www.youtube.com/watch?v=m9zBazpBSg4), Rodrigo Olivares. Se tomó el protagonismo de un objeto y su respuesta al cursor; no se copió la escena del personaje, el texto ni su estética oscura.
- [Exploración de composición en Pinterest](https://ar.pinterest.com/search/pins/?q=ecommerce%20saas%20website%203d%20light): dispositivos y vidrieras 3D sobre fondos claros. No se descargaron ni incorporaron pines de terceros.
- Paleta aprobada: blanco frío #F5F7FC, azul profundo #14243E, azul principal #315CF5, celeste #DCE8FF, verde suave #CEF3DF y gris #617089.
- Sora para títulos y Manrope para lectura, servidas por Google Fonts. Las fuentes comerciales se limitan a `.bnp-home`.

## Ilustración original

Generada para este proyecto con la herramienta integrada de generación de imágenes (imagegen), sin CLI ni claves API del usuario. No es una captura real del producto.

Archivos en `public/images/company/`:

- `storefront-original.png`: original 1280 × 1280 con transparencia; se conserva como fuente, no se carga en la página.
- `storefront-480.webp`: 32.176 bytes, versión pequeña.
- `storefront-960.webp`: 83.890 bytes, versión intermedia.
- `storefront-1280.webp`: 119.748 bytes, versión grande.
- `storefront-social.jpg`: 1200 × 630, 51.050 bytes, previsualización social sobre celeste.

Los WebP conservan alfa y se ofrecen con `srcSet`/`sizes`, dimensiones explícitas y prioridad alta en portada. Se optimizaron con Sharp del runtime local, sin agregar dependencias al proyecto ni modificar lockfiles. Las ilustraciones de las vistas de ejemplo son SVG/HTML locales, no datos de una tienda real. No hay imágenes raster fuera de la portada que requieran carga diferida.

### Prompt utilizado (herramienta integrada)

```text
Use case: stylized-concept.
Asset type: original transparent 3D hero illustration for Tienda BNP, an Argentine ecommerce and shop-management software landing page.
Primary request: a miniature digital storefront with an elegant blue-and-white striped awning, paired with a large upright smartphone showing a clean 2x2 product catalogue. The phone is the focal point, turned slightly in three-quarter perspective. The shop has a minimal glass display and a rounded architectural frame, not a shopping bag. Simple generic catalogue products like a sneaker, headphones, a small lamp and a plant. A small mint checkmark tile and one modest parcel can support the commerce idea.
Style: sophisticated editorial 3D, matte ceramic and frosted glass, soft realistic studio lighting, crafted premium software brand, not childish, no plastic gloss.
Palette: cold white #F5F7FC, cobalt #315CF5, navy #14243E, pale blue #DCE8FF, one soft mint #CEF3DF accent.
Composition: a single compact centered scene, square format, full objects visible, generous transparent margins, soft ground contact shadow, designed to sit on a pale-blue web canvas. Camera nearly frontal with a small isometric angle so the phone catalogue is readable visually.
Constraints: genuinely transparent background; no text, no letters, no brand logos, no watermarks, no shopping bags, no people, no chart or numerical claims. The UI uses quiet placeholder lines only. Original composition, not a copy of a reference.
```

## Movimiento

La escena usa transformaciones y `requestAnimationFrame` con interpolación independiente de la tasa de refresco, sin renders de React por cada evento. Máximo 4° en X y 6° en Y; imagen, iluminación y etiqueta se desplazan con distinta profundidad. Vuelve a cero al salir o cancelar el puntero y deja de solicitar frames al alcanzar el destino. No sigue entradas táctiles ni preferencias de movimiento reducido. La entrada del título y la escena es finita (hasta 1,7 s); la retícula y la luz son CSS, sin nuevas imágenes. No se usan reproductores, modelos 3D pesados ni animaciones perpetuas.

La entrada de las secciones usa IntersectionObserver y Web Animations, sin ocultar el contenido base. Los efectos se cancelan al cambiar a movimiento reducido o enfocar un control dentro de una sección animada. El progreso de lectura se calcula con un listener pasivo y un máximo de una actualización por frame.

## Estado de publicación

Implementación para revisión local. Estos archivos no implican un commit, push ni despliegue. La imagen social será accesible públicamente cuando el usuario autorice y realice el despliegue.
