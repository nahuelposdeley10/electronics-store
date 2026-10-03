import { BUSINESS_PLANS, BUSINESS_PLAN_CODES } from '../../src/data/plans.js'
import { Subscription } from '../models/Subscription.js'

export const PLAN_PERMISSIONS = {
  inicial: [
    'settings.manage',
    'catalog.manage',
    'coupons.manage',
    'offers.manage',
  ],
  profesional: [
    'settings.manage',
    'catalog.manage',
    'coupons.manage',
    'offers.manage',
    'inventory.read',
    'sales.read',
    'reports.view',
    'sales.return',
    'quotes.delete',
    'cash.manage',
    'pos.manage',
  ],
  negocio: [
    'settings.manage',
    'users.manage',
    'catalog.manage',
    'coupons.manage',
    'offers.manage',
    'inventory.read',
    'inventory.write',
    'sales.read',
    'reports.view',
    'sales.return',
    'quotes.delete',
    'cash.manage',
    'pos.manage',
  ],
}

export function planByCode(code) {
  return BUSINESS_PLANS.find((plan) => plan.code === code) || null
}

export function normalizePlanCode(value) {
  const code = String(value || '').trim().toLowerCase()
  return BUSINESS_PLAN_CODES.includes(code) ? code : null
}

export function inferPlanCode(subscription) {
  const explicit = normalizePlanCode(subscription?.planCode)
  if (explicit) return explicit
  const name = String(subscription?.plan || '').trim().toLowerCase()
  if (name.includes('negocio')) return 'negocio'
  if (name.includes('profesional')) return 'profesional'
  if (name.includes('inicial')) return 'inicial'
  return null
}

export function permissionsForPlan(code) {
  return new Set(PLAN_PERMISSIONS[normalizePlanCode(code)] || [])
}

export function planIncludes(code, feature) {
  const normalized = normalizePlanCode(code)
  if (feature === 'onlinePayments') return normalized === 'profesional' || normalized === 'negocio'
  if (feature === 'team') return normalized === 'negocio'
  if (feature === 'advancedInventory') return normalized === 'negocio'
  return true
}

export async function getTenantPlan(tenant) {
  if (!tenant || !/^[a-f\d]{24}$/i.test(String(tenant))) return { code: null, legacy: true, includes: () => true }
  const subscription = await Subscription.findOne({ adminId: tenant }).lean()
  const code = inferPlanCode(subscription)
  return { code, legacy: !code, includes: (feature) => code ? planIncludes(code, feature) : true }
}
