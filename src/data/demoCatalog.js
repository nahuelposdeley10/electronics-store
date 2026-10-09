// Productos de muestra para que una tienda nueva no se vea vacía.
// Nunca se envían a la API ni se pueden agregar al carrito.
export const DEMO_SECTION_SIZE = 5

export const DEMO_PRODUCTS = [
  { id: 'demo-notebook', name: 'Notebook Pro 14 pulgadas', brand: 'Ejemplo Tech', category: 'computacion', price: 899999, oldPrice: 999999, stock: 8, rating: 4.8, badge: 'Ejemplo', freeShipping: true, onSale: true, image: '/images/products/default.svg' },
  { id: 'demo-smartphone', name: 'Smartphone Nova 5G', brand: 'Ejemplo Mobile', category: 'moviles', price: 549999, oldPrice: 599999, stock: 12, rating: 4.7, badge: 'Ejemplo', onSale: true, image: '/images/products/default.svg' },
  { id: 'demo-headphones', name: 'Auriculares inalámbricos Air', brand: 'Ejemplo Audio', category: 'audio', price: 119999, oldPrice: 149999, stock: 20, rating: 4.6, badge: 'Ejemplo', onSale: true, image: '/images/products/default.svg' },
  { id: 'demo-console', name: 'Consola de videojuegos', brand: 'Ejemplo Play', category: 'entretenimiento', price: 699999, oldPrice: 799999, stock: 5, rating: 4.9, badge: 'Ejemplo', onSale: true, image: '/images/products/default.svg' },
  { id: 'demo-monitor', name: 'Monitor UltraWide 34 pulgadas', brand: 'Ejemplo Vision', category: 'computacion', price: 459999, oldPrice: 499999, stock: 7, rating: 4.8, badge: 'Ejemplo', onSale: true, image: '/images/products/default.svg' },
  { id: 'demo-keyboard', name: 'Teclado mecánico RGB', brand: 'Ejemplo Gear', category: 'computacion', price: 129999, stock: 4, rating: 4.7, badge: 'Ejemplo', image: '/images/products/default.svg' },
  { id: 'demo-watch', name: 'Smartwatch Fit Pro', brand: 'Ejemplo Mobile', category: 'moviles', price: 189999, stock: 9, rating: 4.5, badge: 'Ejemplo', image: '/images/products/default.svg' },
  { id: 'demo-speaker', name: 'Parlante portátil SoundGo', brand: 'Ejemplo Audio', category: 'audio', price: 159999, stock: 3, rating: 4.6, badge: 'Ejemplo', image: '/images/products/default.svg' },
  { id: 'demo-webcam', name: 'Cámara web Full HD', brand: 'Ejemplo Vision', category: 'computacion', price: 89999, stock: 1, rating: 4.4, badge: 'Ejemplo', image: '/images/products/default.svg' },
  { id: 'demo-tablet', name: 'Tablet Pro 11 pulgadas', brand: 'Ejemplo Mobile', category: 'moviles', price: 299999, stock: 15, rating: 4.7, badge: 'Ejemplo', image: '/images/products/default.svg' },
]

export const DEMO_BRANDS = [...new Set(DEMO_PRODUCTS.map((product) => product.brand))]
