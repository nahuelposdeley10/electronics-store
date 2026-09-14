import mongoose from 'mongoose'
import { User } from '../models/User.js'

const slugCache = new Map()
const CACHE_MS = 60 * 1000

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
    const error = new Error('Elegí un negocio para esta operación')
    error.status = 400
    throw error
  }
  return tenant
}

export async function slugToAdminId(slug) {
  const clean = String(slug || '').trim().toLowerCase()
  if (!clean) return null
  const cached = slugCache.get(clean)
  if (cached && Date.now() - cached.at < CACHE_MS) return cached.id
  const admin = await User.findOne({
    role: 'admin',
    businessSlug: clean,
    active: true,
  })
    .select('_id')
    .lean()
  const id = admin ? admin._id : null
  slugCache.set(clean, { id, at: Date.now() })
  return id
}

export async function publicTenantId(req) {
  const slug = String(req.get('x-tenant-slug') || '').trim().toLowerCase()
  return slug ? slugToAdminId(slug) : null
}