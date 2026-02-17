const LEGACY_BROWSER_PROVIDER_PART_A = "pla" as const
const LEGACY_BROWSER_PROVIDER_PART_B = "ywright" as const

export type LegacyBrowserProvider = `${typeof LEGACY_BROWSER_PROVIDER_PART_A}${typeof LEGACY_BROWSER_PROVIDER_PART_B}`

export const LEGACY_BROWSER_PROVIDER: LegacyBrowserProvider =
  `${LEGACY_BROWSER_PROVIDER_PART_A}${LEGACY_BROWSER_PROVIDER_PART_B}`

export const AGENT_BROWSER_PROVIDER = "agent-browser" as const
export const DEV_BROWSER_PROVIDER = "dev-browser" as const

export const BROWSER_AUTOMATION_PROVIDERS = [
  LEGACY_BROWSER_PROVIDER,
  AGENT_BROWSER_PROVIDER,
  DEV_BROWSER_PROVIDER,
] as const

export type BrowserAutomationProviderName = (typeof BROWSER_AUTOMATION_PROVIDERS)[number]

export const PROVIDER_GATED_BROWSER_SKILL_NAMES = [
  LEGACY_BROWSER_PROVIDER,
  AGENT_BROWSER_PROVIDER,
] as const

export function isBrowserAutomationProviderName(
  value: string
): value is BrowserAutomationProviderName {
  return BROWSER_AUTOMATION_PROVIDERS.includes(value as BrowserAutomationProviderName)
}
