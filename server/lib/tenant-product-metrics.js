export function productMetricKey(adminId, productId) {
  return `${adminId ? String(adminId) : 'global'}:${productId}`
}

export function aggregateSoldUnits(orders = []) {
  const sold = new Map()
  for (const order of orders) {
    for (const item of order.items || []) {
      const key = productMetricKey(order.adminId, item.productId)
      sold.set(key, (sold.get(key) || 0) + Number(item.quantity || 0))
    }
  }
  return sold
}
