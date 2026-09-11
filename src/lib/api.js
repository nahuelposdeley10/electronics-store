export class ApiError extends Error {
  constructor(message, code) {
    super(message)
    this.name = 'ApiError'
    this.code = code
  }
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
    })
  } catch {
    throw new ApiError('No se pudo conectar con el servidor', 'NETWORK')
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
  const { token } = getSession()
  if (token) headers.Authorization = `Bearer ${token}`

  let res
  try {
    res = await fetch(path, { headers })
  } catch {
    throw new ApiError('No se pudo conectar con el servidor', 'NETWORK')
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
    res = await fetch(`/api/orders/${orderId}/refresh`, { method: 'POST' })
  } catch {
    throw new ApiError('No se pudo corroborar el pago', 'NETWORK')
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
  const { token } = getSession()
  if (token) headers.Authorization = `Bearer ${token}`

  let res
  try {
    res = await fetch(path, { method, headers, body: formData })
  } catch {
    throw new ApiError('No se pudo conectar con el servidor', 'NETWORK')
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
  const { token } = getSession()
  if (token) headers.Authorization = `Bearer ${token}`

  let res
  try {
    res = await fetch(path, { method: 'DELETE', headers })
  } catch {
    throw new ApiError('No se pudo conectar con el servidor', 'NETWORK')
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