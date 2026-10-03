export const STEPS = [
  { id: 'business', title: 'Tu negocio', hint: 'Nombre, contacto y dirección web', description: 'Dale identidad a tu tienda. Estos datos se muestran a tus clientes.' },
  { id: 'catalog', title: 'Tu catálogo', hint: 'Productos con precio de venta', description: 'Cargá tus productos de a uno o importá tu catálogo. Necesitás al menos un producto visible en la tienda, con marca, categoría y precio mayor a cero.' },
  { id: 'stock', title: 'Stock para vender', hint: 'Disponibilidad real de tus productos', description: 'Ingresá las unidades que realmente tenés. Para comenzar, al menos un producto con precio debe tener stock disponible.' },
  { id: 'payments', title: 'Cómo vas a cobrar', hint: 'Mercado Pago o WhatsApp', description: 'Elegí el canal que vas a usar ahora. Podés cambiarlo más adelante sin perder tus credenciales.' },
  { id: 'shipping', title: 'Cómo vas a entregar', hint: 'Costo de envío o entrega a coordinar', description: 'Revisá los valores antes de mostrarlos a tus clientes. No se contrata ningún servicio de logística.' },
  { id: 'review', title: 'Revisá y compartí', hint: 'Último vistazo antes de comenzar', description: 'Abrí tu tienda y revisá catálogo, contacto y forma de cobro. Finalizar esta guía no realiza una compra ni envía mensajes.' },
]

export const formatMoney = (value) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(value)
