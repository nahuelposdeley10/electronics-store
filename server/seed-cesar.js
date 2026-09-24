import 'dotenv/config'
import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'
import { env } from './config/env.js'
import { User } from './models/User.js'
import { Category } from './models/Category.js'
import { Brand } from './models/Brand.js'
import { Product } from './models/Product.js'
import { Coupon } from './models/Coupon.js'
import { Order } from './models/Order.js'
import { Purchase } from './models/Purchase.js'
import { StockMovement } from './models/StockMovement.js'
import { getSettings, saveSettings } from './lib/settings.js'
import { roundMoney, roundLine } from './lib/money.js'

const dbName = process.env.SEED_DB_NAME || 'electronics-store'
const ADMIN_EMAIL = (
  process.argv[2] ||
  process.env.SEED_CESAR_EMAIL ||
  'cesar@gmail.com'
)
  .trim()
  .toLowerCase()
const ADMIN_PASSWORD = process.env.SEED_CESAR_ADMIN_PASSWORD || '123456'
const OPERATOR_PASSWORD = 'operador123'

const SHIPPING_COST = 5999
const FREE_SHIPPING_THRESHOLD = 300000

const CATEGORIES = [
  { key: 'notebooks', name: 'Notebooks y PC' },
  { key: 'celulares', name: 'Celulares' },
  { key: 'audio', name: 'Audio' },
  { key: 'gaming', name: 'Gaming' },
  { key: 'monitores', name: 'Monitores' },
  { key: 'perifericos', name: 'Periféricos' },
  { key: 'almacenamiento', name: 'Almacenamiento' },
  { key: 'accesorios', name: 'Accesorios' },
]

const BRANDS = [
  'Lenovo',
  'HP',
  'Apple',
  'Samsung',
  'Motorola',
  'Xiaomi',
  'JBL',
  'Sony',
  'Redragon',
  'Logitech',
  'LG',
  'Kingston',
  'Western Digital',
]

const PRODUCTS = [
  {
    name: 'Notebook Lenovo IdeaPad 3 · Ryzen 5 5500U · 16GB · SSD 512GB',
    brand: 'Lenovo',
    category: 'notebooks',
    price: 789999,
    oldPrice: 899999,
    onSale: true,
    freeShipping: true,
    rating: 4.8,
    stock: 9,
    minStock: 2,
    badge: 'OFERTA',
    costPrice: 610000,
    description:
      'Ideal para estudio y trabajo diario. Suma un Ryzen 5, 16GB de RAM y disco SSD de 512GB para arrancar en segundos.',
    specs: [
      'AMD Ryzen 5 5500U · 2.1GHz',
      '16GB DDR4 · 512GB NVMe',
      'Pantalla 15.6" IPS Full HD',
      'Windows 11 Home',
    ],
  },
  {
    name: 'Notebook HP Pavilion 15 · Core i5-1240P · 8GB · SSD 512GB',
    brand: 'HP',
    category: 'notebooks',
    price: 849999,
    freeShipping: true,
    rating: 4.6,
    stock: 5,
    minStock: 2,
    costPrice: 645000,
    description:
      'Una notebook equilibrada para productividad y entretenimiento, con batería de larga duración.',
    specs: [
      'Intel Core i5-1240P',
      '8GB DDR4 · 512GB NVMe',
      'Pantalla 15.6" IPS Full HD',
      'Windows 11 Home',
    ],
  },
  {
    name: 'Apple iPhone 15 128GB · Midnight',
    brand: 'Apple',
    category: 'celulares',
    price: 1149999,
    freeShipping: true,
    rating: 5.0,
    stock: 6,
    minStock: 1,
    badge: 'TOP',
    costPrice: 890000,
    description:
      'El iPhone 15 con Dynamic Island, cámara de 48MP y puerto USB-C. Garantía oficial de 12 meses.',
    specs: [
      'Pantalla OLED 6.1" · 60Hz',
      'Cámara principal 48MP',
      '128GB de almacenamiento',
      'USB-C · Ceramic Shield',
    ],
  },
  {
    name: 'Samsung Galaxy A55 5G · 256GB · Azul',
    brand: 'Samsung',
    category: 'celulares',
    price: 629999,
    oldPrice: 709999,
    onSale: true,
    rating: 4.7,
    stock: 14,
    minStock: 3,
    costPrice: 470000,
    description:
      'Rendimiento fluido, tres cámaras versátiles y carga rápida de 25W. Exclusivo de Samsung.',
    specs: [
      'Pantalla Super AMOLED 6.6" · 120Hz',
      'Exynos 1480 · 8GB RAM',
      '256GB de almacenamiento',
      'Carga rápida 25W',
    ],
  },
  {
    name: 'Motorola Edge 50 Pro · 512GB',
    brand: 'Motorola',
    category: 'celulares',
    price: 569999,
    rating: 4.4,
    stock: 8,
    minStock: 2,
    costPrice: 425000,
    description:
      'Motorola Edge 50 Pro: carga ultrarápida de 125W y pantalla pOLED de 144Hz.',
    specs: [
      'Pantalla pOLED 6.7" · 144Hz',
      'Snapdragon 7 Gen 3',
      '512GB de almacenamiento',
      'Carga TurboPower 125W',
    ],
  },
  {
    name: 'Xiaomi Redmi Note 13 Pro · 256GB',
    brand: 'Xiaomi',
    category: 'celulares',
    price: 429999,
    rating: 4.5,
    stock: 20,
    minStock: 4,
    costPrice: 320000,
    description:
      'El Redmi Note 13 Pro con cámara de 200MP y AMOLED de 120Hz. La mejor relación precio-calidad.',
    specs: [
      'Pantalla AMOLED 6.67" · 120Hz',
      'Cámara principal 200MP',
      '256GB de almacenamiento',
      'Carga rápida 67W',
    ],
  },
  {
    name: 'Parlante JBL Boombox 3 · Bluetooth',
    brand: 'JBL',
    category: 'audio',
    price: 459999,
    oldPrice: 519999,
    onSale: true,
    freeShipping: true,
    rating: 4.8,
    stock: 7,
    minStock: 2,
    badge: 'OFERTA',
    costPrice: 350000,
    description:
      'Sonido monumental con graves profundos. Resistente al agua y polvo, 24 horas de batería.',
    specs: [
      'Potencia 80W RMS',
      'IP67 · resistente al agua',
      'Hasta 24 horas de batería',
      'Bluetooth 5.3',
    ],
  },
  {
    name: 'Auriculares Sony WH-1000XM5 · Negros',
    brand: 'Sony',
    category: 'audio',
    price: 389999,
    rating: 4.9,
    stock: 10,
    minStock: 2,
    costPrice: 295000,
    description:
      'La referencia en cancelación de ruido. Calling de alta calidad y hasta 30 horas de uso.',
    specs: [
      'Cancelación de ruido líder',
      '30 horas de batería',
      'Bluetooth multipunto',
      'Carga rápida USB-C',
    ],
  },
  {
    name: 'Auriculares JBL Tune 510BT · Bluetooth',
    brand: 'JBL',
    category: 'audio',
    price: 67999,
    rating: 4.3,
    stock: 30,
    minStock: 5,
    costPrice: 48000,
    description:
      'Sonido JBL Pure Bass con 40 horas de reproducción y plegables para llevarlos a todos lados.',
    specs: [
      'JBL Pure Bass',
      '40 horas de batería',
      'Bluetooth 5.0',
      'Plegables · micrófono integrado',
    ],
  },
  {
    name: 'Consola Sony PlayStation 5 Slim · 1TB',
    brand: 'Sony',
    category: 'gaming',
    price: 969999,
    freeShipping: true,
    rating: 4.9,
    stock: 4,
    minStock: 1,
    badge: 'TOP',
    costPrice: 760000,
    description:
      'La PS5 en versión Slim con 1TB de almacenamiento. Incluye joystick DualSense y lector de discos.',
    specs: [
      'Almacenamiento 1TB',
      'CPU AMD Zen 2 · GPU RDNA 2',
      'Soporta 4K a 120Hz',
      'Incluye DualSense',
    ],
  },
  {
    name: 'Joystick Redragon Harrow Pro · Inalámbrico',
    brand: 'Redragon',
    category: 'gaming',
    price: 38999,
    rating: 4.2,
    stock: 40,
    minStock: 6,
    costPrice: 26000,
    description:
      'Gamepad inalámbrico con vibración dual y palancas de precisión. Compatible con PC y consolas.',
    specs: [
      'Conexión 2.4GHz + cable',
      'Vibración dual',
      'Hasta 15 horas de uso',
      'Compatibilidad PS3/PC',
    ],
  },
  {
    name: 'Teclado Redragon Kumara K552 · RGB',
    brand: 'Redragon',
    category: 'perifericos',
    price: 54999,
    rating: 4.6,
    stock: 25,
    minStock: 4,
    costPrice: 37000,
    description:
      'Teclado mecánico compacto con switches Redragon brown, retroiluminación RGB y estructura de aluminio.',
    specs: [
      'Switches mecánicos Outemu',
      'Formato TKL 87 teclas',
      'Retroiluminación RGB',
      'Chasis de aluminio',
    ],
  },
  {
    name: 'Mouse Logitech G502 HERO · Gaming',
    brand: 'Logitech',
    category: 'perifericos',
    price: 109999,
    oldPrice: 129999,
    onSale: true,
    rating: 4.7,
    stock: 18,
    minStock: 3,
    costPrice: 74000,
    description:
      'El icónico G502 con sensor HERO 25K, 11 botones programables y ajuste de peso reversible.',
    specs: [
      'Sensor HERO 25K DPI',
      '11 botones programables',
      'Cable adaptativo con peso',
      'RGB LIGHTSYNC',
    ],
  },
  {
    name: 'Monitor Samsung 24" FHD · 75Hz',
    brand: 'Samsung',
    category: 'monitores',
    price: 259999,
    rating: 4.4,
    stock: 11,
    minStock: 3,
    costPrice: 190000,
    description:
      'Panel IPS de 24 pulgadas Full HD con frecuencia de 75Hz. Ideal oficina y home office.',
    specs: [
      'Panel IPS 24" · Full HD',
      '75Hz · 5ms',
      'Conexiones HDMI + VGA',
      'Modo de cuidado ocular',
    ],
  },
  {
    name: 'Monitor LG 27" QHD · 165Hz · FreeSync',
    brand: 'LG',
    category: 'monitores',
    price: 489999,
    freeShipping: true,
    rating: 4.6,
    stock: 6,
    minStock: 2,
    costPrice: 380000,
    description:
      'Para jugar y trabajar: resolución QHD, 165Hz y sincronización FreeSync Premium.',
    specs: [
      'Panel 27" · 2560x1440 QHD',
      '165Hz · 1ms MBR',
      'AMD FreeSync Premium',
      'HDR10',
    ],
  },
  {
    name: 'SSD Kingston NV2 · 1TB · NVMe',
    brand: 'Kingston',
    category: 'almacenamiento',
    price: 99999,
    rating: 4.8,
    stock: 22,
    minStock: 4,
    costPrice: 68000,
    description:
      'Velocidades de lectura de hasta 3500 MB/s para cargar juegos y aplicaciones al instante.',
    specs: [
      'Capacidad 1TB',
      'Lectura 3500 MB/s',
      'Interfaz NVMe PCIe 4.0',
      'Factor M.2 2280',
    ],
  },
  {
    name: 'Disco Western Digital Blue · 2TB · HDD',
    brand: 'Western Digital',
    category: 'almacenamiento',
    price: 125999,
    rating: 4.5,
    stock: 12,
    minStock: 3,
    costPrice: 87000,
    description:
      'Disco rígido de escritorio con 2TB para guardar tus archivos pesados sin preocuparte.',
    specs: [
      'Capacidad 2TB',
      '7200 RPM · 256MB cache',
      'Interfaz SATA III',
      'Garantía 2 años',
    ],
  },
  {
    name: 'Cargador Samsung 25W · USB-C',
    brand: 'Samsung',
    category: 'accesorios',
    price: 22999,
    rating: 4.3,
    stock: 50,
    minStock: 8,
    costPrice: 15000,
    description:
      'Carga rápida Super Fast Charging de 25W con cable USB-C incluido.',
    specs: [
      'Potencia 25W',
      'Super Fast Charging',
      'Incluye cable USB-C',
      'Compatibilidad universal',
    ],
  },
  {
    name: 'Funda de silicona · iPhone 15',
    brand: 'Apple',
    category: 'accesorios',
    price: 14999,
    rating: 4.2,
    stock: 35,
    minStock: 6,
    costPrice: 9000,
    description:
      'Protección con silicona suave al tacto y bordes reforzados. MagSafe compatible.',
    specs: [
      'Silicona de grado premium',
      'Compatibilidad MagSafe',
      'Bordes reforzados',
      'Colores surtidos',
    ],
  },
]

const PRODUCT_IMAGES = {
  'Notebook Lenovo IdeaPad 3 · Ryzen 5 5500U · 16GB · SSD 512GB': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b8/Lenovo_IdeaPad_Flex14_laptop.jpg/960px-Lenovo_IdeaPad_Flex14_laptop.jpg',
  'Notebook HP Pavilion 15 · Core i5-1240P · 8GB · SSD 512GB': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/3/3a/HP_Laptop_15-da1xxx.jpg/960px-HP_Laptop_15-da1xxx.jpg',
  'Apple iPhone 15 128GB · Midnight': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/4/48/Apple_iPhone_15.jpg/960px-Apple_iPhone_15.jpg',
  'Samsung Galaxy A55 5G · 256GB · Azul': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/8/8b/Samsung_Galaxy_A55_5G_2024.jpg/960px-Samsung_Galaxy_A55_5G_2024.jpg',
  'Motorola Edge 50 Pro · 512GB': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/0/0e/Motorola_Edge_50_Neo.jpg/960px-Motorola_Edge_50_Neo.jpg',
  'Xiaomi Redmi Note 13 Pro · 256GB': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/4/40/Redmi_Note_14_ProPlus.jpg/960px-Redmi_Note_14_ProPlus.jpg',
  'Parlante JBL Boombox 3 · Bluetooth': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/8/85/JBL_Boombox_2_2v2.jpg/960px-JBL_Boombox_2_2v2.jpg',
  'Auriculares Sony WH-1000XM5 · Negros': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/4/4b/Sony-WH-1000XM3-kabellose-Bluetooth-Noise-Cancelling-Kopfhoerer.jpg/960px-Sony-WH-1000XM3-kabellose-Bluetooth-Noise-Cancelling-Kopfhoerer.jpg',
  'Auriculares JBL Tune 510BT · Bluetooth': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/c/c4/JBL_LIVE_650_BTNC_%28Over-Ear_Noise_Cancelling_Headphone%29._%2851127342181%29.jpg/960px-JBL_LIVE_650_BTNC_%28Over-Ear_Noise_Cancelling_Headphone%29._%2851127342181%29.jpg',
  'Consola Sony PlayStation 5 Slim · 1TB': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/1/1b/PlayStation_5_and_DualSense_with_transparent_background.png/960px-PlayStation_5_and_DualSense_with_transparent_background.png',
  'Joystick Redragon Harrow Pro · Inalámbrico': 'https://upload.wikimedia.org/wikipedia/commons/3/34/Welcom_USB_gamepad_2013-09-20_21-25.jpg',
  'Teclado Redragon Kumara K552 · RGB': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/5/50/Logitech_G_PRO_TKL_gaming_keyboard_-_English_%28United_States%29_layout.jpg/960px-Logitech_G_PRO_TKL_gaming_keyboard_-_English_%28United_States%29_layout.jpg',
  'Mouse Logitech G502 HERO · Gaming': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a7/Logitech_G502_Hero.jpg/960px-Logitech_G502_Hero.jpg',
  'Monitor Samsung 24" FHD · 75Hz': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/f/fa/Samsung_monitor_with_VESA_mount.jpg/960px-Samsung_monitor_with_VESA_mount.jpg',
  'Monitor LG 27" QHD · 165Hz · FreeSync': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/8/83/LG_Monitor.jpg/960px-LG_Monitor.jpg',
  'SSD Kingston NV2 · 1TB · NVMe': 'https://upload.wikimedia.org/wikipedia/commons/5/52/256GB_2230_NVME_SSD_%2B_256GB_NGFF_SSD.jpg',
  'Disco Western Digital Blue · 2TB · HDD': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/b/bf/Western_Digital_2.5%22_SATA_Hard_Disk_Drive.jpg/960px-Western_Digital_2.5%22_SATA_Hard_Disk_Drive.jpg',
  'Cargador Samsung 25W · USB-C': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/4/45/SAMSUNG_EP-T4510_45W_POWER_ADAPER_BLACK_%26_USB_C_TO_C_CABLE.jpg/960px-SAMSUNG_EP-T4510_45W_POWER_ADAPER_BLACK_%26_USB_C_TO_C_CABLE.jpg',
  'Funda de silicona · iPhone 15': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/f/f0/Custodia_navigatore_e_smartphone.jpg/960px-Custodia_navigatore_e_smartphone.jpg',
}

const COUPONS = [
  { code: 'BIENVENIDA10', percent: 10, description: '10% off en tu primera compra online.' },
  { code: 'STORE15', percent: 15, description: '15% off en periféricos por tiempo limitado.' },
]

const OPERATORS = [
  { name: 'Martina López', email: 'martina@cesarelectronica.com' },
  { name: 'Santiago Ríos', email: 'santiago@cesarelectronica.com' },
]

const PURCHASES = [
  {
    number: 1001,
    supplier: 'Distribuidora Posada',
    invoice: 'FC A 00001-000123',
    items: [
      { name: 'Notebook Lenovo IdeaPad 3 · Ryzen 5 5500U · 16GB · SSD 512GB', quantity: 10, cost: 610000 },
      { name: 'SSD Kingston NV2 · 1TB · NVMe', quantity: 30, cost: 68000 },
      { name: 'Teclado Redragon Kumara K552 · RGB', quantity: 30, cost: 37000 },
    ],
    createdAgoDays: 42,
    createdBy: 'martina@cesarelectronica.com',
  },
  {
    number: 1002,
    supplier: 'ADV Tecnología',
    invoice: 'FC B 00002-118899',
    items: [
      { name: 'Samsung Galaxy A55 5G · 256GB · Azul', quantity: 15, cost: 470000 },
      { name: 'Cargador Samsung 25W · USB-C', quantity: 50, cost: 15000 },
      { name: 'Monitor Samsung 24" FHD · 75Hz', quantity: 12, cost: 190000 },
    ],
    createdAgoDays: 26,
    createdBy: 'santiago@cesarelectronica.com',
  },
  {
    number: 1003,
    supplier: 'Hogar & Audio SA',
    invoice: 'FC B 00003-003322',
    items: [
      { name: 'Parlante JBL Boombox 3 · Bluetooth', quantity: 8, cost: 350000 },
      { name: 'Auriculares JBL Tune 510BT · Bluetooth', quantity: 30, cost: 48000 },
      { name: 'Mouse Logitech G502 HERO · Gaming', quantity: 20, cost: 74000 },
    ],
    createdAgoDays: 12,
    createdBy: 'martina@cesarelectronica.com',
  },
]

const STATUS_POOL = [
  'approved',
  'approved',
  'approved',
  'approved',
  'approved',
  'approved',
  'approved',
  'pending',
  'in_process',
  'rejected',
  'cancelled',
]

const COUPON_POOL = [null, null, null, null, 'BIENVENIDA10', 'STORE15']

const PAYER_POOL = [
  { name: 'Juan', surname: 'Pérez', email: 'juanperez@gmail.com', idNumber: '31234567' },
  { name: 'María', surname: 'González', email: 'mariagonzalez@hotmail.com', idNumber: '29875643' },
  { name: 'Nahuel', surname: 'Domínguez', email: 'nahueldoma@outlook.com', idNumber: '40543219' },
  { name: 'Lucía', surname: 'Fernández', email: 'luciafer@yahoo.com.ar', idNumber: '38876541' },
  { name: 'Pedro', surname: 'Martínez', email: 'pedromartinez@gmail.com', idNumber: '27654321' },
  { name: 'Carla', surname: 'Rodríguez', email: 'carlarod@gmail.com', idNumber: '35432187' },
  { name: 'Diego', surname: 'Álvarez', email: 'diegoalv@gmail.com', idNumber: '42109876' },
  { name: 'Florencia', surname: 'Suárez', email: 'florsuarez@gmail.com', idNumber: '31456782' },
]

function pick(list) {
  return list[Math.floor(Math.random() * list.length)]
}

function randomItems(catalog) {
  const count = 1 + Math.floor(Math.random() * 3)
  const pool = [...catalog]
  const chosen = []
  for (let i = 0; i < count && pool.length; i++) {
    chosen.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0])
  }
  return chosen.map((p) => ({
    productId: p.id,
    name: p.name,
    unitPrice: p.price,
    quantity: 1 + Math.floor(Math.random() * 2),
  }))
}

function buildTotals(items, coupon, discountRate) {
  const subtotal = items.reduce((sum, it) => sum + roundLine(it.unitPrice, it.quantity), 0)
  const discount = roundMoney((subtotal * (discountRate || 0)) / 100)
  const shippingCost = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_COST
  return { subtotal, discount, shippingCost, total: roundMoney(subtotal - discount + shippingCost) }
}

function daysAgo(days, hourOffset = 0) {
  return new Date(Date.now() - days * 86400000 - hourOffset * 3600000)
}

function shortCode() {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

async function ensureAdmin() {
  const existing = await User.findOne({ email: ADMIN_EMAIL }).lean()
  if (existing) {
    if (!existing.businessSlug) {
      const slug = await freeSlug('cesar')
      await User.updateOne({ _id: existing._id }, { $set: { businessSlug: slug } })
    }
    return existing
  }
  const slug = await freeSlug('cesar')
  const hash = await bcrypt.hash(ADMIN_PASSWORD, 10)
  return User.create({
    name: 'Cesar',
    email: ADMIN_EMAIL,
    passwordHash: hash,
    role: 'admin',
    businessSlug: slug,
    active: true,
  })
}

async function freeSlug(base) {
  let candidate = base
  let n = 1
  while (await User.findOne({ businessSlug: candidate }).lean()) {
    n += 1
    candidate = `${base}-${n}`
  }
  return candidate
}

async function setUpSettingsFor(admin) {
  const settings = await getSettings({ fresh: true, tenant: admin._id })
  await saveSettings({
    section: 'store',
    value: {
      name: 'Cesar Electrónica',
      tagline: 'Tecnología de marca, precio de mayorista',
      phone: '0351 555 8899',
      whatsapp: '543515558899',
      email: 'ventas@cesarelectronica.com',
      addressFull: 'Av. Colón 1542, Nueva Córdoba, Córdoba',
      addressShort: 'Nueva Córdoba, Córdoba',
      hours: 'Lun a Vie 10:00 - 19:00 · Sáb 10:00 - 14:00',
      band: 'Comprá online y retirá gratis en el local. Envíos a todo el país.',
    },
    tenant: admin._id,
  })
  await saveSettings({
    section: 'hero',
    value: {
      title: 'Tecnología que sí.',
      titleAccent: 'Precio de mayorista.',
      lead: 'Notebooks, celulares, audio y gaming de marcas oficiales, con envío a todo el país o retiro en el local. Hasta 12 cuotas sin interés y servicio técnico propio.',
    },
    tenant: admin._id,
  })
  const general = settings.general
  general.marquee = [
    'Envíos a todo el país',
    '12 cuotas sin interés',
    'Tienda física en Nueva Córdoba',
    'Garantía oficial 6 meses',
  ]
  await saveSettings({ section: 'general', value: general, tenant: admin._id })
}

async function seedMeta(admin) {
  const bulk = []
  for (const c of CATEGORIES) {
    bulk.push({
      updateOne: {
        filter: { adminId: admin._id, key: c.key },
        update: { $set: { name: c.name, active: true } },
        upsert: true,
        setDefaultsOnInsert: { adminId: admin._id, key: c.key },
      },
    })
  }
  await Category.bulkWrite(bulk, { ordered: false })

  const brandBulk = BRANDS.map((name) => ({
    updateOne: {
      filter: { adminId: admin._id, name },
      update: { $set: { active: true } },
      upsert: true,
      setDefaultsOnInsert: { adminId: admin._id, name },
    },
  }))
  await Brand.bulkWrite(brandBulk, { ordered: false })
}

async function seedProducts(admin) {
  const existingNames = new Set(
    (await Product.find({ adminId: admin._id }).select('name').lean()).map((p) => p.name),
  )
  const maxId =
    (await Product.findOne({ adminId: admin._id }).sort({ id: -1 }).select('id').lean())?.id || 0

  const toInsert = []
  let nextId = maxId
  for (const p of PRODUCTS) {
    if (existingNames.has(p.name)) continue
    nextId += 1
    toInsert.push({
      adminId: admin._id,
      id: nextId,
      name: p.name,
      brand: p.brand,
      category: p.category,
      price: p.price,
      oldPrice: p.oldPrice ?? null,
      costPrice: p.costPrice || 0,
      onSale: Boolean(p.onSale),
      freeShipping: Boolean(p.freeShipping),
      rating: p.rating || 0,
      stock: p.stock,
      minStock: p.minStock || 0,
      badge: p.badge || null,
      image: PRODUCT_IMAGES[p.name] || '',
      description: p.description || '',
      specs: p.specs || [],
    })
  }
  if (toInsert.length) await Product.insertMany(toInsert)

  const backfill = []
  for (const p of PRODUCTS) {
    const image = PRODUCT_IMAGES[p.name]
    if (!image) continue
    backfill.push({
      updateOne: {
        filter: { adminId: admin._id, name: p.name, image: '' },
        update: { $set: { image } },
      },
    })
  }
  if (backfill.length) await Product.bulkWrite(backfill, { ordered: false })

  return Product.find({ adminId: admin._id }).sort({ id: 1 }).lean()
}

async function seedCoupons(admin) {
  const bulk = COUPONS.map((c) => ({
    updateOne: {
      filter: { adminId: admin._id, code: c.code },
      update: { $set: { percent: c.percent, description: c.description, active: true } },
      upsert: true,
      setDefaultsOnInsert: { adminId: admin._id, code: c.code },
    },
  }))
  await Coupon.bulkWrite(bulk, { ordered: false })
}

async function seedOperators(admin) {
  const hash = await bcrypt.hash(OPERATOR_PASSWORD, 10)
  const created = []
  for (const op of OPERATORS) {
    const user = await User.findOneAndUpdate(
      { email: op.email },
      {
        $set: {
          name: op.name,
          role: 'operator',
          adminId: admin._id,
          active: true,
          passwordHash: hash,
        },
      },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: { email: op.email } },
    )
    created.push(user)
  }
  return created
}

async function seedPurchases(admin) {
  const catalog = await Product.find({ adminId: admin._id }).lean()
  const byName = new Map(catalog.map((p) => [p.name, p]))
  await Purchase.deleteMany({ adminId: admin._id })

  const docs = []
  let number = 1000
  const last = (await Purchase.findOne({ adminId: admin._id }).sort({ number: -1 }).lean())?.number
  if (last) number = last

  const created = []
  for (const p of PURCHASES) {
    number += 1
    const items = p.items.map((it) => {
      const match = byName.get(it.name)
      const productId = match ? match.id : null
      const total = roundMoney(it.cost * it.quantity)
      return { productId, name: it.name, quantity: it.quantity, cost: it.cost, total }
    })
    const total = roundMoney(items.reduce((sum, it) => sum + it.total, 0))
    const doc = {
      adminId: admin._id,
      number,
      supplier: p.supplier,
      invoice: p.invoice,
      items,
      total,
      createdBy: p.createdBy || ADMIN_EMAIL,
      createdAt: daysAgo(p.createdAgoDays),
    }
    docs.push(doc)
    created.push(doc)
  }
  await Purchase.insertMany(docs)
  return created
}

async function seedOrders(admin, catalog, operators) {
  await Order.deleteMany({ demo: true, adminId: admin._id })

  const sellers = [ADMIN_EMAIL, ...operators.map((o) => o.email)]
  const docs = STATUS_POOL.map((status, index) => {
    const items = randomItems(catalog)
    const coupon = pick(COUPON_POOL)
    const discountRate = coupon ? 10 : 0
    const totals = buildTotals(items, coupon, discountRate)
    const payer = pick(PAYER_POOL)
    const soldBy = pick(sellers)
    const isPos = status === 'approved' && index % 3 === 0
    const createdAt = daysAgo(Math.floor(Math.random() * 28), index * 7)

    const doc = {
      adminId: admin._id,
      status,
      items,
      coupon,
      subtotal: totals.subtotal,
      discount: totals.discount,
      shippingCost: totals.shippingCost,
      total: totals.total,
      demo: true,
      createdAt,
      updatedAt: createdAt,
      payerEmail: payer.email,
      payerName: payer.name,
      payerSurname: payer.surname,
      payerIdType: 'DNI',
      payerIdNumber: payer.idNumber,
      soldBy,
    }
    if (isPos) {
      doc.source = 'pos'
      doc.payment = 'efectivo'
      doc.cashReceived = roundMoney(doc.total + 1000)
      doc.change = roundMoney(doc.cashReceived - doc.total)
    } else {
      doc.source = pick(['web', 'web', 'web', 'pos'])
      if (doc.source === 'web') {
        doc.payment = pick(['tarjeta', 'transferencia'])
        if (status === 'approved') {
          doc.paymentId = 50000000 + index * 7919 + Math.floor(Math.random() * 1000)
          doc.merchantOrderId = 7000000000 + index * 12345 + Math.floor(Math.random() * 100)
        }
      }
    }
    return doc
  })
  await Order.insertMany(docs)
  return Order.find({ adminId: admin._id, demo: true }).sort({ createdAt: 1 }).lean()
}

async function seedMovements(admin, purchases, orders) {
  await StockMovement.deleteMany({ adminId: admin._id })

  const events = []
  for (const p of purchases) {
    for (const it of p.items) {
      if (!it.productId) continue
      events.push({
        createdAt: p.createdAt,
        delta: it.quantity,
        type: 'compra',
        reason: `Compra ${p.supplier} · FC ${p.invoice}`,
        ref: `#${p.number}`,
        createdBy: p.createdBy || ADMIN_EMAIL,
        productId: it.productId,
        productName: it.name,
      })
    }
  }
  for (const o of orders) {
    if (o.status !== 'approved') continue
    for (const it of o.items) {
      events.push({
        createdAt: o.createdAt,
        delta: -it.quantity,
        type: 'venta',
        reason: `Venta #${shortCode()}`,
        ref: `#${String(o._id).slice(-6)}`,
        createdBy: o.soldBy || ADMIN_EMAIL,
        productId: it.productId,
        productName: it.name,
      })
    }
  }

  const productBase = new Map(
    (await Product.find({ adminId: admin._id }).lean()).map((p) => [p.id, p.stock]),
  )
  const sumByProduct = new Map()
  for (const e of events) {
    sumByProduct.set(e.productId, (sumByProduct.get(e.productId) || 0) + e.delta)
  }
  const initial = new Map()
  for (const [productId, deltaSum] of sumByProduct) {
    initial.set(productId, (productBase.get(productId) || 0) - deltaSum)
  }
  const running = new Map(initial)

  const movements = events
    .sort((a, b) => a.createdAt - b.createdAt)
    .map((e) => {
      const before = running.get(e.productId) ?? 0
      const after = before + e.delta
      running.set(e.productId, after)
      return {
        adminId: admin._id,
        productId: e.productId,
        productName: e.productName,
        delta: e.delta,
        type: e.type,
        reason: e.reason,
        ref: e.ref,
        stockBefore: before,
        stockAfter: after,
        createdBy: e.createdBy,
        createdAt: e.createdAt,
      }
    })
  await StockMovement.insertMany(movements)
  return movements.length
}

async function run() {
  await mongoose.connect(env.mongodbUri, { dbName })
  try {
    const admin = await ensureAdmin()
    if (!admin) throw new Error('El admin elegido no se pudo crear o encontrar')

    await setUpSettingsFor(admin)
    await seedMeta(admin)
    const catalog = await seedProducts(admin)
    await seedCoupons(admin)
    const operators = await seedOperators(admin)
    const purchases = await seedPurchases(admin)
    const orders = await seedOrders(admin, catalog, operators)
    const movementCount = await seedMovements(admin, purchases, orders)

    const counts = {
      admin: ADMIN_EMAIL,
      slug: admin.businessSlug,
      categorias: await Category.countDocuments({ adminId: admin._id }),
      marcas: await Brand.countDocuments({ adminId: admin._id }),
      productos: await Product.countDocuments({ adminId: admin._id }),
      cupones: await Coupon.countDocuments({ adminId: admin._id }),
      operadores: await User.countDocuments({ role: 'operator', adminId: admin._id }),
      compras: purchases.length,
      pedidos: orders.length,
      movimientos: movementCount,
    }
    console.log('')
    console.log('Seed Cesar listo:', counts)
    console.log(`Contraseña admin "${ADMIN_PASSWORD}" · operadores "${OPERATOR_PASSWORD}"`)
    console.log(`Tienda pública: /u/${admin.businessSlug}`)
  } finally {
    await mongoose.disconnect().catch(() => {})
  }
}

run().catch((error) => {
  console.error('Seed Cesar error:', error)
  process.exit(1)
})