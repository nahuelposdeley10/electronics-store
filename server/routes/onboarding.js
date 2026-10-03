import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { User } from '../models/User.js'
import { Setting } from '../models/Setting.js'
import { Onboarding } from '../models/Onboarding.js'
import { castId } from '../lib/tenant.js'
import { permissionsForUser } from '../lib/settings.js'
import { getOnboarding, publicOnboarding, ONBOARDING_STEPS, signature, validEmail, validWhatsapp } from '../lib/onboarding.js'

const router = Router()
const fail = (message, status = 400) => Object.assign(new Error(message), { status })

router.use(requireAuth, async (req, res, next) => {
  try {
    const actor = await User.findById(req.user.sub).lean()
    if (!actor?.active || actor.role !== req.user.role || !['admin', 'superadmin'].includes(actor.role)) {
      throw fail('Solo el administrador del negocio puede configurar la puesta en marcha', 403)
    }
    // Admins never accept tenant IDs supplied by the client; superadmins must select one.
    const id = actor.role === 'superadmin' ? castId(req.query.tenant) : actor._id
    if (!id) throw fail('Elegí un negocio para configurar su puesta en marcha')
    const business = await User.findOne({ _id: id, role: 'admin', active: true }).lean()
    if (!business) throw fail('Negocio no disponible', 404)
    const perms = await permissionsForUser(actor, id)
    if (!perms.includes('settings.manage')) throw fail('No tenés permiso para configurar el negocio', 403)
    req.onboardingBusiness = business
    next()
  } catch (error) { next(error) }
})

router.get('/', async (req, res, next) => {
  try {
    res.set('Cache-Control', 'no-store').json(publicOnboarding(await getOnboarding(req.onboardingBusiness)))
  } catch (error) { next(error) }
})

router.put('/', async (req, res, next) => {
  try {
    const business = req.onboardingBusiness
    const adminId = business._id
    const { action, value } = req.body || {}
    const status = await getOnboarding(business)
    let update = {}
    let settingsUpdate = null
    if (action === 'visit') {
      if (!ONBOARDING_STEPS.includes(value)) throw fail('Paso inválido')
      update = { lastStep: value, ...(req.user.role === 'admin' ? { paused: false } : {}) }
    } else if (action === 'pause' || action === 'resume') {
      update = { paused: action === 'pause' }
    } else if (action === 'business') {
      if (!value || typeof value !== 'object') throw fail('Completá los datos de tu negocio')
      const name = String(value.name || '').trim()
      const email = String(value.email || '').trim()
      const whatsapp = String(value.whatsapp || '').replace(/[\s()+-]/g, '')
      if (name.length < 2 || name.length > 100 || name === 'TechStore') throw fail('Ingresá el nombre de tu negocio, no el nombre de ejemplo')
      if ((email && (!validEmail(email) || email.length > 150)) || (whatsapp && !validWhatsapp(whatsapp))) throw fail('Revisá el email y el WhatsApp con código de país')
      if (!email && !whatsapp) throw fail('Ingresá al menos un email o WhatsApp de contacto')
      if (email === 'hola@tienda.com.ar' || whatsapp === '5491155554294') throw fail('Reemplazá los datos de contacto de ejemplo')
      const extraContact = {}
      for (const field of ['phone', 'addressFull', 'addressShort', 'hours']) {
        if (value[field] === undefined) continue
        if (typeof value[field] !== 'string' || value[field].length > 300) throw fail('Revisá los datos de contacto: máximo 300 caracteres por campo')
        extraContact[`value.store.${field}`] = value[field].trim()
      }
      if (!business.businessSlug) {
        const slug = String(value.slug || '').trim().toLowerCase()
        if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length < 3 || slug.length > 60) throw fail('La dirección debe tener entre 3 y 60 letras, números o guiones')
        try {
          await User.updateOne({ _id: adminId, $or: [{ businessSlug: { $exists: false } }, { businessSlug: '' }, { businessSlug: null }] }, { $set: { businessSlug: slug } })
        } catch (error) {
          if (error.code === 11000) throw fail('Esa dirección ya pertenece a otro negocio', 409)
          throw error
        }
        business.businessSlug = (await User.findById(adminId).lean()).businessSlug
      }
      settingsUpdate = { 'value.store.name': name, 'value.store.email': email, 'value.store.whatsapp': whatsapp, ...extraContact }
      update = { lastStep: 'catalog', paused: false }
    } else if (action === 'payments') {
      if (!['mercadopago', 'whatsapp'].includes(value)) throw fail('Elegí un canal de cobro')
      if (value === 'whatsapp' && !validWhatsapp(status.contact.whatsapp)) throw fail('Primero guardá un WhatsApp válido en los datos del negocio')
      // Targeted field update: never read/round-trip credentials through this wizard.
      settingsUpdate = { 'value.payments.online': value === 'mercadopago' }
      update = { paused: false }
    } else if (action === 'shipping') {
      if (!value || typeof value.enabled !== 'boolean') throw fail('Elegí cómo vas a entregar los pedidos')
      const { enabled } = value
      const cost = Number(value.cost)
      const freeThreshold = Number(value.freeThreshold)
      const label = String(value.label || '').trim()
      if (![cost, freeThreshold].every((n) => Number.isFinite(n) && n >= 0 && n <= 100000000) || !label || label.length > 100) throw fail('Revisá el nombre y los importes de envío')
      const shipping = { enabled, cost: Math.round(cost * 100) / 100, freeThreshold: Math.round(freeThreshold * 100) / 100, label }
      settingsUpdate = { 'value.shipping': shipping }
      update = { shippingSignature: signature(shipping), lastStep: 'review', paused: false }
    } else if (action === 'finish') {
      if (!status.ready) throw fail('Todavía hay pasos pendientes. Revisá la configuración antes de finalizar.', 409)
      update = { reviewSignature: status.reviewSignature, completedAt: new Date(), lastStep: 'review', paused: false }
    } else {
      throw fail('Acción de puesta en marcha inválida')
    }
    if (settingsUpdate) await Setting.updateOne({ key: 'base', adminId }, { $set: settingsUpdate })
    await Onboarding.updateOne({ adminId }, { $set: update }, { upsert: true, runValidators: true })
    res.set('Cache-Control', 'no-store').json(publicOnboarding(await getOnboarding(business)))
  } catch (error) { next(error) }
})

export default router
