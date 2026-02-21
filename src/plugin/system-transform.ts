import type { Model } from "@opencode-ai/sdk"
import type { CreatedHooks } from "../create-hooks"

export function createSystemTransformHandler(args: {
  hooks: CreatedHooks
}): (input: { sessionID?: string; model: Model }, output: { system: string[] }) => Promise<void> {
  return async (input, output): Promise<void> => {
    await args.hooks.beastModeSystem?.["experimental.chat.system.transform"]?.(
      input,
      output,
    )
  }
}
