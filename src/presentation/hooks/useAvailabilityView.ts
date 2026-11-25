import { useCallback, useState } from 'react'

export type AvailabilityView = 'calendar' | 'table'

const STORAGE_KEY = 'eventsplit:availabilityView'

function readView(): AvailabilityView {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'table' ? 'table' : 'calendar'
  } catch {
    return 'calendar'
  }
}

/** Which availability view the user last used. Defaults to the calendar. */
export function useAvailabilityView(): [AvailabilityView, (v: AvailabilityView) => void] {
  const [view, setView] = useState<AvailabilityView>(readView)

  // Stryker disable ArrayDeclaration: a constant dependency list is never read
  const choose = useCallback((v: AvailabilityView) => {
    setView(v)
    try {
      localStorage.setItem(STORAGE_KEY, v)
    } catch {
      // A private window or blocked storage just means we forget the choice.
    }
  }, [])
  // Stryker restore ArrayDeclaration

  return [view, choose]
}
