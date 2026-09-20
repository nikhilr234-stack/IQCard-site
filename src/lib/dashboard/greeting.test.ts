import { describe, expect, it } from 'vitest'
import { greetingForHour } from './greeting'

describe('greetingForHour', () => {
  it('selects the appropriate greeting for each local time of day', () => {
    expect(greetingForHour(5)).toBe('Good morning')
    expect(greetingForHour(11)).toBe('Good morning')
    expect(greetingForHour(12)).toBe('Good afternoon')
    expect(greetingForHour(17)).toBe('Good afternoon')
    expect(greetingForHour(18)).toBe('Good evening')
    expect(greetingForHour(4)).toBe('Good evening')
  })
})
