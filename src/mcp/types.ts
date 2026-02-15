import { z } from "zod"

// Built-in MCPs have been removed. This schema is kept for backward compatibility.
export const McpNameSchema = z.string().min(1)

export type McpName = z.infer<typeof McpNameSchema>

export const AnyMcpNameSchema = z.string().min(1)

export type AnyMcpName = z.infer<typeof AnyMcpNameSchema>
