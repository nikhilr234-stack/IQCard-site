import { describe, expect, it, vi } from 'vitest'
import { logRegistrationEvent } from './observability'

describe('registration telemetry', () => {
  it('emits only allow-listed operational fields', () => {
    const logger = vi.fn()
    logRegistrationEvent('registration_intent_created', {
      requestId: 'request-1', outcome: 'success', code: 'created',
    }, logger)
    expect(logger).toHaveBeenCalledWith('[registration]', {
      event: 'registration_intent_created', requestId: 'request-1', outcome: 'success', code: 'created',
    })
    expect(JSON.stringify(logger.mock.calls)).not.toContain('@')
  })
})
