import mongoose from 'mongoose'
import { User } from '../models/User.js'


export function castId(value) {
  if (!value) return null
  try {
    return new mongoose.Types.ObjectId(value)
  } catch {
    return null
  }
}

function isObjectId(value) {
  return castId(value) != null
}

export function tenantIdOf(req) {
  if (req.user?.role === 'superadmin') {
    if (req.query && req.query.tenant && isObjectId(req.query.tenant)) {
      return castId(req.query.tenant)
    }
    return null
  }
  if (req.user?.role === 'admin') {
    return castId(req.user.adminId) || castId(req.user.sub)
  }
  return castId(req.user?.adminId) || null
}

export function tenantScopeOf(req) {
  const tenant = tenantIdOf(req)
  return tenant ? { adminId: tenant } : {}
}

export function requireTenantIdOf(req) {
  const tenant = tenantIdOf(req)
  if (!tenant) {
    if (req.user?.role === 'superadmin' && req.method === 'GET' && !req.query?.tenant) return null
    const error = new Error('Elegí un negocio para esta operación')
    error.status = 400
    throw error
  }
  return tenant
}

export async function slugToAdminId(slug) {
  const clean = String(slug || '').trim().toLowerCase()
  if (!clean) return null
  const admin = await User.findOne({
    role: 'admin',
    businessSlug: clean,
    active: true,
  })
    .select('_id')
    .lean()
  const id = admin ? admin._id : null
  return id
}

export async function publicTenantId(req) {
  if (Object.hasOwn(req, 'resolvedPublicTenant')) return req.resolvedPublicTenant
  const slug = String(req.get('x-tenant-slug') || '').trim().toLowerCase()
  if (!slug) return null
  const tenant = await slugToAdminId(slug)
  if (!tenant) throw Object.assign(new Error('Tienda no disponible'), { status: 404, code: 'STORE_UNAVAILABLE' })
  req.resolvedPublicTenant = tenant
  return tenant
}
export async function requirePublicTenant(req, res, next) {
  try {
    await publicTenantId(req)
    next()
  } catch (error) {
    if (error.code === 'STORE_UNAVAILABLE') return res.status(404).json({ error: 'Tienda no disponible', code: error.code })
    next(error)
  }
}
