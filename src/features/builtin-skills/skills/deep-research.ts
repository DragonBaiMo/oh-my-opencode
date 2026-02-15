import { readFileSync } from "fs"
import { join, dirname } from "path"
import { fileURLToPath } from "url"
import type { BuiltinSkill } from "../types"

const __dirname = dirname(fileURLToPath(import.meta.url))

export const deepResearchSkill: BuiltinSkill = {
  name: "deep-research",
  description:
    "深度调研工具 - 通过外部 AI 平台进行深度技术调研。当需要查询库文档、最新技术信息、最佳实践或解决不确定性问题时使用。替代 websearch/context7 等网络搜索工具。",
  template: readFileSync(join(__dirname, "../deep-research/SKILL.md"), "utf-8"),
  subtask: false,
  argumentHint: "调研问题",
}
