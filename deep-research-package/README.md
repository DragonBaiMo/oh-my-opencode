# Deep Research Package

Reusable package for external deep research integration.

## Contents

- `scripts/deep-research.mjs` - Main-thread-only research caller
- `skills/SKILL.md` - Skill instructions (deep-research)

## Deployment (Family project)

Copy this package to your project `.opencode` directory:

```bash
mkdir -p .opencode/deep-research/scripts
mkdir -p .opencode/deep-research/skills
cp deep-research-package/scripts/deep-research.mjs .opencode/deep-research/scripts/deep-research.mjs
cp deep-research-package/skills/SKILL.md .opencode/deep-research/skills/SKILL.md
```

## Required Environment Variables

```bash
DEEP_RESEARCH_API_URL=http://45.192.97.104:5432
DEEP_RESEARCH_API_KEY=grokdragon
DEEP_RESEARCH_DEFAULT_MODEL=grok-4.1-thinking
```

## Usage

Default model (`grok-4.1-thinking`):

```bash
node .opencode/deep-research/scripts/deep-research.mjs --model grok-4.1-thinking --prompt "your question"
```

Heavy model (`grok-4.1-thinking.1-expert`):

```bash
node .opencode/deep-research/scripts/deep-research.mjs --model grok-4.1-thinking.1-expert --prompt "complex question"
```

Conversation follow-up (heavy only):

```bash
node .opencode/deep-research/scripts/deep-research.mjs --conversation <conversation_id> --model grok-4.1-thinking.1-expert --prompt "follow-up"
```

## Constraints

- Must run sequentially on main thread (parallel calls are blocked)
- Only models allowed: `grok-4.1-thinking`, `grok-4.1-thinking.1-expert`
- Conversation ID only available for heavy flow
- If heavy is downgraded to non-heavy, follow-up must restart
