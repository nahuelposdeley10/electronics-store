import { useEffect, useRef } from 'react'
import { subscribeToStock } from './orderSocket'

export function useStockEvents(onStockEvent, enabled = true) {
  const onEventRef = useRef(onStockEvent)

  useEffect(() => {
    onEventRef.current = onStockEvent
  })

  useEffect(() => {
    if (!enabled) return undefined
    return subscribeToStock((data) => {
      if (data.productId !== undefined && data.stock !== undefined) onEventRef.current(data)
    })
  }, [enabled])
}
