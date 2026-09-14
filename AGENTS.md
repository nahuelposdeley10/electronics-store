# Convenciones del proyecto

## Arquitectura de componentes y estilos (frontend)

Esta es la arquitectura obligatoria del frontend. Cualquier cambio de UI o
código debe respetarla.

- **Solo `.jsx`** (no TypeScript, no `.ts`/`.tsx`).
- **Componentes globales** (usados en múltiples views): `src/components/<Nombre>/index.jsx` + `styles.css`.
- **Views**: `src/views/<Vista>/index.jsx` + `styles.css`.
- **Sub-componentes exclusivos de una view**: `src/views/<Vista>/components/<Nombre>/index.jsx` + `styles.css`.
  No crear un componente global salvo que se use en más de una view.
- **Importación limpia**: importar el folder, nunca el archivo interno.
  - Global: `import Button from '@/components/Button'` (nunca `@/components/Button/index.jsx`).
  - Sub-componente de la misma view: `import GallerySection from './components/GallerySection'`.
- **Alias de módulos**: `@` → `src` (configurado en `vite.config.js`). Módulos JS:
  `@/lib/*`, `@/data/*`, `@/context/*`, etc.
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
  bundler de este repo.
- Recordar la profundidad: p. ej. las pantallas del panel viven en
  `src/views/Dashboard/components/<screen>/index.jsx`, por lo que el archivo
  compartido de constantes se importa como `'../../consts.js'` y los helpers
  compartidos del panel como `'../common'` (ver `Dashboard/components/common/`).
- Vista de ejemplo del patrón (Documentación viva):
  - `src/components/Stars/` (global, extraído de un duplicado ProductCard/ProductDetail)
  - `src/views/Home/components/GallerySection/` y `src/views/ProductDetail/components/RelatedProducts/` (exclusivos)
  - `src/views/Dashboard/components/<screen>/` (pantallas del panel con sus estilos)

## Contexto del servidor

- Backend Express + MongoDB con multi-tenancy por `adminId`/slug. No utilizar
  fuera de esta estructura.
- En producción: `NODE_ENV=production`, `CORS_ORIGINS` y `JWT_SECRET` son
  obligatorios (el server no arranca sin ellos).
- Las migraciones/features de negocio en `server/` suelen venir de otra sesión
  de trabajo; antes de asumir que algo está terminado, verificar con `npm test`
  y no sobrescribir archivos ajenos sin confirmar.