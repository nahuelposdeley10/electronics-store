import './styles.css'

const ASSETS = {
  full: '/images/brand/tienda-bnp-logo.png',
  mark: '/images/brand/tienda-bnp-icon.png',
}

export default function BrandLogo({ variant = 'full', className = '', alt = 'Tienda BNP' }) {
  const asset = ASSETS[variant] || ASSETS.full
  return (
    <img
      className={`brand-logo brand-logo-${variant}${className ? ` ${className}` : ''}`}
      src={asset}
      alt={alt}
      width={variant === 'mark' ? 512 : 1536}
      height={variant === 'mark' ? 512 : 384}
      decoding="async"
    />
  )
}
