# Propuestas de logo — Tienda BNP

Cuatro conceptos para elegir la identidad de la plataforma, creados con el generador de imágenes integrado en Codex (sin CLI ni API propia).

Se tomó la paleta de `src/views/CompanyHome/styles.css`: azul `#315CF5`, azul profundo `#14243E` y fondo blanco. Las cuatro imágenes siguientes son exploraciones PNG sobre fondo blanco; no son archivos vectoriales finales.

## Selección e integración

Se seleccionó la propuesta **1. Monograma**. Se prepararon sus variantes finales con fondo transparente y se integraron en la aplicación:

- `public/images/brand/tienda-bnp-logo.png`: logo horizontal para navegación, activación de cuenta y pie de página.
- `public/images/brand/tienda-bnp-icon.png`: monograma para favicon y usos compactos.
- `src/components/BrandLogo/`: componente reutilizable para mantener una única marca en las distintas vistas.

La identidad quedó aplicada en `/home`, `/activar-cuenta`, el acceso de `/admin` y el favicon del sitio. Los archivos finales se generaron a partir de la propuesta elegida con el generador de imágenes integrado en Codex.

## Archivos

- [1. Monograma](01-monograma.png)
- [2. Vidriera digital](02-vidriera-digital.png)
- [3. Tipografico](03-tipografico.png)
- [4. Conexion](04-conexion.png)

## Prompts usados

### 1. Monograma

```text
Use case: logo-brand. Asset type: professional logo exploration for the Argentine SaaS company Tienda BNP, selling ecommerce storefronts and inventory, POS and business management software to small retailers.
Create one original sophisticated brand logo on a pure white background, landscape 3:2 presentation. Main idea: compact memorable geometric lowercase b-inspired monogram built from a bold upright and two disciplined rounded geometric counters, one counter opening like a digital doorway. The compact silhouette must be legible as a favicon, not a generic banking emblem. To its right, a beautifully kerned wordmark reading exactly "Tienda BNP", in a premium geometric sans serif similar in character to Sora, with BNP subtly heavier. Two flat colors only: vivid cobalt #315CF5 for the mark, deep navy #14243E for the name. Center the single horizontal logo with generous but not excessive whitespace; occupy about 75% of canvas width. Precise optical alignment and exceptionally crisp vector-like edges. No other text, no label, no slogan, no 3D, no shadow, no gradient, no mockup, no shopping cart, no bank imagery, no existing company logos. This is an original clean logo concept, not a branding collage.
```

### 2. Vidriera digital

```text
Use case: logo-brand. Asset type: professional logo exploration for Tienda BNP, an Argentine software platform that gives small shops an ecommerce storefront and business management panel.
Generate one original polished identity, single horizontal logo on a pure white landscape 3:2 canvas. Design a highly reduced geometric digital storefront symbol: a solid cobalt frame with a distinctive roof/awning made of exactly three bold rounded tabs, integrating an open door cut from negative space. Suggest a digital window as well as a shop; sophisticated and sturdy, not cartoon, no fine decorative lines. The symbol must remain recognizable at 24 pixels. To its right place exactly "Tienda BNP" in a confident clean geometric sans serif wordmark, visually balanced, carefully spaced. Flat colors: mark #315CF5; lettering #14243E; white cutouts. Very restrained, contemporary independent software brand. Center with whitespace, logo occupying about 75% width. No other text, slogans, numbers or labels. No 3D, shadows, gradients, mockups, clipart shopping bags or carts. Do not imitate a known commerce brand. Sharp vector-style graphic edges.
```

### 3. Tipografico

```text
Use case: logo-brand. Asset type: premium typographic logo proposal for Tienda BNP, an Argentine ecommerce and retail management SaaS.
Create a single centered pure wordmark on a pure white landscape 3:2 canvas, reading exactly "tienda bnp." in lowercase. No separate symbol. Custom-designed clean geometric typography with the warmth of a modern humanist sans serif: wide confident lowercase b n p, coordinated circular counters in b and p, a carefully designed arch in n, modest softened corners, extremely precise optical kerning. "tienda" is medium weight deep navy #14243E, "bnp" is bold electric blue #315CF5, final small square period also cobalt. All words on one horizontal baseline; keep a clear space between tienda and bnp. Mature, distinctive and professional brand signature for a software company, readily legible in a website header. The wordmark occupies 75% width, balanced large whitespace. Flat opaque colors and crisp vector-like edges. No tagline, no additional text, no icon, no shadows, no gradients, no 3D, no visual mockups. Avoid bubbly novelty lettering, overly tight illegible ligatures, and generic bank aesthetics.
```

### 4. Conexion

```text
Use case: logo-brand. Asset type: original professional logo concept for "Tienda BNP", software connecting online commerce with in-store inventory, POS and business operations.
Generate one refined horizontal brand logo centered on a pure white 3:2 landscape canvas. Symbol: two bold open rounded-square links, offset diagonally and interlocking through a crisp negative-space cut; simple flat geometry suggesting the online store and physical business connected, not a chain illustration, not an infinity sign. Use one cobalt link #315CF5 and one deep navy link #14243E, with an intentional clean visual separation at crossing so it works in monochrome. Beside it wordmark exactly "Tienda BNP", deep navy, in elegant moderately wide geometric sans serif with precise kerning and sturdy medium-bold strokes. No labels or other words. Mark has a strong recognizable compact silhouette, enough internal space for a 24px favicon. Logo about 75% of canvas width, ample whitespace and disciplined optical balance. Crisp vector-like graphic, two flat colors. No gradients, no 3D, shadows, mockups, banking symbols, hands, carts or generic network node diagrams. Make it feel like a considered premium software brand, not a template.
```
