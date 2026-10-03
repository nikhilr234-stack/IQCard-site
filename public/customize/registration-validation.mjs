const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function identityNameError(value) {
  const name = String(value || '').trim().replace(/\s+/g, ' ')
  if (!name || name.toUpperCase() === 'YOUR NAME' || name.split(' ').length < 2) {
    return 'Enter your first and last name.'
  }
  return null
}

export function handoffEmailError(value) {
  const email = String(value || '').trim()
  if (!email) return 'Email address is required.'
  if (!EMAIL_PATTERN.test(email)) return 'Enter a valid email address, for example name@example.com.'
  return null
}
