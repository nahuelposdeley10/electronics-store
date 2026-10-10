import forge from 'node-forge'
import { ArcaCredential } from '../models/ArcaCredential.js'
import { decryptArcaSecret, encryptArcaSecret } from '../lib/arca-crypto.js'
import { getSettings } from '../lib/settings.js'

const WSAA_URLS = {
  homologation: 'https://wsaahomo.afip.gov.ar/ws/services/LoginCms',
  production: 'https://wsaa.afip.gov.ar/ws/services/LoginCms',
}

const WSFE_URLS = {
  homologation: 'https://wswhomo.afip.gov.ar/wsfev1/service.asmx',
  production: 'https://servicios1.afip.gov.ar/wsfev1/service.asmx',
}

const CBTE_TYPES = { A: 1, B: 6, C: 11 }
const DOC_TYPES = { CUIT: 80, CUIL: 86, DNI: 96, CDI: 87, consumidor_final: 99 }
const tokenCache = new Map()

export class ArcaError extends Error {
  constructor(message, details = []) {
    super(message)
    this.name = 'ArcaError'
    this.details = details
  }
}

function xmlEscape(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
}

function tag(xml, name) {
  const match = String(xml || '').match(new RegExp(`<(?:(?:[A-Za-z_][\\w.-]*):)?${name}[^>]*>([\\s\\S]*?)</(?:(?:[A-Za-z_][\\w.-]*):)?${name}>`, 'i'))
  return match ? match[1].trim() : ''
}

function tags(xml, name) {
  const expression = new RegExp(`<(?:(?:[A-Za-z_][\\w.-]*):)?${name}[^>]*>([\\s\\S]*?)</(?:(?:[A-Za-z_][\\w.-]*):)?${name}>`, 'gi')
  return [...String(xml || '').matchAll(expression)].map((match) => match[1].trim())
}

function unescapeXml(value) {
  return String(value || '')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&apos;', "'")
    .replaceAll('&amp;', '&')
}

function soapErrors(xml) {
  const errors = []
  for (const block of tags(xml, 'Err')) {
    errors.push({ code: tag(block, 'Code'), message: unescapeXml(tag(block, 'Msg')) })
  }
  const fault = tag(xml, 'Fault')
  if (fault) errors.push({ code: 'SOAP_FAULT', message: unescapeXml(tag(fault, 'faultstring') || fault.replace(/<[^>]+>/g, ' ')) })
  return errors.filter((item) => item.message)
}

function throwIfErrors(xml, context) {
  const errors = soapErrors(xml)
  if (errors.length) {
    const message = errors.map((item) => `${item.code ? `[${item.code}] ` : ''}${item.message}`).join(' · ')
    throw new ArcaError(`${context}: ${message}`, errors)
  }
}

function isoUtc(date) {
  return new Date(date).toISOString().replace(/\.\d{3}Z$/, 'Z')
}

function formatDate(date = new Date()) {
  const current = new Date(date)
  return `${current.getUTCFullYear()}${String(current.getUTCMonth() + 1).padStart(2, '0')}${String(current.getUTCDate()).padStart(2, '0')}`
}

function amount(value) {
  return Number(Number(value || 0).toFixed(2)).toFixed(2)
}

function credentialSummary(doc) {
  if (!doc) return { configured: false, enabled: false, environment: 'homologation' }
  return {
    configured: true,
    enabled: doc.enabled === true,
    environment: doc.environment,
    cuit: doc.cuit,
    defaultType: doc.defaultType,
    pointOfSale: doc.pointOfSale || '',
    certificateConfigured: Boolean(doc.certificate),
    privateKeyConfigured: Boolean(doc.privateKey),
    lastTestAt: doc.lastTestAt,
    lastTestStatus: doc.lastTestStatus,
    lastError: doc.lastError || null,
  }
}

function validatePem(value, type) {
  const text = String(value || '').trim()
  if (!text.includes('-----BEGIN ') || !text.includes('-----END ')) {
    throw new ArcaError(`${type} inválido: pegá el contenido PEM completo`)
  }
  return text
}

export async function getArcaStatus(tenant) {
  const doc = await ArcaCredential.findOne({ adminId: tenant }).lean()
  return credentialSummary(doc)
}

export async function saveArcaCredentials({ tenant, input = {} }) {
  const current = await ArcaCredential.findOne({ adminId: tenant })
  const environment = ['homologation', 'production'].includes(input.environment) ? input.environment : current?.environment || 'homologation'
  const cuit = String(input.cuit || current?.cuit || '').replace(/\D/g, '').slice(0, 11)
  const defaultType = ['A', 'B', 'C'].includes(String(input.defaultType || '').toUpperCase())
    ? String(input.defaultType).toUpperCase()
    : current?.defaultType || 'B'
  const pointOfSale = String(input.pointOfSale || current?.pointOfSale || '').replace(/\D/g, '').slice(0, 5)
  if (cuit.length !== 11) throw new ArcaError('El CUIT ARCA debe tener 11 dígitos')

  const certificate = String(input.certificatePem || '').trim()
    ? encryptArcaSecret(validatePem(input.certificatePem, 'El certificado'))
    : current?.certificate
  const privateKey = String(input.privateKeyPem || '').trim()
    ? encryptArcaSecret(validatePem(input.privateKeyPem, 'La clave privada'))
    : current?.privateKey
  if (!certificate || !privateKey) throw new ArcaError('Faltan el certificado y la clave privada de ARCA')

  const saved = await ArcaCredential.findOneAndUpdate(
    { adminId: tenant },
    {
      $set: {
        environment,
        cuit,
        certificate,
        privateKey,
        defaultType,
        pointOfSale,
        enabled: input.enabled === undefined ? current?.enabled === true : input.enabled === true,
        lastError: null,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  ).lean()
  tokenCache.delete(`${String(tenant)}:${environment}`)
  return credentialSummary(saved)
}

async function loadCredential(tenant) {
  const doc = await ArcaCredential.findOne({ adminId: tenant }).lean()
  if (!doc?.enabled) throw new ArcaError('ARCA no está habilitada para este negocio')
  try {
    return {
      ...doc,
      certificatePem: decryptArcaSecret(doc.certificate),
      privateKeyPem: decryptArcaSecret(doc.privateKey),
    }
  } catch (error) {
    if (error.status) throw error
    throw new ArcaError('No se pudieron descifrar las credenciales ARCA de este negocio')
  }
}

async function signTra({ certificatePem, privateKeyPem, tra }) {
  try {
    const certificate = forge.pki.certificateFromPem(certificatePem)
    const privateKey = forge.pki.privateKeyFromPem(privateKeyPem)
    const signedData = forge.pkcs7.createSignedData()
    signedData.content = forge.util.createBuffer(tra, 'utf8')
    signedData.addCertificate(certificate)
    signedData.addSigner({
      key: privateKey,
      certificate,
      digestAlgorithm: forge.pki.oids.sha256,
      authenticatedAttributes: [
        { type: forge.pki.oids.contentType, value: forge.pki.oids.data },
        { type: forge.pki.oids.messageDigest },
        { type: forge.pki.oids.signingTime, value: new Date() },
      ],
    })
    signedData.sign({ detached: false })
    return forge.util.encode64(forge.asn1.toDer(signedData.toAsn1()).getBytes())
  } catch (error) {
    const detail = String(error?.message || '')
    throw new ArcaError(`No se pudo firmar el acceso a ARCA${detail ? `: ${detail.slice(0, 300)}` : ''}`)
  }
}

async function soapRequest(url, action, body) {
  const envelope = `<?xml version="1.0" encoding="UTF-8"?>\n<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">\n<soapenv:Header/>\n<soapenv:Body>${body}</soapenv:Body>\n</soapenv:Envelope>`
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'text/xml; charset=utf-8',
      SOAPAction: `"http://ar.gov.afip.dif.FEV1/${action}"`,
    },
    body: envelope,
    signal: AbortSignal.timeout(20_000),
  })
  const text = await response.text()
  if (!response.ok) throw new ArcaError(`ARCA respondió HTTP ${response.status}`)
  return text
}

async function wsaaRequest(url, cms) {
  const envelope = `<?xml version="1.0" encoding="UTF-8"?>\n<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"><soapenv:Header/><soapenv:Body><loginCms xmlns="http://wsaa.afip.gov.ar/ws/services/LoginCms"><in0>${xmlEscape(cms)}</in0></loginCms></soapenv:Body></soapenv:Envelope>`
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'text/xml; charset=utf-8',
      SOAPAction: '""',
    },
    body: envelope,
    signal: AbortSignal.timeout(20_000),
  })
  const xml = await response.text()
  if (!response.ok) throw new ArcaError(`WSAA respondió HTTP ${response.status}`)
  return xml
}

async function getAuth(credential, force = false) {
  const cacheKey = `${String(credential.adminId)}:${credential.environment}`
  const cached = tokenCache.get(cacheKey)
  if (!force && cached && cached.expiresAt > Date.now() + 120_000) return cached

  const now = Date.now()
  const tra = `<loginTicketRequest version="1.0"><header><uniqueId>${Math.floor(now / 1000)}</uniqueId><generationTime>${isoUtc(now - 60_000)}</generationTime><expirationTime>${isoUtc(now + 10 * 60 * 1000)}</expirationTime></header><service>wsfe</service></loginTicketRequest>`
  const cms = await signTra({ certificatePem: credential.certificatePem, privateKeyPem: credential.privateKeyPem, tra })
  const xml = await wsaaRequest(WSAA_URLS[credential.environment], cms)
  const loginReturn = unescapeXml(tag(xml, 'loginCmsReturn'))
  const loginTicket = tag(loginReturn, 'loginTicketResponse') || tag(xml, 'loginTicketResponse') || loginReturn || xml
  const token = tag(loginTicket, 'token')
  const sign = tag(loginTicket, 'sign')
  if (!token || !sign) throw new ArcaError(`WSAA no devolvió un ticket válido${soapErrors(xml).length ? `: ${soapErrors(xml).map((item) => item.message).join(' · ')}` : ''}`)
  const result = { token: unescapeXml(token), sign: unescapeXml(sign), expiresAt: Date.now() + 10 * 60 * 60 * 1000 }
  tokenCache.set(cacheKey, result)
  return result
}

async function wsfe(credential, action, body, forceAuth = false) {
  const auth = await getAuth(credential, forceAuth)
  const request = `<ar:${action} xmlns:ar="http://ar.gov.afip.dif.FEV1/"><ar:Auth><ar:Token>${xmlEscape(auth.token)}</ar:Token><ar:Sign>${xmlEscape(auth.sign)}</ar:Sign><ar:Cuit>${xmlEscape(credential.cuit)}</ar:Cuit></ar:Auth>${body}</ar:${action}>`
  const xml = await soapRequest(WSFE_URLS[credential.environment], action, request)
  throwIfErrors(xml, `ARCA ${action}`)
  return xml
}

export async function testArcaConnection(tenant) {
  const credential = await loadCredential(tenant)
  const xml = await wsfe(credential, 'FEParamGetPtosVenta', '<ar:FEParamGetPtosVentaReq/>')
  return { ok: true, environment: credential.environment, pointOfSaleCount: tags(xml, 'PtoVenta').length }
}

function invoiceAmounts(order, settings, type) {
  if (type === 'C') return { total: amount(order.total), net: '0.00', iva: '0.00', includeIva: false }
  const rate = Number(settings.fiscal?.vatRate) || 21
  const net = Number((Number(order.total || 0) / (1 + rate / 100)).toFixed(2))
  return { total: amount(order.total), net: amount(net), iva: amount(Number(order.total || 0) - net), includeIva: true, rate }
}

function buyerDocument(order) {
  const rawType = String(order.payerIdType || '').trim().toUpperCase()
  const docType = DOC_TYPES[rawType] || DOC_TYPES.consumidor_final
  const docNumber = String(order.payerIdNumber || '').replace(/\D/g, '') || '0'
  return { docType, docNumber }
}

async function nextArcaNumber(credential, pointOfSale, cbteType) {
  const xml = await wsfe(credential, 'FECompUltimoAutorizado', `<ar:PtoVta>${pointOfSale}</ar:PtoVta><ar:CbteTipo>${cbteType}</ar:CbteTipo>`)
  const last = Number(tag(xml, 'CbteNro') || 0)
  return last + 1
}

async function consultArcaNumber(credential, pointOfSale, cbteType, number) {
  const xml = await wsfe(credential, 'FECompConsultar', `<ar:FeCompConsReq><ar:CbteTipo>${cbteType}</ar:CbteTipo><ar:PtoVta>${pointOfSale}</ar:PtoVta><ar:CbteNro>${number}</ar:CbteNro></ar:FeCompConsReq>`)
  const result = tag(xml, 'FECompConsResponse') || tag(xml, 'ResultGet') || xml
  const cae = tag(result, 'CodAutorizacion') || tag(result, 'CAE')
  const status = tag(result, 'Resultado')
  if (status !== 'A' || !cae) return null
  return {
    cae: unescapeXml(cae),
    caeDueDate: unescapeXml(tag(result, 'FchVto') || tag(result, 'CAEFchVto')),
    number,
  }
}

async function requestCae(credential, { order, settings, pointOfSale, cbteType, number, type }) {
  const buyer = buyerDocument(order)
  const amounts = invoiceAmounts(order, settings, type)
  const iva = amounts.includeIva
    ? `<ar:Iva><ar:AlicIva><ar:Id>5</ar:Id><ar:BaseImp>${amounts.net}</ar:BaseImp><ar:Importe>${amounts.iva}</ar:Importe></ar:AlicIva></ar:Iva>`
    : ''
  const body = `<ar:FeCAEReq><ar:FeCabReq><ar:CantReg>1</ar:CantReg><ar:PtoVta>${pointOfSale}</ar:PtoVta><ar:CbteTipo>${cbteType}</ar:CbteTipo></ar:FeCabReq><ar:FeDetReq><ar:FECAEDetRequest><ar:Concepto>1</ar:Concepto><ar:DocTipo>${buyer.docType}</ar:DocTipo><ar:DocNro>${buyer.docNumber}</ar:DocNro><ar:CbteDesde>${number}</ar:CbteDesde><ar:CbteHasta>${number}</ar:CbteHasta><ar:CbteFch>${formatDate(order.createdAt || new Date())}</ar:CbteFch><ar:ImpTotal>${amounts.total}</ar:ImpTotal><ar:ImpTotConc>0.00</ar:ImpTotConc><ar:ImpNeto>${amounts.net}</ar:ImpNeto><ar:ImpOpEx>0.00</ar:ImpOpEx><ar:ImpIVA>${amounts.iva}</ar:ImpIVA><ar:ImpTrib>0.00</ar:ImpTrib><ar:MonId>PES</ar:MonId><ar:MonCotiz>1.000000</ar:MonCotiz>${iva}</ar:FECAEDetRequest></ar:FeDetReq></ar:FeCAEReq>`
  const xml = await wsfe(credential, 'FECAESolicitar', body)
  const result = tag(xml, 'FECAEDetResponse') || xml
  const status = tag(result, 'Resultado')
  const cae = tag(result, 'CAE')
  if (status !== 'A' || !cae) {
    const errors = soapErrors(xml)
    throw new ArcaError(`ARCA rechazó el comprobante${errors.length ? `: ${errors.map((item) => item.message).join(' · ')}` : ''}`, errors)
  }
  return { cae: unescapeXml(cae), caeDueDate: unescapeXml(tag(result, 'CAEFchVto')), number, type }
}

export async function issueArcaOrder({ tenant, order }) {
  const [credential, settings] = await Promise.all([loadCredential(tenant), getSettings({ fresh: true, tenant })])
  const type = String(settings.fiscal?.defaultType || credential.defaultType || 'B').toUpperCase()
  const cbteType = CBTE_TYPES[type]
  const pointOfSale = Number(settings.fiscal?.pointOfSale || credential.pointOfSale)
  if (!cbteType) throw new ArcaError(`Tipo de comprobante ARCA no soportado: ${type}`)
  if (!Number.isInteger(pointOfSale) || pointOfSale < 1) throw new ArcaError('Configurá un punto de venta ARCA válido')

  const firstNumber = await nextArcaNumber(credential, pointOfSale, cbteType)
  let result
  try {
    result = await requestCae(credential, { order, settings, pointOfSale, cbteType, number: firstNumber, type })
  } catch (error) {
    if (!(error instanceof ArcaError)) throw error
    const recovered = await consultArcaNumber(credential, pointOfSale, cbteType, firstNumber).catch(() => null)
    if (!recovered) throw error
    result = { ...recovered, type }
  }
  return {
    mode: 'arca',
    status: 'issued',
    providerName: 'ARCA WSFEv1',
    cuit: credential.cuit,
    ivaCondition: settings.fiscal?.ivaCondition || null,
    pointOfSale: String(pointOfSale).padStart(5, '0'),
    defaultType: type,
    vatRate: Number(settings.fiscal?.vatRate) || 21,
    type: result.type,
    number: String(result.number).padStart(8, '0'),
    cae: result.cae,
    caeDueDate: result.caeDueDate || null,
    issuedAt: new Date(),
    error: null,
  }
}

export async function invalidateArcaToken(tenant, environment) {
  tokenCache.delete(`${String(tenant)}:${environment}`)
}

export function publicArcaError(error) {
  if (error instanceof ArcaError) return { error: error.message, details: error.details || [] }
  return { error: 'No se pudo comunicar con ARCA' }
}
