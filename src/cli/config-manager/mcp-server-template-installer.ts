import { existsSync, mkdirSync, readdirSync, copyFileSync, statSync } from "node:fs"
import { join, dirname } from "node:path"
import { fileURLToPath } from "node:url"

const TEMPLATES_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "scripts", "templates", "mcp-servers")

export interface McpServerTemplateInstallerResult {
  success: boolean
  installed: string[]
  skipped: string[]
  errors: Array<{ template: string; error: string }>
}

export interface InstallMcpServerTemplatesOptions {
  /** Target directory where MCP servers will be installed (e.g., project root) */
  targetDir: string
  /** Force overwrite existing files */
  force?: boolean
  /** List of specific templates to install (defaults to all) */
  templates?: string[]
}

/**
 * Installs MCP server templates to the target directory.
 * Templates are copied from scripts/templates/mcp-servers/ to targetDir/.opencode/mcp-servers/
 */
export async function installMcpServerTemplates(
  options: InstallMcpServerTemplatesOptions
): Promise<McpServerTemplateInstallerResult> {
  const { targetDir, force = false, templates: specificTemplates } = options

  const mcpServersDir = join(targetDir, ".opencode", "mcp-servers")

  // Ensure target directory exists
  if (!existsSync(mcpServersDir)) {
    mkdirSync(mcpServersDir, { recursive: true })
  }

  // Get list of templates to install
  let templateDirs: string[]
  if (specificTemplates && specificTemplates.length > 0) {
    templateDirs = specificTemplates
  } else {
    templateDirs = getAvailableTemplates()
  }

  const result: McpServerTemplateInstallerResult = {
    success: true,
    installed: [],
    skipped: [],
    errors: [],
  }

  for (const templateName of templateDirs) {
    const sourceDir = join(TEMPLATES_DIR, templateName)
    const targetTemplateDir = join(mcpServersDir, templateName)

    if (!existsSync(sourceDir)) {
      result.errors.push({
        template: templateName,
        error: `Template source directory not found: ${sourceDir}`,
      })
      result.success = false
      continue
    }

    try {
      await copyDirectoryRecursive(sourceDir, targetTemplateDir, force)
      result.installed.push(templateName)
    } catch (err) {
      result.errors.push({
        template: templateName,
        error: err instanceof Error ? err.message : String(err),
      })
      result.success = false
    }
  }

  return result
}

/**
 * Gets list of available MCP server templates.
 */
export function getAvailableTemplates(): string[] {
  if (!existsSync(TEMPLATES_DIR)) {
    return []
  }

  return readdirSync(TEMPLATES_DIR).filter((name) => {
    const path = join(TEMPLATES_DIR, name)
    const stat = statSync(path)
    return stat.isDirectory()
  })
}

/**
 * Copies a directory recursively.
 */
async function copyDirectoryRecursive(source: string, target: string, force: boolean): Promise<void> {
  // Ensure target directory exists
  if (!existsSync(target)) {
    mkdirSync(target, { recursive: true })
  }

  const entries = readdirSync(source)

  for (const entry of entries) {
    const sourcePath = join(source, entry)
    const targetPath = join(target, entry)
    const stat = statSync(sourcePath)

    if (stat.isDirectory()) {
      await copyDirectoryRecursive(sourcePath, targetPath, force)
    } else {
      // Skip if file exists and not forcing overwrite
      if (existsSync(targetPath) && !force) {
        continue
      }

      // Ensure parent directory exists
      const parentDir = dirname(targetPath)
      if (!existsSync(parentDir)) {
        mkdirSync(parentDir, { recursive: true })
      }

      copyFileSync(sourcePath, targetPath)
    }
  }
}
