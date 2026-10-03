import { useCallback, useEffect, useRef, useState } from 'react'
import { apiGet, apiPut } from '@/lib/api'
import { notifySiteSettingsChanged } from '@/lib/siteSettings'

export default function useOnboarding(screen, onBusinessSaved) {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const alive = useRef(false)
  const request = useRef(0)
  const saving = useRef(false)

  const refresh = useCallback(() => {
    if (saving.current) return
    const id = ++request.current
    return apiGet('/api/admin/onboarding').then((next) => {
      if (alive.current && id === request.current) { setData(next); setError('') }
    }).catch((err) => {
      if (alive.current && id === request.current) setError(err.message)
    })
  }, [])

  useEffect(() => {
    alive.current = true
    return () => { alive.current = false; request.current += 1 }
  }, [])

  useEffect(() => {
    refresh()
    window.addEventListener('focus', refresh)
    return () => window.removeEventListener('focus', refresh)
  }, [refresh, screen])

  const save = async (action, value) => {
    if (saving.current) return false
    saving.current = true
    const id = ++request.current
    setBusy(true)
    setError('')
    try {
      const next = await apiPut('/api/admin/onboarding', { action, value })
      if (!alive.current || id !== request.current) return false
      setData(next)
      if (['business', 'payments', 'shipping'].includes(action)) notifySiteSettingsChanged()
      if (action === 'business') onBusinessSaved()
      return true
    } catch (err) {
      if (alive.current && id === request.current) setError(err.message)
      return false
    } finally {
      saving.current = false
      if (alive.current && id === request.current) setBusy(false)
    }
  }

  return { data, error, busy, refresh, save }
}
