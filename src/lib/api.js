import { tenantUrl } from './tenant.js'

export class ApiError extends Error {
  constructor(message, code) {
    super(message)
    this.name = 'ApiError'
    this.code = code
  }
}

const REQUEST_TIMEOUT = 20000
const SLOW_SERVER = 'El servidor tardó demasiado; reintentalo'

function requestSignal() {
  return AbortSignal.timeout(REQUEST_TIMEOUT)
}

function netError(error, fallback) {
  if (error?.name === 'TimeoutError') {
    return new ApiError(SLOW_SERVER, 'NETWORK')
  }
  return new ApiError(fallback, 'NETWORK')
}

const TOKEN_STORAGE = 'ts-token'
const USER_STORAGE = 'ts-user'

export function storeSession({ token, user }) {
  sessionStorage.setItem(TOKEN_STORAGE, token)
  sessionStorage.setItem(USER_STORAGE, JSON.stringify(user))
}

export function getSession() {
  try {
    return {
      token: sessionStorage.getItem(TOKEN_STORAGE),
      user: JSON.parse(sessionStorage.getItem(USER_STORAGE)),
    }
  } catch {
    return { token: null, user: null }
  }
}

export function clearSession() {
  sessionStorage.removeItem(TOKEN_STORAGE)
  sessionStorage.removeItem(USER_STORAGE)
}

export async function login(email, password) {
  let res
  try {
    res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
      signal: requestSignal(),
    })
  } catch {
    throw netError('No se pudo conectar con el servidor')
  }

  const data = await res.json().catch(() => ({}))

  if (res.status === 401) {
    throw new ApiError(data.error || 'Email o contraseña incorrectos', 'AUTH')
  }
  if (!res.ok) {
    throw new ApiError(data.error || 'No se pudo iniciar sesión', 'ERROR')
  }

  storeSession(data)
  return data.user
}

export async function apiGet(path) {
  const headers = {}
  const { token, user } = getSession()
  if (token) headers.Authorization = `Bearer ${token}`

  let res
  try {
    res = await fetch(tenantUrl(path, user), { headers, signal: requestSignal() })
  } catch {
    throw netError('No se pudo conectar con el servidor')
  }

  if (res.status === 401) {
    throw new ApiError('Sesión requerida', 'AUTH')
  }
  if (res.status === 403) {
    throw new ApiError('No tenés permiso para esto', 'FORBIDDEN')
  }
  if (!res.ok) {
    throw new ApiError('No se pudo traer la información', 'ERROR')
  }
  return res.json()
}

export async function apiConfirmOrder(orderId) {
  let res
  try {
    res = await fetch(`/api/orders/${orderId}/refresh`, {
      method: 'POST',
      signal: requestSignal(),
    })
  } catch {
    throw netError('No se pudo corroborar el pago')
  }

  const data = await res.json().catch(() => ({}))

  if (!res.ok) {
    throw new ApiError(data.error || 'No se pudo corroborar el pago', 'ERROR')
  }
  return data
}

export async function apiUpload(path, formData) {
  return apiFile(path, 'POST', formData)
}

export async function apiUpdate(path, formData) {
  return apiFile(path, 'PUT', formData)
}

async function apiFile(path, method, formData) {
  const headers = {}
  const { token, user } = getSession()
  if (token) headers.Authorization = `Bearer ${token}`

  let res
  try {
    res = await fetch(tenantUrl(path, user), {
      method,
      headers,
      body: formData,
      signal: requestSignal(),
    })
  } catch {
    throw netError('No se pudo conectar con el servidor')
  }

  const data = await res.json().catch(() => ({}))

  if (res.status === 401) {
    throw new ApiError('Sesión requerida', 'AUTH')
  }
  if (res.status === 403) {
    throw new ApiError('No tenés permiso para esto', 'FORBIDDEN')
  }
  if (!res.ok) {
    throw new ApiError(data.error || 'No se pudo guardar el producto', 'ERROR')
  }
  return data
}

export async function apiDelete(path) {
  const headers = {}
  const { token, user } = getSession()
  if (token) headers.Authorization = `Bearer ${token}`

  let res
  try {
    res = await fetch(tenantUrl(path, user), {
      method: 'DELETE',
      headers,
      signal: requestSignal(),
    })
  } catch {
    throw netError('No se pudo conectar con el servidor')
  }

  const data = await res.json().catch(() => ({}))

  if (res.status === 401) {
    throw new ApiError('Sesión requerida', 'AUTH')
  }
  if (res.status === 403) {
    throw new ApiError('No tenés permiso para esto', 'FORBIDDEN')
  }
  if (!res.ok) {
    throw new ApiError(data.error || 'No se pudo eliminar el producto', 'ERROR')
  }
  return data
}

export async function apiPost(path, body) {
  return apiJson(path, 'POST', body)
}

export async function apiPut(path, body) {
  return apiJson(path, 'PUT', body)
}

async function apiJson(path, method, body) {
  const headers = { 'Content-Type': 'application/json' }
  const { token, user } = getSession()
  if (token) headers.Authorization = `Bearer ${token}`

  let res
  try {
    res = await fetch(tenantUrl(path, user), {
      method,
      headers,
      body: JSON.stringify(body),
      signal: requestSignal(),
    })
  } catch {
    throw netError('No se pudo conectar con el servidor')
  }

  const data = await res.json().catch(() => ({}))

  if (res.status === 401) {
    throw new ApiError('Sesión requerida', 'AUTH')
  }
  if (res.status === 403) {
    throw new ApiError('No tenés permiso para esto', 'FORBIDDEN')
  }
  if (!res.ok) {
    throw new ApiError(data.error || 'No se pudo guardar', 'ERROR')
  }
  return data
}