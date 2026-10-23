import { BUSINESS_PLANS } from '../../data/plans.js'

export const companyUrl = 'https://www.tiendabnp.com/'
export const companyImage = 'https://www.tiendabnp.com/images/company/storefront-social.jpg'

export const companyMeta = {
  title: 'Tienda BNP — Tu tienda online. Tu negocio bajo control.',
  description: 'Tienda online y gestión para comercios argentinos: catálogo, WhatsApp, Mercado Pago, ventas presenciales, stock, caja y reportes. Conocé los planes de Tienda BNP.',
  siteName: 'Tienda BNP', type: 'website', noIndex: false,
}
export const commercialContact = {
  whatsapp: '5491176731388',
  displayPhone: '+54 9 11 7673-1388',
  email: 'tiendabnp@gmail.com',
}
export const setupPrice = 250000
export const formatPrice = (value) => `$${new Intl.NumberFormat('es-AR').format(value)}`
export const whatsappUrl = (message) => `https://wa.me/${commercialContact.whatsapp}?text=${encodeURIComponent(message)}`
export const contactUrl = whatsappUrl('Hola, quiero conocer Tienda BNP y encontrar un plan para mi negocio.')
export const botContactUrl = whatsappUrl('Hola, quiero conocer y cotizar el vendedor IA por WhatsApp para mi negocio.')
export const botLevels = [
  {
    id: 'basico',
    name: 'Bot básico',
    badge: 'Catálogo y consultas',
    description: 'Para responder lo esencial sin dejar mensajes sin atender.',
    features: ['Productos y precios', 'Stock básico', 'Horarios y medios de pago'],
  },
  {
    id: 'profesional',
    name: 'Bot profesional',
    badge: 'Atención que vende',
    description: 'Para ordenar las consultas y llevar cada conversación a una próxima acción.',
    features: ['Todo lo del Bot básico', 'Respuestas con el tono de tu negocio', 'Derivación a una persona cuando hace falta'],
    featured: true,
  },
  {
    id: 'negocio',
    name: 'Bot negocio',
    badge: 'Más volumen y control',
    description: 'Para equipos y negocios que necesitan una configuración más completa.',
    features: ['Todo lo del Bot profesional', 'Más conversaciones incluidas', 'Reglas y seguimiento a medida'],
  },
]
export const botDemoProduct = {
  name: 'Notebook UltraBook 14',
  price: formatPrice(1199990),
  stock: 3,
}
export const botDemoScenarios = [
  {
    id: 'producto',
    label: 'Producto',
    eyebrow: 'Consulta de producto',
    messages: [
      { side: 'client', text: `Hola, ¿tenés stock de la ${botDemoProduct.name}?`, time: '10:42' },
      { side: 'agent', text: `Sí, tenemos ${botDemoProduct.stock} disponibles. Está a ${botDemoProduct.price}.`, time: '10:42', status: 'Entregado' },
      { side: 'client', text: '¿Puedo pagar con Mercado Pago y coordinar el envío?', time: '10:43' },
      { side: 'agent', text: 'Sí. Podés pagar online y te paso las opciones de entrega. ¿Querés que te reserve una?', time: '10:43', status: 'Entregado' },
    ],
    actions: [
      { id: 'view-product', label: 'Ver producto', feedback: 'El bot comparte la ficha, el precio y el stock actualizado.' },
      { id: 'reserve-product', label: 'Reservar', feedback: 'El bot pide los datos mínimos y deriva la reserva a tu equipo.' },
    ],
  },
  {
    id: 'envio',
    label: 'Envío',
    eyebrow: 'Consulta de entrega',
    messages: [
      { side: 'client', text: '¿Hacen envíos a todo el país?', time: '14:08' },
      { side: 'agent', text: 'Sí. Pasame tu localidad y te muestro las opciones disponibles antes de confirmar.', time: '14:08', status: 'Entregado' },
      { side: 'client', text: 'Estoy en Córdoba capital. ¿Cuándo llegaría?', time: '14:09' },
      { side: 'agent', text: 'Para esa zona, la entrega demora entre 2 y 4 días hábiles. ¿Querés que calcule el costo?', time: '14:09', status: 'Entregado' },
    ],
    actions: [
      { id: 'calculate-shipping', label: 'Calcular envío', feedback: 'El bot solicita la localidad y devuelve el costo antes del pago.' },
      { id: 'talk-team', label: 'Hablar con una persona', feedback: 'El bot deriva la conversación al equipo con todo el contexto.' },
    ],
  },
  {
    id: 'cambio',
    label: 'Cambio',
    eyebrow: 'Consulta postventa',
    messages: [
      { side: 'client', text: 'Hola, necesito cambiar un producto que compré ayer.', time: '16:21' },
      { side: 'agent', text: 'Claro. Te ayudo a revisar la compra y las condiciones de cambio.', time: '16:21', status: 'Entregado' },
      { side: 'client', text: '¿Tengo que acercarme al local?', time: '16:22' },
      { side: 'agent', text: 'No necesariamente. Primero revisamos tu pedido y después te indicamos el próximo paso.', time: '16:22', status: 'Entregado' },
    ],
    actions: [
      { id: 'check-order', label: 'Revisar pedido', feedback: 'El bot solicita el número de pedido sin exponer datos sensibles.' },
      { id: 'talk-team', label: 'Derivar al equipo', feedback: 'El bot entrega el contexto completo a una persona.' },
    ],
  },
]
export const emailUrl = `mailto:${commercialContact.email}?subject=${encodeURIComponent('Consulta sobre Tienda BNP')}&body=${encodeURIComponent('Hola, quiero conocer Tienda BNP y los planes disponibles para mi negocio.')}`
export const planMessage = (plan) => `Hola, quiero conocer el plan ${plan.name} de Tienda BNP, de ${formatPrice(plan.price)} por mes. ¿Cómo podemos comenzar?`

// Oferta comercial: no modifica permisos ni suscripciones del backend.
export const plans = [
  { id: BUSINESS_PLANS[0].code, name: BUSINESS_PLANS[0].name, price: BUSINESS_PLANS[0].price, label: 'Tu primera tienda online',
    description: 'Mostrá lo que vendés y recibí pedidos por WhatsApp.', includes: 'Lo esencial para empezar',
    features: ['Tienda online con tu marca', 'Catálogo, fotos, categorías y marcas', 'Ofertas y cupones', 'Importación JSON / CSV y ajuste de precios', 'Stock básico de productos', 'Carrito y pedidos por WhatsApp'],
    scope: 'Sin cobros online, POS ni caja.' },
  { id: BUSINESS_PLANS[1].code, name: BUSINESS_PLANS[1].name, price: BUSINESS_PLANS[1].price, label: 'Web y mostrador conectados',
    description: 'Sumá cobros online y ordená la operación de tu local.', includes: 'Todo lo de Inicial, más',
    features: ['Mercado Pago con tu propia cuenta', 'Punto de venta presencial (POS)', 'Historial de ventas y devoluciones', 'Presupuestos', 'Apertura, arqueo y cierre de caja', 'Reportes de ventas, ganancias y clientes'],
    scope: 'Sin equipo ni inventario avanzado.' },
  { id: BUSINESS_PLANS[2].code, name: BUSINESS_PLANS[2].name, price: BUSINESS_PLANS[2].price, label: 'Más control para tu equipo',
    description: 'Organizá a tu equipo, las compras y el inventario.', includes: 'Todo lo de Profesional, más',
    features: ['Accesos para tu equipo', 'Roles y permisos por función', 'Registro de compras', 'Historial de movimientos y ajustes', 'Recuentos de inventario físico', 'Control de stock mínimo'],
    scope: 'Para una operación con más personas y procesos.' },
]

export function companyStructuredData() {
  const siteUrl = companyUrl
  const organizationId = `${companyUrl}#organization`
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': organizationId,
        name: 'Tienda BNP',
        url: siteUrl,
        logo: 'https://www.tiendabnp.com/images/brand/tienda-bnp-logo.png',
        description: companyMeta.description,
        areaServed: { '@type': 'Country', name: 'Argentina' },
        contactPoint: {
          '@type': 'ContactPoint',
          telephone: '+5491176731388',
          contactType: 'sales',
          areaServed: 'AR',
          availableLanguage: 'es-AR',
        },
      },
      {
        '@type': 'SoftwareApplication',
        name: 'Tienda BNP',
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'Web',
        url: siteUrl,
        description: companyMeta.description,
        provider: { '@id': organizationId },
        offers: plans.map((plan) => ({
          '@type': 'Offer',
          name: `Plan ${plan.name}`,
          price: plan.price,
          priceCurrency: 'ARS',
          url: `${siteUrl}#planes`,
          seller: { '@id': organizationId },
        })),
      },
    ],
  }
}

export const faqs = [
  ['¿Necesito saber programar?', 'No. Administrás el catálogo y la configuración desde el panel. Coordinamos la puesta en marcha para que tu negocio tenga su marca, productos y canales de contacto.'],
  ['¿Cómo recibo el dinero de mis ventas?', 'Desde el plan Profesional podés conectar las credenciales de tu propia cuenta de Mercado Pago. Los cobros se procesan en esa cuenta. Las comisiones, plazos y condiciones del procesador son independientes de la mensualidad de Tienda BNP.'],
  ['¿Puedo usar solo WhatsApp?', 'Sí. El plan Inicial incluye carrito y pedidos por WhatsApp: tu cliente arma el pedido y abre una conversación con tu negocio. El vendedor IA se contrata aparte, con un nivel y un uso acordados. Un pedido por WhatsApp no es un pago confirmado; coordinás el cobro con el cliente.'],
  ['¿También sirve para mi local físico?', 'Sí. Profesional y Negocio incluyen punto de venta (POS), historial, presupuestos, devoluciones y caja. La tienda online y el mostrador trabajan sobre los productos y el stock de tu negocio.'],
  ['¿Puedo importar los productos que ya tengo?', 'Podés importar productos desde JSON o CSV y usar la plantilla del panel. Es importante adaptar las columnas al formato esperado y revisar los datos antes de confirmar la importación. También podés ajustar precios por categoría.'],
  ['¿Qué puedo personalizar?', 'Podés configurar la marca, logo, colores, contacto, información de envío y cuotas desde el panel. Tu comercio tiene su propia dirección dentro de la plataforma. Esto no incluye un servicio de logística ni un dominio personalizado automático.'],
  ['¿Mi equipo puede entrar al panel?', 'Sí, con el plan Negocio podés dar accesos al equipo y asignar permisos según sus tareas. La oferta de cada plan se coordina al contratar el servicio.'],
  ['¿Cómo empiezo y qué incluye la configuración inicial?', `Elegí un plan y escribinos por WhatsApp. La configuración inicial parte de ${formatPrice(setupPrice)} y se presupuesta por separado según el alcance de tu negocio. Antes de comenzar acordamos las tareas, condiciones y tiempos; la consulta no genera un cobro automático.`],
]
