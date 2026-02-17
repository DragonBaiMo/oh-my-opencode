import { existsSync } from "node:fs"
import { copyFile, mkdir } from "node:fs/promises"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

export type DeepResearchDeploymentStatus = "deployed" | "skipped"

export type DeepResearchDeploymentReason =
  | "deployed"
  | "plugin_dir_unset"
  | "target_exists"
  | "source_not_found"
  | "target_base_unavailable"
  | "copy_failed"

export interface DeepResearchDeploymentResult {
  status: DeepResearchDeploymentStatus
  reason: DeepResearchDeploymentReason
  targetPath: string | null
  sourcePath: string | null
  sourceCandidates: string[]
  error?: string
}

export interface DetectDeepResearchSourceCandidatesOptions {
  packageRoot?: string
  moduleUrl?: string
  additionalCandidates?: string[]
}

export interface DeployDeepResearchScriptOptions {
  pluginDir?: string | null
  sourceCandidates?: string[]
  env?: NodeJS.ProcessEnv
}

export function resolveDeepResearchTargetPath(pluginDir: string): string {
  return join(resolve(pluginDir), "scripts", "deep-research.mjs")
}

export function resolveDeepResearchTargetPathFromEnv(env: NodeJS.ProcessEnv = process.env): string | null {
  const pluginDir = env.OPENCODE_PLUGIN_DIR?.trim()
  if (!pluginDir) {
    return null
  }

  return resolveDeepResearchTargetPath(pluginDir)
}

export function detectDeepResearchSourceCandidates(
  options: DetectDeepResearchSourceCandidatesOptions = {},
): string[] {
  const modulePath = fileURLToPath(options.moduleUrl ?? import.meta.url)
  const moduleDir = dirname(modulePath)
  const packageRoot = options.packageRoot ? resolve(options.packageRoot) : resolve(moduleDir, "..", "..")

  const candidates = [
    join(packageRoot, "scripts", "deep-research.mjs"),
    join(packageRoot, "dist", "scripts", "deep-research.mjs"),
    ...(options.additionalCandidates ?? []),
  ]

  return [...new Set(candidates.map((candidate) => resolve(candidate)))]
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }

  return String(error)
}

export async function deployDeepResearchScript(
  options: DeployDeepResearchScriptOptions = {},
): Promise<DeepResearchDeploymentResult> {
  const targetPath = options.pluginDir
    ? resolveDeepResearchTargetPath(options.pluginDir)
    : resolveDeepResearchTargetPathFromEnv(options.env)

  const sourceCandidates =
    options.sourceCandidates && options.sourceCandidates.length > 0
      ? options.sourceCandidates.map((candidate) => resolve(candidate))
      : detectDeepResearchSourceCandidates()

  if (!targetPath) {
    return {
      status: "skipped",
      reason: "plugin_dir_unset",
      targetPath: null,
      sourcePath: null,
      sourceCandidates,
    }
  }

  if (existsSync(targetPath)) {
    return {
      status: "skipped",
      reason: "target_exists",
      targetPath,
      sourcePath: null,
      sourceCandidates,
    }
  }

  const sourcePath = sourceCandidates.find((candidate) => existsSync(candidate))
  if (!sourcePath) {
    return {
      status: "skipped",
      reason: "source_not_found",
      targetPath,
      sourcePath: null,
      sourceCandidates,
    }
  }

  try {
    await mkdir(dirname(targetPath), { recursive: true })
  } catch (error) {
    return {
      status: "skipped",
      reason: "target_base_unavailable",
      targetPath,
      sourcePath,
      sourceCandidates,
      error: toErrorMessage(error),
    }
  }

  try {
    await copyFile(sourcePath, targetPath)
    return {
      status: "deployed",
      reason: "deployed",
      targetPath,
      sourcePath,
      sourceCandidates,
    }
  } catch (error) {
    return {
      status: "skipped",
      reason: "copy_failed",
      targetPath,
      sourcePath,
      sourceCandidates,
      error: toErrorMessage(error),
    }
  }
}
