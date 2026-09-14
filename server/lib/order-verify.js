import { paymentService } from '../services/mercadopago.js'
import { orderStatusForPayment } from './order-status.js'
import { applyPayerFromPayment } from './payer.js'
import { deductApprovedStock } from './order-stock.js'

export async function verifyOrderPayment(order) {
  const search = await paymentService.search({
    options: {
      limit: 10,
      sort: 'date_created',
      criteria: 'desc',
      external_reference: String(order._id),
    },
  })
  const results = search?.results || []

  if (results.length > 0) {
    console.log(
      `Order refresh ${String(order._id)}: n=${results.length} [${results
        .map((p) => `${p.id}:${p.status}`)
        .join(', ')}]`,
    )
  }

  const payment = results.find((p) => p.status === 'approved') || results[0]
  if (!payment) return order

  if (payment.id) order.paymentId = payment.id
  if (payment.merchant_order_id) order.merchantOrderId = payment.merchant_order_id
  applyPayerFromPayment(order, payment)
  if (payment.status === 'approved') {
    order.status = 'approved'
  } else if (order.status === 'pending') {
    order.status = orderStatusForPayment(payment.status)
  }
  await order.save()
  if (order.status === 'approved') {
    await deductApprovedStock(order).catch((error) =>
      console.error(`Stock decrement error (order ${String(order._id)}):`, error),
    )
  }
  return order
}