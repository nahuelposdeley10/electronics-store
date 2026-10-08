import { useEffect, useRef } from 'react'
import { subscribeToQuotes } from './orderSocket'

export function useQuoteEvents(onQuoteEvent, enabled = true) {
  const onEventRef = useRef(onQuoteEvent)

  useEffect(() => {
    onEventRef.current = onQuoteEvent
  })

  useEffect(() => {
    if (!enabled) return undefined
    return subscribeToQuotes((data) => {
      if (data?.id && data?.event) onEventRef.current(data)
    })
  }, [enabled])
}
