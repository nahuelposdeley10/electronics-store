// Productos de muestra para que una tienda nueva no se vea vacía.
// Nunca se envían a la API ni se pueden agregar al carrito.
export const DEMO_PRODUCTS = [
  { id: 'demo-notebook', name: 'Notebook Pro 14 pulgadas', brand: 'Ejemplo Tech', category: 'computacion', price: 899999, oldPrice: 999999, stock: 8, rating: 4.8, badge: 'Ejemplo', freeShipping: true, onSale: true, image: '/images/products/default.svg' },
  { id: 'demo-smartphone', name: 'Smartphone Nova 5G', brand: 'Ejemplo Mobile', category: 'moviles', price: 549999, stock: 12, rating: 4.7, badge: 'Ejemplo', image: '/images/products/default.svg' },
  { id: 'demo-headphones', name: 'Auriculares inalámbricos Air', brand: 'Ejemplo Audio', category: 'audio', price: 119999, stock: 20, rating: 4.6, badge: 'Ejemplo', image: '/images/products/default.svg' },
  { id: 'demo-console', name: 'Consola de videojuegos', brand: 'Ejemplo Play', category: 'entretenimiento', price: 699999, stock: 5, rating: 4.9, badge: 'Ejemplo', image: '/images/products/default.svg' },
]

export const DEMO_BRANDS = [...new Set(DEMO_PRODUCTS.map((product) => product.brand))]
