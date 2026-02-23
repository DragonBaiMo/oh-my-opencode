/**
 * Generates verification reminders for task results.
 * These reminders prompt the main agent to verify subagent work
 * rather than blindly trusting self-reports.
 */

export interface VerificationReminderOptions {
  agent: string
  category?: string
  description: string
  prompt: string
  sessionId: string
}

const TESTING_KEYWORDS = [
  "test",
  "verify",
  "check",
  "validate",
  "qa",
  "regression",
  "e2e",
  "integration",
  "unit",
  "browser",
  "ui test",
  "functional",
  "acceptance",
]

const TESTING_AGENTS = ["browser-tester"]

const TESTING_CATEGORIES = ["visual-engineering"]

function isTestingTask(options: VerificationReminderOptions): boolean {
  const { agent, category, description, prompt } = options
  const lowerDesc = description.toLowerCase()
  const lowerPrompt = prompt.toLowerCase()

  if (TESTING_AGENTS.includes(agent)) {
    return true
  }

  if (category && TESTING_CATEGORIES.includes(category)) {
    const combinedText = `${lowerDesc} ${lowerPrompt}`
    if (TESTING_KEYWORDS.some((kw) => combinedText.includes(kw))) {
      return true
    }
  }

  const hasTestingKeyword = TESTING_KEYWORDS.some(
    (kw) => lowerDesc.includes(kw) || lowerPrompt.includes(kw)
  )

  return hasTestingKeyword
}

function generateTestingVerificationReminder(
  options: VerificationReminderOptions
): string {
  return `
<verification_required type="testing">
## ⚠️ TESTING TASK - VERIFICATION REQUIRED

**DO NOT trust this result without verification.** Subagents often cut corners on testing.

### Required Checks:
1. **Evidence Chain**: Does the report include actual interaction evidence (not just "tested" or "verified")?
2. **Specific Actions**: Are there concrete actions listed (click, type, navigate) with selectors?
3. **Timing Data**: Are response times and durations included?
4. **Screenshots/Logs**: Is there visual or textual evidence for claims?
5. **Skipped Items**: Are skipped tests documented with reasons?

### Red Flags (REJECT if present):
- "All tests passed" without test output
- "Verified manually" without specifics
- Only screenshots, no interaction logs
- Vague claims like "works correctly"

### If Verification Fails:
\`\`\`typescript
task(
  session_id="${options.sessionId}",
  load_skills=[...],
  prompt="Testing report REJECTED. Missing: [specific evidence]. Provide actual test output and interaction evidence chain."
)
\`\`\`
</verification_required>`
}

function generateStandardVerificationReminder(
  options: VerificationReminderOptions
): string {
  return `
<verification_required type="standard">
## Verification Checklist

Before accepting this result:
- [ ] Run \`lsp_diagnostics\` on modified files
- [ ] Verify claims match actual code/output
- [ ] Check all MUST DO items were completed
- [ ] Confirm no MUST NOT DO violations

If issues found, use \`session_id="${options.sessionId}"\` to continue.
</verification_required>`
}

/**
 * Generates a verification reminder based on task type.
 * Testing tasks get more detailed verification requirements.
 */
export function generateVerificationReminder(
  options: VerificationReminderOptions
): string {
  if (isTestingTask(options)) {
    return generateTestingVerificationReminder(options)
  }
  return generateStandardVerificationReminder(options)
}
