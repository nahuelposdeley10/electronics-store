# Validación local de /home

Revisión realizada en Chrome el 3 de octubre de 2026. Sin commit, push ni despliegue.

## Verificaciones

- 390 × 844, 768 × 1024 y 1440 × 1000: contenido adaptable y sin desbordamiento horizontal. Revisión visual de portada, producto, planes y composición completa.
- Menú móvil: apertura/cierre, Escape y retorno del foco al botón. “Quiero probarlo” desplaza a `#planes`.
- Tres vistas representativas: selección por clic y flechas; Home vuelve a la primera. Los paneles tienen relaciones ARIA válidas y los inactivos están ocultos. Los ejemplos no llaman a APIs ni crean datos.
- FAQ: las ocho respuestas se abren con teclado; foco visible comprobado.
- WhatsApp: se abrieron los tres enlaces y se verificó en la página de WhatsApp el número +54 9 11 7673-1388 y los mensajes con $49.900, $89.900 y $149.900. **No se enviaron mensajes**.
- `/home`: acceso directo y recarga. `/planes`: reemplaza la URL con `/home#planes`, desplaza a planes y conserva el destino al recargar.
- API bloqueada temporalmente en Chrome: `/home` siguió funcionando, con **cero solicitudes a `/api/`**. Se retiró el bloqueo al terminar.
- `/admin`: carga el formulario de acceso. `/u/mi-tienda`: carga el catálogo existente y soporta recarga. No se cambiaron credenciales ni se realizó una compra.
- Hero: seguimiento del cursor verificado (p. ej., 1,2° en X y 3° en Y), retorno a cero al salir, sin seguimiento con emulación táctil o movimiento reducido. El desplazamiento suave se desactiva con movimiento reducido.
- Tipografía Sora/Manrope, único H1, título, descripción, canonical, imagen social y relaciones `aria-controls` revisadas en el DOM.
- Contraste de texto principal comprobado sobre las superficies usadas: gris sobre fondo claro 4,68:1; gris sobre plan azul claro 4,56:1; botón azul con blanco 5,28:1. Se aclaró el texto secundario del cierre para superar 4,5:1. Esto no sustituye una auditoría formal completa de accesibilidad.
- Sin errores ni advertencias de consola en la landing durante la revisión final.

## Comprobaciones de código

```sh
npm run lint
npm run build
node --test tests/company-home.test.mjs tests/company-motion.test.mjs
git diff --check
```

Lint y compilación correctos; 4 pruebas locales aprobadas (rutas comerciales, rutas de tienda/panel, datos/enlaces comerciales y ciclo de vida del efecto de profundidad). El build conserva la advertencia de tamaño del chunk del Dashboard, que se carga aparte; no es un error de compilación. `git diff --check` no detecta errores de whitespace; Git avisa de normalización LF/CRLF en Windows.

### Segunda pasada: efectos

Se verificaron en Chrome la secuencia de entrada (una iteración por animación),
la separación de movimiento entre imagen/luz/etiqueta, el retorno a cero, el
indicador deslizante de pestañas y el progreso de lectura. Con movimiento reducido
se observaron cero animaciones activas y texto visible. El menú móvil conserva
apertura, cierre y Escape; no hay desbordamiento en 390, 768 y 1440 px.
La prueba automatizada adicional comprueba límites de inclinación, finalización
del bucle rAF, exclusión de eventos táctiles, cancelación inmediata al cambiar
la preferencia y limpieza de listeners/estilos al desmontar.

No se ejecutó la suite de integración MongoDB (`npm test`): este cambio no modifica el backend. Las comprobaciones de panel y tienda son pruebas de carga/routing, no una nueva validación integral del checkout.

## Alcance

La oferta y los precios son para revisión local. La separación de `StoreApp` conserva los proveedores y la lógica de negocio existentes. Se preservaron los cambios previos del Dashboard. No se modificaron secretos, datos de tiendas, dependencias, lockfiles ni servidores.

Los archivos PNG en `docs/screenshots/` documentan la versión revisada. Las emulaciones temporales de viewport, movimiento, tactilidad y bloqueo de red se restablecieron antes de entregar.
