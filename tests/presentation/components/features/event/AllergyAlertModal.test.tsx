import { describe, it, expect, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import '@/presentation/i18n/config'
import { AllergyAlertModal } from '@/presentation/components/features/event/AllergyAlertModal'

describe('AllergyAlertModal', () => {
  it('spells out who reacts to what and how badly, and leaves the choice to the user', () => {
    const onContinue = vi.fn()
    const onCancel = vi.fn()
    render(
      <AllergyAlertModal
        item="Pasta"
        matches={[
          {
            userId: 'u1',
            displayName: 'Ane',
            allergen: 'gluten',
            severity: 'severe',
            keyword: 'pasta',
          },
          {
            userId: 'u2',
            displayName: 'Iker',
            allergen: 'egg',
            severity: 'mild',
            keyword: 'pasta',
          },
        ]}
        onContinue={onContinue}
        onCancel={onCancel}
      />,
    )
    expect(screen.getByText('Item: Pasta')).toBeInTheDocument()
    expect(screen.getAllByRole('listitem').map((li) => li.textContent)).toEqual([
      'Ane is allergic to Gluten — Severe',
      'Iker is allergic to Egg — Mild',
    ])
    fireEvent.click(screen.getByRole('button', { name: /change item/i }))
    expect(onCancel).toHaveBeenCalledTimes(1)
    expect(onContinue).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: /continue anyway/i }))
    expect(onContinue).toHaveBeenCalledTimes(1)
  })
})
