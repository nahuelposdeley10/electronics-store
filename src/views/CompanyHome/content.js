import { BUSINESS_PLANS } from '../../data/plans.js'

export const companyUrl = 'https://www.tiendabnp.com/home'
export const companyImage = 'https://www.tiendabnp.com/images/company/storefront-social.jpg'

export const companyMeta = {
  title: 'Tienda BNP — Tu tienda online. Tu negocio bajo control.',
  description: 'Tienda online y gestión para comercios argentinos: catálogo, WhatsApp, Mercado Pago, ventas presenciales, stock, caja y reportes. Conocé los planes de Tienda BNP.',
  siteName: 'Tienda BNP', type: 'website', noIndex: false,
}
export const commercialContact = { whatsapp: '5491176731388', displayPhone: '+54 9 11 7673-1388' }
export const setupPrice = 250000
export const formatPrice = (value) => `$${new Intl.NumberFormat('es-AR').format(value)}`
export const whatsappUrl = (message) => `https://wa.me/${commercialContact.whatsapp}?text=${encodeURIComponent(message)}`
export const contactUrl = whatsappUrl('Hola, quiero conocer Tienda BNP y encontrar un plan para mi negocio.')
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
  ['¿Puedo usar solo WhatsApp?', 'Sí. El plan Inicial incluye carrito y pedidos por WhatsApp: tu cliente arma el pedido y abre una conversación con tu negocio. Un pedido por WhatsApp no es un pago confirmado; coordinás el cobro con el cliente.'],
  ['¿También sirve para mi local físico?', 'Sí. Profesional y Negocio incluyen punto de venta (POS), historial, presupuestos, devoluciones y caja. La tienda online y el mostrador trabajan sobre los productos y el stock de tu negocio.'],
  ['¿Puedo importar los productos que ya tengo?', 'Podés importar productos desde JSON o CSV y usar la plantilla del panel. Es importante adaptar las columnas al formato esperado y revisar los datos antes de confirmar la importación. También podés ajustar precios por categoría.'],
  ['¿Qué puedo personalizar?', 'Podés configurar la marca, logo, colores, contacto, información de envío y cuotas desde el panel. Tu comercio tiene su propia dirección dentro de la plataforma. Esto no incluye un servicio de logística ni un dominio personalizado automático.'],
  ['¿Mi equipo puede entrar al panel?', 'Sí, con el plan Negocio podés dar accesos al equipo y asignar permisos según sus tareas. La oferta de cada plan se coordina al contratar el servicio.'],
  ['¿Cómo empiezo y qué incluye la configuración inicial?', `Elegí un plan y escribinos por WhatsApp. La configuración inicial parte de ${formatPrice(setupPrice)} y se presupuesta por separado según el alcance de tu negocio. Antes de comenzar acordamos las tareas, condiciones y tiempos; la consulta no genera un cobro automático.`],
]
