import { apiGet } from '@/lib/api'

export async function loadOperators() {
  const users = await apiGet('/api/admin/users')
  return (Array.isArray(users) ? users : [])
    .filter((u) => u.role !== 'superadmin')
    .sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'es'))
    .map((u) => ({ value: u.email, label: u.name || u.email }))
}

export async function loadCatalogOptions() {
  const [cats, brands] = await Promise.all([
    apiGet('/api/admin/categories'),
    apiGet('/api/admin/brands'),
  ])
  return {
    categories: (cats.items || [])
      .filter((c) => c.active !== false)
      .map((c) => ({ key: c.key, name: c.name })),
    brands: (brands.items || [])
      .filter((b) => b.active !== false)
      .map((b) => b.name),
  }
}