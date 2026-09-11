export function applyPayerFromPayment(order, payment) {
  const payer = payment?.payer
  if (!payer) return order

  if (payer.email && !order.payerEmail) order.payerEmail = payer.email

  const name = payer.name || payer.first_name
  const surname = payer.surname || payer.last_name
  if (name && !order.payerName) order.payerName = name
  if (surname && !order.payerSurname) order.payerSurname = surname

  if (payer.identification) {
    if (payer.identification.number) {
      order.payerIdNumber = String(payer.identification.number)
    }
    if (payer.identification.type) order.payerIdType = payer.identification.type
  }

  return order
}