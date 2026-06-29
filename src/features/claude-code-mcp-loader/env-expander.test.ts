import { describe, expect, test } from "bun:test"
import { expandEnvVars, expandEnvVarsInObject } from "./env-expander"

describe("env-expander", () => {
  describe("expandEnvVars", () => {
    test("expands environment variables with ${VAR} syntax", () => {
      process.env.TEST_VAR = "test-value"
      const result = expandEnvVars("hello ${TEST_VAR}")
      expect(result).toBe("hello test-value")
      delete process.env.TEST_VAR
    })

    test("expands environment variables with ${VAR:-default} syntax", () => {
      const result = expandEnvVars("hello ${UNDEFINED_VAR:-default-value}")
      expect(result).toBe("hello default-value")
    })

    test("returns empty string for undefined var without default", () => {
      const result = expandEnvVars("hello ${UNDEFINED_VAR}")
      expect(result).toBe("hello ")
    })

    test("expands {{directory}} placeholder", () => {
      const result = expandEnvVars("{{directory}}/file", { directory: "/project/mcp-server" })
      expect(result).toBe("/project/mcp-server/file")
    })

    test("expands {{directory}} with backslash on Windows", () => {
      const result = expandEnvVars("/path/{{directory}}/file", { directory: "C:\\project\\mcp-server" })
      expect(result).toBe("/path/C:/project/mcp-server/file")
    })

    test("expands ${PROJECT_ROOT} placeholder", () => {
      const result = expandEnvVars("${PROJECT_ROOT}/mcp-server", { projectRoot: "/home/user/project" })
      expect(result).toBe("/home/user/project/mcp-server")
    })

    test("expands ${PROJECT_ROOT} with backslash on Windows", () => {
      const result = expandEnvVars("${PROJECT_ROOT}/mcp-server", { projectRoot: "C:\\Users\\project" })
      expect(result).toBe("C:/Users/project/mcp-server")
    })

    test("expands multiple placeholders together", () => {
      const result = expandEnvVars("{{directory}}/index.ts", { directory: "/mcp" })
      expect(result).toBe("/mcp/index.ts")
    })

    test("expands all placeholders and env vars together", () => {
      process.env.API_URL = "http://api.example.com"
      const result = expandEnvVars("{{directory}}/script.js --url ${API_URL}", {
        directory: "/project/scripts",
      })
      expect(result).toBe("/project/scripts/script.js --url http://api.example.com")
      delete process.env.API_URL
    })

    test("handles nested braces gracefully", () => {
      const result = expandEnvVars("{{directory}}", { directory: "/test" })
      expect(result).toBe("/test")
    })
  })

  describe("expandEnvVarsInObject", () => {
    test("expands strings in objects", () => {
      const obj = { command: "bun", args: ["run", "{{directory}}/index.ts"] }
      const result = expandEnvVarsInObject(obj, { directory: "/project" })
      expect(result).toEqual({ command: "bun", args: ["run", "/project/index.ts"] })
    })

    test("expands strings in arrays", () => {
      const arr = ["{{directory}}/a.ts", "{{directory}}/b.ts"]
      const result = expandEnvVarsInObject(arr, { directory: "/project" })
      expect(result).toEqual(["/project/a.ts", "/project/b.ts"])
    })

    test("returns null/undefined unchanged", () => {
      expect(expandEnvVarsInObject(null, {})).toBeNull()
      expect(expandEnvVarsInObject(undefined, {})).toBeUndefined()
    })

    test("expands nested objects", () => {
      const obj = {
        mcpServers: {
          test: {
            command: "bun",
            args: ["{{directory}}/server.ts"],
            env: { URL: "${TEST_URL}" },
          },
        },
      }
      process.env.TEST_URL = "http://test.com"
      const result = expandEnvVarsInObject(obj, { directory: "/mcp" })
      expect(result).toEqual({
        mcpServers: {
          test: {
            command: "bun",
            args: ["/mcp/server.ts"],
            env: { URL: "http://test.com" },
          },
        },
      })
      delete process.env.TEST_URL
    })

    test("expands mixed types in objects", () => {
      const obj = {
        name: "test",
        count: 42,
        enabled: true,
        nested: { path: "{{directory}}/file" },
      }
      const result = expandEnvVarsInObject(obj, { directory: "/path" })
      expect(result).toEqual({
        name: "test",
        count: 42,
        enabled: true,
        nested: { path: "/path/file" },
      })
    })
  })
})
