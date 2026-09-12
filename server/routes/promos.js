import express from 'express'
import { Coupon } from '../models/Coupon.js'
import { requireAuth, requireRole } from '../middleware/auth.js'

const router = express.Router()

router.use(requireAuth)

function parsePercent(value) {
  const n = Math.round(Number(value))
  return Number.isFinite(n) && n >= 1 && n <= 100 ? n : null
}

function parseActive(value) {
  return value === undefined ? true : !!value
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