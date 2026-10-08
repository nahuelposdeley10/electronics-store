import { useEffect, useRef } from 'react'
import { subscribeToCash } from './orderSocket'

export function useCashEvents(onCashEvent, enabled = true) {
  const onEventRef = useRef(onCashEvent)

  useEffect(() => {
    onEventRef.current = onCashEvent
  })

  useEffect(() => {
    if (!enabled) return undefined
    return subscribeToCash((data) => {
      if (data?.entity && data?.shiftId) onEventRef.current(data)
    })
  }, [enabled])
}
