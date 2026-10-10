export function canAccessOverview(role, permissions = []) {
  return role === 'superadmin' || role === 'admin' || permissions.includes('sales.read') || permissions.includes('reports.view')
}
