import type { ReactElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import AuthCodeErrorPage from './page'

async function render(next: string) {
  const page = AuthCodeErrorPage as unknown as (props: {
    searchParams: Promise<{ reason?: string; next?: string }>
  }) => Promise<ReactElement>
  return renderToStaticMarkup(await page({
    searchParams: Promise.resolve({ reason: 'invalid-link', next }),
  }))
}

describe('auth code error recovery link', () => {
  it('retains a safe relative return path', async () => {
    expect(await render('/dashboard?setup=1')).toContain('href="/login?next=%2Fdashboard%3Fsetup%3D1"')
  })

  it('drops an unsafe return path instead of reflecting it into the login link', async () => {
    const html = await render('//evil.example')

    expect(html).toContain('href="/login"')
    expect(html).not.toContain('evil.example')
  })
})
