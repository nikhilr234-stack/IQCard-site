export function setupRadioChoices(container, label) {
  if (!container) return
  const choices = Array.from(container.querySelectorAll('button[aria-checked]'))
  if (!choices.length) return
  container.setAttribute('role', 'radiogroup')
  container.setAttribute('aria-label', label)
  const sync = () => choices.forEach(choice => {
    const selected = choice.getAttribute('aria-checked') === 'true'
    choice.setAttribute('role', 'radio')
    choice.tabIndex = selected ? 0 : -1
  })
  sync()
  const observer = new MutationObserver(sync)
  observer.observe(container, { subtree: true, attributes: true, attributeFilter: ['aria-checked'] })
  container.addEventListener('keydown', event => {
    const active = choices.indexOf(event.target)
    if (active < 0) return
    let next
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = (active + 1) % choices.length
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = (active + choices.length - 1) % choices.length
    else if (event.key === 'Home') next = 0
    else if (event.key === 'End') next = choices.length - 1
    else return
    event.preventDefault()
    choices[next].click()
    choices[next].focus()
    sync()
  })
}
