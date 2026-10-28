/** @vitest-environment jsdom */
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, expect, it, vi } from 'vitest'
import { ResendCountdown } from './resend-countdown'
;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); sessionStorage.clear(); document.body.innerHTML = '' })
it('resends the exact saved registration and shows delivery failure without leaving the page', async () => {
  sessionStorage.setItem('iq-registration-resend', JSON.stringify({ email: 'ada@example.test', designId: 'IQD-TEST', payload: { configuration: { identity: { name: 'Ada' } } } }))
  const fetcher = vi.fn().mockResolvedValue({ ok: false, json: async () => ({ error: 'Please wait before requesting another link.' }) })
  vi.stubGlobal('fetch', fetcher)
  vi.useFakeTimers()
  const host = document.createElement('div'); document.body.append(host); const root = createRoot(host)
  await act(async () => root.render(<ResendCountdown />))
  expect(host.textContent).toContain('a•••@example.test')
  for (let i = 0; i < 60; i++) await act(async () => vi.advanceTimersByTime(1000))
  const resend = [...host.querySelectorAll('button')].find(button => button.textContent === 'Resend secure link')
  expect(resend).toBeTruthy()
  await act(async () => resend?.click())
  expect(JSON.parse(fetcher.mock.calls[0][1].body)).toMatchObject({ email: 'ada@example.test', designId: 'IQD-TEST' })
  expect(host.textContent).toContain('Please wait before requesting another link.')
  await act(async () => root.unmount())
})
