export const STORE_PAGES = [
  { id: 'settings-store', label: 'Datos y contacto', task: 'Actualizar los datos de mi negocio', description: 'Nombre, logo, teléfono, WhatsApp, dirección y horarios.', detail: 'Se muestran en la cabecera y al pie de tu web.', icon: 'contact' },
  { id: 'settings-content', label: 'Portada y mensajes', task: 'Cambiar lo que dice mi web', description: 'Imagen de portada, título de bienvenida, presentación y anuncios.', detail: 'Editá los textos y las imágenes que ve el cliente.', icon: 'content' },
  { id: 'settings-appearance', label: 'Colores y diseño', task: 'Elegir cómo se ve mi tienda', description: 'Colores, tipografía, tarjetas y secciones visibles.', detail: 'Probá el diseño en la vista previa antes de publicarlo.', icon: 'design', adminOnly: true },
  { id: 'settings-general', label: 'Envíos', task: 'Configurar cuánto cuesta el envío', description: 'Envío a domicilio, tarifa y mínimo para envío gratis.', detail: 'Estos valores se usan en el carrito y al finalizar la compra.', icon: 'shipping' },
]

export function isNavGroupActive(item, screen) {
  return item.children ? item.children.some((child) => child.id === screen) : item.id === screen
}
