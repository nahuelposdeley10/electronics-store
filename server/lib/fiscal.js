export const FISCAL_MODES = ['external', 'internal', 'arca']

export const FISCAL_MODE_LABELS = {
  external: 'Facturación externa',
  internal: 'Gestión interna sin comprobante fiscal',
  arca: 'ARCA integrada',
}

export const FISCAL_DEFAULTS = {
  mode: 'external',
  providerName: '',
  cuit: '',
  ivaCondition: '',
  pointOfSale: '',
  defaultType: 'B',
  vatRate: 21,
}

export function normalizeFiscalSettings(input = {}) {
  const mode = FISCAL_MODES.includes(String(input.mode || '').trim())
    ? String(input.mode).trim()
    : FISCAL_DEFAULTS.mode
  return {
    mode,
    providerName: String(input.providerName || '').trim().slice(0, 120),
    cuit: String(input.cuit || '').replace(/\D/g, '').slice(0, 11),
    ivaCondition: String(input.ivaCondition || '').trim().slice(0, 80),
    pointOfSale: String(input.pointOfSale || '').replace(/\D/g, '').slice(0, 5),
    defaultType: ['A', 'B', 'C'].includes(String(input.defaultType || '').toUpperCase())
      ? String(input.defaultType).toUpperCase()
      : FISCAL_DEFAULTS.defaultType,
    vatRate: Math.max(0, Math.min(100, Number(input.vatRate) || FISCAL_DEFAULTS.vatRate)),
  }
}

export function fiscalSnapshot(settings = {}) {
  const normalized = normalizeFiscalSettings(settings)
  const status = normalized.mode === 'internal'
    ? 'not_applicable'
    : normalized.mode === 'arca'
      ? 'arca_pending'
      : 'external_pending'
  return {
    mode: normalized.mode,
    status,
    providerName: normalized.providerName || null,
    cuit: normalized.cuit || null,
    ivaCondition: normalized.ivaCondition || null,
    pointOfSale: normalized.pointOfSale || null,
    type: null,
    number: null,
    cae: null,
    caeDueDate: null,
    issuedAt: null,
    error: null,
  }
}
