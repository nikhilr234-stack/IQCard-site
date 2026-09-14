import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const atelierPath = resolve(process.cwd(), 'public/customize/index.html')

describe('custom color surface controls', () => {
  it('does not expose the retired custom-color palette in the approved material step', () => {
    const html = readFileSync(atelierPath, 'utf8')

    expect(html).not.toContain('id="customColorGrid"')
    expect(html).not.toContain('data-custom-color=')
  })

  it('retains legacy color normalization without rendering customer controls', () => {
    const html = readFileSync(atelierPath, 'utf8')

    expect(html).toContain('customColor: null')
    expect(html).toContain('config.customColor')
  })
})
