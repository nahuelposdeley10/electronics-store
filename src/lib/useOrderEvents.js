import { useEffect, useRef } from 'react'
import { subscribeToOrders } from './orderSocket'

export function useOrderEvents(onOrderEvent, enabled = true) {
  const onEventRef = useRef(onOrderEvent)

  useEffect(() => {
    onEventRef.current = onOrderEvent
  })

  useEffect(() => {
    if (!enabled) return undefined
    return subscribeToOrders((data) => {
      if (data.id && data.status) onEventRef.current(data)
    })
  }, [enabled])
}