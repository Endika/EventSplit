// @vitest-environment node
import { it, expect } from 'vitest'
import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import { useTheme } from '@/presentation/hooks/useTheme'

it('renders light with the system preference on a server with no window', () => {
  let dark: boolean | undefined
  renderToString(
    createElement(() => {
      dark = useTheme().isDark
      return null
    }),
  )
  expect(dark).toBe(false)
})
