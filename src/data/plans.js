export const BUSINESS_PLANS = [
  { code: 'inicial', name: 'Inicial', price: 49900 },
  { code: 'profesional', name: 'Profesional', price: 89900 },
  { code: 'negocio', name: 'Negocio', price: 149900 },
]

export const BUSINESS_PLAN_CODES = BUSINESS_PLANS.map((plan) => plan.code)

export function businessPlan(code) {
  return BUSINESS_PLANS.find((plan) => plan.code === code) || BUSINESS_PLANS[0]
}
