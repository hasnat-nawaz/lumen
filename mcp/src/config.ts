import { existsSync } from "node:fs"
import { fileURLToPath } from "node:url"

// Values set by the AI app's MCP config win over files; mcp/.env wins over web/.env.
for (const file of ["../.env", "../../web/.env"]) {
  const path = fileURLToPath(new URL(file, import.meta.url))
  if (existsSync(path)) process.loadEnvFile(path)
}

function read(...names: string[]) {
  for (const name of names) {
    const value = process.env[name]?.trim()
    if (value) return value
  }
  return undefined
}

export const config = {
  supabaseUrl: read("SUPABASE_URL", "VITE_SUPABASE_URL"),
  supabaseKey: read("SUPABASE_ANON_KEY", "VITE_SUPABASE_ANON_KEY"),
  email: read("LUMEN_EMAIL"),
  pin: read("LUMEN_PIN"),
  siteUrl: read("LUMEN_SITE_URL")?.replace(/\/+$/, ""),
}

export function missingConfig() {
  const missing: string[] = []
  if (!config.supabaseUrl) missing.push("SUPABASE_URL")
  if (!config.supabaseKey) missing.push("SUPABASE_ANON_KEY")
  if (!config.email) missing.push("LUMEN_EMAIL")
  if (!config.pin) missing.push("LUMEN_PIN")
  return missing
}
