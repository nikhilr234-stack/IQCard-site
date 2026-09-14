export type RegistrationEvent =
  | 'registration_rate_limited'
  | 'registration_intent_created'
  | 'registration_email_sent'
  | 'registration_email_failed'
  | 'registration_claimed'
  | 'registration_claim_failed'
  | 'onboarding_step_saved'
  | 'onboarding_completed'

type RegistrationEventFields = {
  requestId: string
  outcome: 'success' | 'failure' | 'limited'
  code?: string
  step?: string
}

export function logRegistrationEvent(
  event: RegistrationEvent,
  fields: RegistrationEventFields,
  logger: (message: string, details: Record<string, string | undefined>) => void = console.info,
) {
  logger('[registration]', {
    event,
    requestId: fields.requestId,
    outcome: fields.outcome,
    code: fields.code,
    ...(fields.step ? { step: fields.step } : {}),
  })
}
