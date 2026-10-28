/** @vitest-environment jsdom */
import { expect, it } from 'vitest'
// @ts-expect-error Browser module is served directly.
import { setupRadioChoices } from '../../../public/customize/radio-choices.mjs'

it('moves single-choice selection with arrows and keeps one keyboard stop', async () => {
  const group = document.createElement('div')
  group.innerHTML = '<button aria-checked="true">Black</button><button aria-checked="false">White</button>'
  document.body.append(group)
  const buttons = [...group.querySelectorAll('button')]
  buttons.forEach(button => button.addEventListener('click', () => buttons.forEach(item => item.setAttribute('aria-checked', String(item === button)))))
  setupRadioChoices(group, 'Core')
  expect(group.getAttribute('role')).toBe('radiogroup')
  buttons[0].focus()
  buttons[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }))
  await Promise.resolve()
  expect(document.activeElement).toBe(buttons[1])
  expect(buttons.map(button => button.getAttribute('aria-checked'))).toEqual(['false', 'true'])
  expect(buttons.map(button => button.tabIndex)).toEqual([-1, 0])
  group.remove()
})
