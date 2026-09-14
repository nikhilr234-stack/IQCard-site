import { describe, expect, it } from 'vitest'
import { getLoginPageState } from './login-page-content'

describe('login page state', () => {
  it('shows the sent state after a successful magic-link request', () => {
    expect(getLoginPageState({ sent: '1' })).toEqual({ sent: true, error: null, next: '' })
  })

  it('normalizes unknown errors while preserving safe return paths', () => {
    expect(getLoginPageState({ error: 'unexpected', next: '/dashboard' })).toEqual({ sent: false, error: 'failed', next: '/dashboard' })
  })

  it('drops an unsafe next destination before rendering a success link or form field', () => {
    expect(getLoginPageState({ sent: '1', next: '//evil.example' })).toEqual({ sent: true, error: null, next: '' })
  })
})
