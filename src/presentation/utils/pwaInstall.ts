export type InstallBanner = 'native' | 'ios' | null

export const isIosUserAgent = (userAgent: string): boolean => /iphone|ipad|ipod/i.test(userAgent)

/** `navStandalone` is iOS Safari's own flag, which the display-mode query does not cover. */
export const isStandaloneDisplay = (
  displayModeMatches: boolean,
  navStandalone?: boolean,
): boolean => displayModeMatches || navStandalone === true

export function installBanner(state: {
  dismissed: boolean
  standalone: boolean
  canPrompt: boolean
  iosHint: boolean
}): InstallBanner {
  if (state.dismissed || state.standalone) return null
  if (state.canPrompt) return 'native'
  return state.iosHint ? 'ios' : null
}
