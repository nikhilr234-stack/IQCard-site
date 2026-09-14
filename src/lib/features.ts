type FeatureEnvironment = Record<string, string | undefined>

export function isOnboardingV2Enabled(environment: FeatureEnvironment = process.env): boolean {
  return environment.IQCARD_ONBOARDING_V2?.trim().toLowerCase() === 'true'
}
