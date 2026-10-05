// Shared with the server: only known values can become storefront styles.
export const APPEARANCE_DEFAULTS = Object.freeze({
  primary: '#d7261d', accent: '#ffc61a', background: '#f2f4f3',
  backgroundImageUrl: '', backgroundImageMode: 'cover', backgroundImageStrength: 'soft',
  headingFont: 'anton', corners: 'classic', imageFit: 'cover',
  productCardStyle: 'classic', productsPerRow: 4, productSpacing: 'comfortable',
  showHero: true, showOffers: true, showNewArrivals: true,
  showGaming: true, showBrands: true, showMarquee: true, showWhatsapp: true, showInstagram: true,
  heroButton: 'Comprar ahora',
})

export function normalizeAppearance(input) {
  const source = input && typeof input === 'object' && !Array.isArray(input) ? input : {}
  const result = { ...APPEARANCE_DEFAULTS }
  for (const key of ['primary', 'accent', 'background']) {
    if (typeof source[key] === 'string' && /^#[0-9a-f]{6}$/i.test(source[key])) result[key] = source[key].toLowerCase()
  }
  for (const [key, choices] of Object.entries({ headingFont: ['anton', 'archivo', 'bebas', 'oswald', 'space', 'system'], corners: ['classic', 'square', 'rounded'], imageFit: ['cover', 'contain'], productCardStyle: ['classic', 'minimal', 'elevated'], productSpacing: ['compact', 'comfortable'] })) {
    if (choices.includes(source[key])) result[key] = source[key]
  }
  if ([3, 4, 5].includes(Number(source.productsPerRow))) result.productsPerRow = Number(source.productsPerRow)
  for (const [key, choices] of Object.entries({ backgroundImageMode: ['cover', 'repeat'], backgroundImageStrength: ['soft', 'medium', 'strong'] })) {
    if (choices.includes(source[key])) result[key] = source[key]
  }
  if (typeof source.backgroundImageUrl === 'string' && source.backgroundImageUrl.length <= 1000) {
    try {
      const url = new URL(source.backgroundImageUrl)
      if (url.protocol === 'https:') result.backgroundImageUrl = url.toString()
    } catch {
      result.backgroundImageUrl = ''
    }
  }
  for (const key of Object.keys(result).filter((key) => typeof result[key] === 'boolean')) {
    if (typeof source[key] === 'boolean') result[key] = source[key]
  }
  if (typeof source.heroButton === 'string' && source.heroButton.trim()) result.heroButton = source.heroButton.trim().slice(0, 40)
  return result
}

export function contrastInk(hex) {
  const rgb = hex.slice(1).match(/../g).map((part) => parseInt(part, 16) / 255)
  const [r, g, b] = rgb.map((n) => n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4)
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.179 ? '#101209' : '#ffffff'
}

export function appearanceVariables(input) {
  const a = normalizeAppearance(input)
  const [red, green, blue] = a.background.slice(1).match(/../g).map((part) => parseInt(part, 16))
  const overlayAlpha = { soft: 0.88, medium: 0.72, strong: 0.5 }[a.backgroundImageStrength]
  const cardStyle = {
    classic: { border: '1px solid var(--gal-line)', divider: '1px solid var(--gal-line)', shadow: 'none', background: '#ffffff', padding: '16px' },
    minimal: { border: '0 solid transparent', divider: '0 solid transparent', shadow: 'none', background: 'rgba(255, 255, 255, 0.72)', padding: '12px' },
    elevated: { border: '1px solid rgba(16, 18, 9, 0.06)', divider: '1px solid rgba(16, 18, 9, 0.06)', shadow: '0 12px 30px rgba(16, 18, 9, 0.12)', background: '#ffffff', padding: '16px' },
  }[a.productCardStyle]
  return {
    '--gal-facade': a.primary, '--gal-facade-deep': a.primary,
    '--gal-facade-ink': contrastInk(a.primary), '--gal-focus': a.primary,
    '--gal-tag': a.accent, '--gal-tag-ink': contrastInk(a.accent),
    '--store-page-background': a.background, '--store-background-ink': contrastInk(a.background),
    '--store-background-image': a.backgroundImageUrl ? `url(${JSON.stringify(a.backgroundImageUrl)})` : 'none',
    '--store-background-overlay': `rgba(${red}, ${green}, ${blue}, ${overlayAlpha})`,
    '--store-background-size': a.backgroundImageMode === 'repeat' ? 'auto' : 'cover',
    '--store-background-repeat': a.backgroundImageMode === 'repeat' ? 'repeat' : 'no-repeat',
    '--font-sign': {
      anton: "'Anton', 'Arial Narrow', sans-serif",
      archivo: "'Archivo', sans-serif",
      bebas: "'Bebas Neue', 'Arial Narrow', sans-serif",
      oswald: "'Oswald', 'Arial Narrow', sans-serif",
      space: "'Space Grotesk', 'Archivo', sans-serif",
      system: 'system-ui, sans-serif',
    }[a.headingFont],
    '--store-radius': { classic: '5px', square: '0px', rounded: '18px' }[a.corners],
    '--store-image-fit': a.imageFit,
    '--store-grid-columns': a.productsPerRow,
    '--store-grid-tablet-columns': Math.min(a.productsPerRow, 3),
    '--store-product-gap': a.productSpacing === 'compact' ? '10px' : '18px',
    '--store-card-border': cardStyle.border,
    '--store-card-divider': cardStyle.divider,
    '--store-card-shadow': cardStyle.shadow,
    '--store-card-background': cardStyle.background,
    '--store-card-body-padding': cardStyle.padding,
  }
}
