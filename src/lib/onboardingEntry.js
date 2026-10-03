export const ONBOARDING_ENTRY_KEY = 'ts-onboarding-entry:v1'

export function onboardingMode({ role, canConfigure, screen, tenantId }) {
  if (!canConfigure) return null
  if (role === 'admin') return 'owner'
  if (role === 'superadmin' && tenantId && screen === 'onboarding') return 'assistance'
  return null
}

// One entry decision per signed-in tab, not on every refresh or screen change.
// The server remains the source of truth for pause/completion and business scope.
export function claimOnboardingEntry({ role, userId, status, storage }) {
  if (role !== 'admin' || !userId || !status || status.adminId !== userId) return false
  try {
    if (storage.getItem(ONBOARDING_ENTRY_KEY) === userId) return false
    storage.setItem(ONBOARDING_ENTRY_KEY, userId)
  } catch {
    // Component-level guard still prevents repeated redirects if storage is unavailable.
  }
  return !status.paused && !status.finished && !status.completedAt
}
