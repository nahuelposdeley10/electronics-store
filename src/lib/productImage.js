export const DEFAULT_PRODUCT_IMAGE = '/images/products/default.svg'

export function productImage(image) {
  return image || DEFAULT_PRODUCT_IMAGE
}