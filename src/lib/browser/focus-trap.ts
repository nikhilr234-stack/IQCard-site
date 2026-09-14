const focusableSelector = [
  'a[href]',
  'area[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[contenteditable="true"]',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

type DialogKeyboardEvent = Pick<KeyboardEvent, 'key' | 'shiftKey' | 'preventDefault'>

function isAvailable(element: HTMLElement) {
  return element.tabIndex >= 0
    && !element.closest('[hidden], [aria-hidden="true"]')
    && getComputedStyle(element).display !== 'none'
    && getComputedStyle(element).visibility !== 'hidden'
}

export function trapDialogFocus(container: HTMLElement, event: DialogKeyboardEvent) {
  if (event.key !== 'Tab') return

  const controls = Array.from(container.querySelectorAll<HTMLElement>(focusableSelector)).filter(isAvailable)
  if (controls.length === 0) {
    event.preventDefault()
    container.focus()
    return
  }

  const first = controls[0]
  const last = controls[controls.length - 1]
  const activeElement = document.activeElement

  if (!container.contains(activeElement)) {
    event.preventDefault()
    ;(event.shiftKey ? last : first).focus()
  } else if (event.shiftKey && activeElement === first) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && activeElement === last) {
    event.preventDefault()
    first.focus()
  }
}
