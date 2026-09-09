---
name: TechStore — Galería de Tecnología
description: Fachada de galería de computación porteña: cajas de marca, precios taped y mostrador honesto.
colors:
  facade-red: "#d7261d"
  facade-deep: "#a81a12"
  tag-yellow: "#ffc61a"
  kraft: "#c79a63"
  ink: "#171a12"
  ink-soft: "#43473c"
  ink-faint: "#6f7366"
  panel: "#f2f4f3"
  panel-2: "#e9ece9"
  white: "#fbfcfa"
  line: "#d7dcd6"
  line-strong: "#b9c0b8"
  black: "#101209"
  fluo: "#e7f1fb"
  fluo-line: "#c8dcf2"
typography:
  display:
    fontFamily: "Anton, 'Arial Narrow', sans-serif"
    fontSize: "clamp(44px, 6vw, 76px)"
    fontWeight: 400
    lineHeight: 0.98
    letterSpacing: "0.01em"
  headline:
    fontFamily: "Anton, 'Arial Narrow', sans-serif"
    fontSize: "clamp(28px, 3.5vw, 42px)"
    fontWeight: 400
    lineHeight: 1.05
  title:
    fontFamily: "Archivo, system-ui, 'Segoe UI', Roboto, sans-serif"
    fontSize: "16.5px"
    fontWeight: 700
    lineHeight: 1.25
  body:
    fontFamily: "Archivo, system-ui, 'Segoe UI', Roboto, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Archivo, system-ui, 'Segoe UI', Roboto, sans-serif"
    fontSize: "12px"
    fontWeight: 700
  data:
    fontFamily: "'IBM Plex Mono', Consolas, monospace"
    fontSize: "23px"
    fontWeight: 700
rounded:
  sm: "2px"
  md: "4px"
  card: "5px"
  lg: "10px"
spacing:
  xs: "8px"
  sm: "12px"
  md: "18px"
  lg: "24px"
  page: "clamp(32px, 5vw, 72px)"
components:
  button-primary:
    backgroundColor: "{colors.facade-red}"
    textColor: "{colors.white}"
    rounded: "{rounded.md}"
    padding: "15px 24px"
  button-primary-hover:
    backgroundColor: "{colors.facade-deep}"
    textColor: "{colors.white}"
    rounded: "{rounded.md}"
    padding: "15px 24px"
  button-primary-dark:
    backgroundColor: "{colors.black}"
    textColor: "{colors.white}"
    rounded: "{rounded.md}"
    padding: "11px 15px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "15px 20px"
  input-search:
    backgroundColor: "{colors.white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "12px 16px"
  card-product:
    backgroundColor: "{colors.white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
    borderColor: "{colors.line}"
---

# Design System: TechStore — Galería de Tecnología

## Overview

**Creative North Star: "La galería de computación del barrio"**

La tienda entera es una galería de computación en funcionamiento bajo luz fluorescente cálida: visible, honesta, a nivel de mostrador. No es un hero glossy oscuro de e-commerce premium ni una grilla marketplace sin cara; es el local donde el porteño compara precios taped, mira el técnico trabajando y cuenta cuotas con el galerista. El precio siempre a la vista y honesto, el stock como marca serena (nunca como alarma), el servicio técnico propio en escena.

La arquitectura visual: un cielo de pasillo neutro (`--gal-panel`) del que emergen las cajas de marca con su color real, etiquetas de precio negro-sobre-amarillo pegadas, números de ticket en mono, y letras de marquesina condensadas para fachada y titulares. El zócalo y la marquesina van en negro tinta; un solo cromado en toda la tienda, reservado a la marca. Un respiro ma (vacío calmo) en cada vista larga.

**Key Characteristics:**
- Fachada como marquesina: tira de anuncios en negro con rayos amarillos, títulos en Anton.
- Tira de mostrador bajo el header: cuotas / envío / garantía / técnico / retiro como fichas de counter.
- Cajas de producto sobre estantes, con precio taped (etiqueta amarilla + negro) sobre el cuerpo de la caja.
- Estado = marca, no color: esquina perforada (agotado), cruz (stock bajo), banda (en carrito).
- Números de precio, cuotas y stock en mono de ticket; datos tabulares en mono.

## Colors

Paleta de dos temperaturas sobre neutro frío de pasillo: rojo de fachada para la marca y la acción, amarillo de etiqueta para el precio, kraft para la papelería técnica. Texto negro-aceite cálido sobre tierra fría (nunca gris puro en superficies de color).

### Primary
- **Rojo Fachada** (`#d7261d`): la marca (chip), la acción primaria "Comprar" y las marcas de estado. En hover profundiza a `#a81a12`. Se usa en cantidades medidas; si cubre una superficie, es la excepción deliberada (banda, gaming-bay oscuro).
- **Negro Tinta** (`#101209`): el marquesina, el zócalo y los botones de "Agregar". Negro oliva, casi verde, nunca azul-pizarra.

### Secondary
- **Amarillo Etiqueta** (`#ffc61a`): exclusivamente papel de precio (etiquetas taped) y la selección del navegador. Con su tinta propia `#1a1704`. No decora superficies; es el papel, no el local.

### Tertiary
- **Kraft** (`#c79a63`): papelería técnica — etiquetas de especificaciones, cintas y esquinados de ficha (tinta propia `#33240f`).

### Neutral
- **Panel** (`#f2f4f3`) y **Panel-2** (`#e9ece9`): el cielo del pasillo y sus sombras; fondo del body y de cajas.
- **Blanco** (`#fbfcfa`): cajas de producto, tarjetas interiores y buscador — frío, sin deriva a crema.
- **Tinta** (`#171a12`) / **Tinta-suave** (`#43473c`) / **Tinta-tenue** (`#6f7366`): texto, texto secundario, placeholders.
- **Línea** (`#d7dcd6`) / **Línea-fuerte** (`#b9c0b8`): hairlines y bordes.
- **Fluo** (`#e7f1fb` con línea `#c8dcf2`): tintas de luz fría para cajas vacías y fondos de lámpara.

### Named Rules
**La Regla del Precio Taped.** El precio es una etiqueta amarilla con tinta negra físicamente pegada a la caja; nunca texto suelto flotando sobre imagen o gradiente. Sin etiqueta no hay precio.

**La Regla del Rojo Único.** El rojo de fachada pertenece al chip de marca, al CTA primario y a las marcas de stock. Nunca como baño decorativo, fondos de sección o subrayados de adorno.

**La Regla del Estado como Marca.** Stock y estado se dibujan como marcas (esquina perforada, cruz, banda), no como semáforos de color. Un estado gritón es una alarma; el galerista avisa en silencio.

**La Regla de la Superficie Visible.** Selection, caret, focus, markers y scrollbar se tematizan desde la paleta (selección amarillo-etiqueta, foco rojo-fachada). Lo que el navegador dibuja por defecto es lo primero que delata una página ensamblada.

## Typography

**Display Font:** Anton (con `'Arial Narrow', sans-serif`)
**Body Font:** Archivo (con `system-ui, 'Segoe UI', Roboto, sans-serif`)
**Data Font:** IBM Plex Mono (con `Consolas, monospace`)

**Character:** Anton es la voz de fachada: condensada, gritona pero legible, sin apretar el tracking. Archivo es el mostrador: neutro, claro, presente. IBM Plex Mono es la tinta del ticket: cuenta, cotiza, tabula. La combinación es "cartel + mostrador + cajero".

### Hierarchy
- **Display** (Anton `400`, `clamp(44px, 6vw, 76px)`, lh `0.98`): el titular del hero y el número de la marca. Máximo 4 líneas sumadas, con balance.
- **Headline** (Anton `400`, `clamp(28px, 3.5vw, 42px)`, lh `1.05`): títulos de sección ("Ofertas de la semana", "También te puede servir").
- **Title** (Archivo `700`, `16.5px`, lh `1.25`): nombres de producto y fichas de counter.
- **Body** (Archivo `400`, `16px`, lh `1.5`, medida 65–75ch): párrafos y descripciones.
- **Label** (Archivo `700`, `11–13px`): marquesina, tiras, etiquetas de datos.
- **Data** (IBM Plex Mono `700`, `23px` precios, `10px` tickets): todo dato numérico (precio, cuotas, stock) en mono.

### Named Rules
**La Regla del Cartel.** Los títulos en Anton no se condensan con tracking negativo: se espacia a `0.01em` y se termina ahí. La fuente ya es la marquesina; apretarla es gritar dos veces.

**La Regla del Dato en el Ticket.** Numerales y cotizaciones van en IBM Plex Mono — y solo ellos. Nunca mono como disfraz de "técnico"; mono es el cajero, no el técnico.

## Layout

Contenedor de ancho `min(1240px, 100%)` con gutters de `24px`, que manda un ritmo vertical `clamp(32px, 5vw, 72px)` entre secciones. Espacio más arriba del titular que debajo; grupos chicos, separaciones grandes. Grillas de 4 columnas (cajas de producto, casillas del estante, fichas de counter) que bajan a 2 y luego a 1 en móvil.

Breakpoints: `1080px` (4→3 col), `900px` (fascia en columna, 2 col), `768px` (fichas/counters scrollan como balconata), `480px` (1 col, tape y botones full-width).

## Elevation & Depth

Profundidad por elevación suave, no por sombras duras. Un único `--shadow-float` (`0 1px 2px rgba(20,22,12,.06), 0 18px 40px -18px rgba(20,22,12,.35)`) que aparece en hover de caja y en elementos que vuelan (toast). En estado de reposo el sistema es plano, con hairlines de `1px` en `--gal-line`. La caja de producto se levanta 3px y su imagen escala 1.05 en hover; el CTA de compra lleva un inset de `0 -3px 0 rgba(0,0,0,.18)` que lo hunde como botón de máquina de escribir, no lo suspende.

### Named Rules
**La Regla del Button-Hundido.** Los CTAs se modelan con inset inferior oscuro (presionables, físicos), no con sombras proyectadas. El mundo es de mostrador: los botones se aprietan, no flotan.

## Shapes

Esquinas mínimas: `2px` para tickets y chips chicos, `4px` para botones, `5px` para cajas, `10px` para el chip de la marca (único "sello" redondeado). Bordes de `1px` crisp con línea templada; etiquetas con cinta/dashed cuando son papelería. Siluetas rectangulares para productos y tickets; sin píldoras salvo controles pequeños, sin radios grandes que hagan "app".

## Components

### Buttons
- **Shape:** `4px`; padding generoso (acolchado de mostrador), inset de 3px de hundimiento en la variante de compra.
- **Primary** ("Comprar"): `--gal-facade` sobre blanco, `15px 24px`, hover `--gal-facade-deep` + subida 1px. En el hero, con rayo SVG.
- **Dark** ("Agregar"): `--gal-black` sobre blanco, `11px 15px`, inset inferior oscuro; usado en cajas y listas.
- **Ghost**: borde `1.5px --gal-line-strong`, texto tinta; hover bordea rojo fachada. Para acciones secundarias (volver, ver detalle).
- **Estado / foco:** `:focus-visible` con `2px` outline rojo fachada `2px` offset en todo el sistema.

### Inputs / Fields
- **Buscador de fachada:** blanco, borde línea, radio `2px`, icono lupa a la izquierda, botón tinta de 40×40 con lupa que se enciende rojo en hover. En foco: borde rojo fachada + anillo `3px rgba(215,38,29,.12)`.
- **Cupón / correo:** borde línea-fuerte, radio `3px`, placeholder en tinta-tenue, focus igual.

### Cards / Containers
- **Caja de producto:** blanco, borde `1px --gal-line`, radio `5px`, media con gradiente panel→blanco y `aspect-ratio 1/.92`, cuerpo con marca, nombre (hover rojo fachada), rating en estrellas SVG huecas/llenas, precio ticket y botón Agregar. Hover: `translateY(-3px)` + `--shadow-float`.
- **Resumen de carrito:** sticky (`top:150px`), blanco, borde línea-fuerte, radio `5px`, ticket total en mono.

### Navigation
- **Fascia:** marca (chip redondeado 10px con rayo) + palabra en Anton 26px + sub "galería de tecnología", buscador centrado flexible (`max-width 560px`), acciones (Inicio / Carrito) como botones tipo nav con flecha de contador `--gal-tag` cuando hay items. A `900px` la fascia pasa a columna.
- **Marquesina:** banda negra con anuncios intercalados por rayos SVG, animación continua (`marquee`); el texto nunca se corta ni pausa.
- **Tira de mostrador:** 5 fichas de counter (`Cuotas / Envío / Garantía / Técnico / Retiro`) con icono SVG en `--gal-facade` y paquete título fuerte + texto `10–11px`; en móvil scrolla horizontal.

### Signature Component
**El precio taped.** Etiqueta de papel amarillo (`--gal-tag`) con tinta negra (`--gal-tag-ink`), mono `23px`, recortada con esquinado y cinta; sobre el cuerpo de la caja (oferta) o como ticket de detalle con cuotas abajo. El momento memorable del mundo: la etiqueta del galerista le habla al producto.

## Do's and Don'ts

### Do:
- **Do** mostrar el precio siempre como etiqueta taped en amarillo con tinta propia; el precio honesto y a la vista es la confianza del rubro.
- **Do** marcar stock y estado con marcas dibujadas (cruz, perforación, banda), no con colores de alarma.
- **Do** escribir todo numeral en IBM Plex Mono, con `tabular-nums` donde se tabule.
- **Do** reservar el rojo fachada para marca, CTA primario y marcas de estado.
- **Do** dejar un respiro largo (bloque vacío calmo) por vista; la densidad se acumula en las estanterías.

### Don't:
- **Don't** usar gradientes de texto, píldoras grandes, ni radios de "app" en superficies de producto.
- **Don't** poner descuentos por defecto en cada tarjeta: los tags OFF solo existen dentro de la estantería de ofertas.
- **Don't** usar glifos Unicode ni emoji como iconos; los iconos son SVG autoría propia, trazo `1.8`, una sola voz.
- **Don't** usar sombras offset duras sin blur; la profundidad es `--shadow-float` o nada.
- **Don't** escribir titulares en otro rostro distinto a Anton: la voz de fachada es la fuente de marquesina.
- **Don't** pintar el techo del pasillo: el fondo queda en `--gal-panel` frío, sin crema ni pizarra.