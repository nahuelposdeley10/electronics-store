export function payerFieldsFromPayment(order, payment) {
  const fields = {}
  const payer = payment?.payer
  if (!payer) return fields

  if (payer.email && !order.payerEmail) fields.payerEmail = payer.email

  const name = payer.name || payer.first_name
  const surname = payer.surname || payer.last_name
  if (name && !order.payerName) fields.payerName = name
  if (surname && !order.payerSurname) fields.payerSurname = surname

  if (payer.identification) {
    if (payer.identification.number) {
      fields.payerIdNumber = String(payer.identification.number)
    }
    if (payer.identification.type) fields.payerIdType = payer.identification.type
  }

  return fields
}

export function applyPayerFromPayment(order, payment) {
  return Object.assign(order, payerFieldsFromPayment(order, payment))
}