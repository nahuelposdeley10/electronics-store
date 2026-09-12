import express from 'express'
import { Discount } from '../models/Discount.js'
import { Coupon } from '../models/Coupon.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { clearDiscountCache } from '../lib/discounts.js'

const router = express.Router()

router.use(requireAuth)

const SCOPES = new Set(['global', 'category', 'brand', 'product'])

function parsePercent(value) {
  const n = Math.round(Number(value))
  return Number.isFinite(n) && n >= 1 && n <= 100 ? n : null
}

function parseActive(value) {
  return value === undefined ? true : !!value
}

function toDiscountDoc(d) {
  return {
    id: d._id,
    name: d.name,
    scope: d.scope,
    target: d.target || '',
    percent: d.percent,
    active: !!d.active,
    createdAt: d.createdAt,
  }
}

function toCouponDoc(c) {
  return {
    id: c._id,
    code: c.code,
    percent: c.percent,
    active: !!c.active,
    description: c.description || '',
    createdAt: c.createdAt,
  }
}

/* ---------------- Descuentos ---------------- */

router.get('/discounts', requireRole('superadmin'), async (req, res) => {
  try {
    const items = await Discount.find().sort({ createdAt: -1 }).lean()
    return res.json({ items: items.map(toDiscountDoc), total: items.length })
  } catch (error) {
    console.error('Discounts error:', error)
    return res.status(500).json({ error: 'No se pudieron leer los descuentos' })
  }
})

router.post('/discounts', requireRole('superadmin'), async (req, res) => {
  const { name, scope, target = '', percent, active } = req.body || {}

  if (!name || !String(name).trim()) {
    return res.status(400).json({ error: 'Poné un nombre para la regla de descuento' })
  }
  if (!SCOPES.has(scope)) {
    return res.status(400).json({ error: 'Ámbito inválido' })
  }
  if (scope !== 'global' && !String(target).trim()) {
    return res.status(400).json({ error: 'Indicá la categoría, marca o producto' })
  }
  const percentNum = parsePercent(percent)
  if (percentNum === null) {
    return res.status(400).json({ error: 'El porcentaje debe estar entre 1 y 100' })
  }

  try {
    const discount = await Discount.create({
      name: String(name).trim(),
      scope,
      target: String(target).trim(),
      percent: percentNum,
      active: parseActive(active),
    })
    await clearDiscountCache()
    return res.status(201).json(toDiscountDoc(discount))
  } catch (error) {
    console.error('Discounts create error:', error)
    return res.status(500).json({ error: 'No se pudo crear el descuento' })
  }
})

router.put('/discounts/:id', requireRole('superadmin'), async (req, res) => {
  try {
    const discount = await Discount.findById(req.params.id)
    if (!discount) {
      return res.status(404).json({ error: 'Descuento no encontrado' })
    }

    const { name, scope, target, percent, active } = req.body || {}

    if (name !== undefined && String(name).trim()) discount.name = String(name).trim()
    if (scope !== undefined) {
      if (!SCOPES.has(scope)) {
        return res.status(400).json({ error: 'Ámbito inválido' })
      }
      discount.scope = scope
    }
    if (target !== undefined) discount.target = String(target).trim()
    if (percent !== undefined) {
      const percentNum = parsePercent(percent)
      if (percentNum === null) {
        return res.status(400).json({ error: 'El porcentaje debe estar entre 1 y 100' })
      }
      discount.percent = percentNum
    }
    if (active !== undefined) discount.active = parseActive(active)

    if (discount.scope !== 'global' && !discount.target) {
      return res.status(400).json({ error: 'Indicá la categoría, marca o producto' })
    }

    await discount.save()
    await clearDiscountCache()
    return res.json(toDiscountDoc(discount))
  } catch (error) {
    console.error('Discounts update error:', error)
    return res.status(500).json({ error: 'No se pudo actualizar el descuento' })
  }
})

router.delete('/discounts/:id', requireRole('superadmin'), async (req, res) => {
  try {
    const discount = await Discount.findByIdAndDelete(req.params.id)
    if (!discount) {
      return res.status(404).json({ error: 'Descuento no encontrado' })
    }
    await clearDiscountCache()
    return res.json({ ok: true, id: req.params.id })
  } catch (error) {
    console.error('Discounts delete error:', error)
    return res.status(500).json({ error: 'No se pudo eliminar el descuento' })
  }
})

/* ---------------- Cupones ---------------- */

router.get('/coupons', requireRole('superadmin'), async (req, res) => {
  try {
    const items = await Coupon.find().sort({ createdAt: -1 }).lean()
    return res.json({ items: items.map(toCouponDoc), total: items.length })
  } catch (error) {
    console.error('Coupons error:', error)
    return res.status(500).json({ error: 'No se pudieron leer los cupones' })
  }
})

router.post('/coupons', requireRole('superadmin'), async (req, res) => {
  const { code, percent, active, description } = req.body || {}

  const codeClean = String(code || '').trim().toUpperCase()
  if (!codeClean) {
    return res.status(400).json({ error: 'Escribí un código de cupón' })
  }
  if (!/^[A-Z0-9_-]+$/.test(codeClean)) {
    return res.status(400).json({ error: 'El código usa solo letras, números, guiones y _' })
  }
  const percentNum = parsePercent(percent)
  if (percentNum === null) {
    return res.status(400).json({ error: 'El porcentaje debe estar entre 1 y 100' })
  }

  try {
    const exists = await Coupon.findOne({ code: codeClean })
    if (exists) {
      return res.status(409).json({ error: 'Ese código de cupón ya existe' })
    }
    const coupon = await Coupon.create({
      code: codeClean,
      percent: percentNum,
      active: parseActive(active),
      description: String(description || '').trim(),
    })
    return res.status(201).json(toCouponDoc(coupon))
  } catch (error) {
    console.error('Coupons create error:', error)
    return res.status(500).json({ error: 'No se pudo crear el cupón' })
  }
})

router.put('/coupons/:id', requireRole('superadmin'), async (req, res) => {
  try {
    const coupon = await Coupon.findById(req.params.id)
    if (!coupon) {
      return res.status(404).json({ error: 'Cupón no encontrado' })
    }

    const { code, percent, active, description } = req.body || {}

    if (code !== undefined) {
      const codeClean = String(code).trim().toUpperCase()
      if (!/^[A-Z0-9_-]+$/.test(codeClean)) {
        return res.status(400).json({ error: 'El código usa solo letras, números, guiones y _' })
      }
      const exists = await Coupon.findOne({ code: codeClean, _id: { $ne: coupon._id } })
      if (exists) {
        return res.status(409).json({ error: 'Ese código de cupón ya existe' })
      }
      coupon.code = codeClean
    }
    if (percent !== undefined) {
      const percentNum = parsePercent(percent)
      if (percentNum === null) {
        return res.status(400).json({ error: 'El porcentaje debe estar entre 1 y 100' })
      }
      coupon.percent = percentNum
    }
    if (active !== undefined) coupon.active = parseActive(active)
    if (description !== undefined) coupon.description = String(description).trim()

    await coupon.save()
    return res.json(toCouponDoc(coupon))
  } catch (error) {
    console.error('Coupons update error:', error)
    return res.status(500).json({ error: 'No se pudo actualizar el cupón' })
  }
})

router.delete('/coupons/:id', requireRole('superadmin'), async (req, res) => {
  try {
    const coupon = await Coupon.findByIdAndDelete(req.params.id)
    if (!coupon) {
      return res.status(404).json({ error: 'Cupón no encontrado' })
    }
    return res.json({ ok: true, id: req.params.id })
  } catch (error) {
    console.error('Coupons delete error:', error)
    return res.status(500).json({ error: 'No se pudo eliminar el cupón' })
  }
})

export default router