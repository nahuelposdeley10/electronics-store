export function productImages(product) {
  return product?.images?.length ? [...product.images] : product?.image ? [product.image] : []
}

export function retainedProductImages(raw, product, fileCount = 0) {
  const existing = productImages(product)
  let retained
  try { retained = raw === undefined ? (fileCount ? [] : existing) : JSON.parse(raw) } catch { retained = null }
  if (!Array.isArray(retained) || retained.some((url) => typeof url !== 'string' || !existing.includes(url)) || new Set(retained).size !== retained.length) {
    throw Object.assign(new Error('Las imágenes conservadas no son válidas'), { status: 400 })
  }
  if (retained.length + fileCount > 3) throw Object.assign(new Error('Cada producto admite hasta 3 imágenes'), { status: 400 })
  return retained
}
