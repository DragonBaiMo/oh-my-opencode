export interface ExpandContext {
  /** The directory containing the mcp.json (used for {{directory}} placeholder) */
  directory?: string
  /** The project root directory (used for ${PROJECT_ROOT} placeholder) */
  projectRoot?: string
}

export function expandEnvVars(value: string, context: ExpandContext = {}): string {
  // First expand {{directory}} and ${PROJECT_ROOT} placeholders
  let result = value
  if (context.directory !== undefined) {
    result = result.replace(/\{\{directory\}\}/g, context.directory.replace(/\\/g, "/"))
  }
  if (context.projectRoot !== undefined) {
    result = result.replace(/\$\{PROJECT_ROOT\}/g, context.projectRoot.replace(/\\/g, "/"))
  }

  // Then expand environment variables: ${VAR} and ${VAR:-default}
  return result.replace(
    /\$\{([^}:]+)(?::-([^}]*))?\}/g,
    (_, varName: string, defaultValue?: string) => {
      // Skip if already expanded (was a PROJECT_ROOT or directory placeholder)
      if (varName === "PROJECT_ROOT" || context.directory !== undefined && value.includes("{{directory}}")) {
        const envValue = process.env[varName]
        if (envValue !== undefined) return envValue
        if (defaultValue !== undefined) return defaultValue
        return ""
      }
      const envValue = process.env[varName]
      if (envValue !== undefined) return envValue
      if (defaultValue !== undefined) return defaultValue
      return ""
    }
  )
}

export function expandEnvVarsInObject<T>(obj: T, context: ExpandContext = {}): T {
  if (obj === null || obj === undefined) return obj
  if (typeof obj === "string") return expandEnvVars(obj, context) as T
  if (Array.isArray(obj)) {
    return obj.map((item) => expandEnvVarsInObject(item, context)) as T
  }
  if (typeof obj === "object") {
    const result: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(obj)) {
      result[key] = expandEnvVarsInObject(value, context)
    }
    return result as T
  }
  return obj
}
