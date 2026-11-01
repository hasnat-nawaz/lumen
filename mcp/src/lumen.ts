import { createClient, type SupabaseClient } from "@supabase/supabase-js"

import { SECTIONS, type SectionKey } from "../../web/src/lib/sections.ts"
import { slugify, UNIQUE_VIOLATION, withSuffix } from "../../web/src/lib/slug.ts"
import { config, missingConfig } from "./config.ts"

// Mirrors the check constraints in supabase/schema.sql.
export const LIMITS = {
  domainTitle: 80,
  domainDescription: 280,
  paperTitle: 200,
  paperAuthors: 300,
  sectionBody: 50_000,
  yearMin: 1900,
  yearMax: 2100,
} as const

export type Member = { id: string; name: string; role: "admin" | "member" }
export type SectionInput = Partial<Record<SectionKey, string>>

type Session = { db: SupabaseClient; member: Member }

type DomainRow = { id: string; slug: string; title: string; description: string }
type PaperRow = {
  id: string
  slug: string
  title: string
  authors: string
  year: number | null
  external_url: string | null
  pdf_path: string | null
  created_by: string
  created_at: string
}
type SectionRow = { key: SectionKey; body: string; updated_by: string; updated_at: string }

const PAPER_FIELDS =
  "id, slug, title, authors, year, external_url, pdf_path, created_by, created_at"

function unwrap<T>(result: { data: unknown; error: { message: string } | null }) {
  if (result.error) throw new Error(result.error.message)
  return result.data as T
}

// ---------------------------------------------------------------------------
// Session
// ---------------------------------------------------------------------------

let session: Promise<Session> | null = null

export function connect() {
  session ??= signIn().catch((error: unknown) => {
    session = null
    throw error
  })
  return session
}

async function signIn(): Promise<Session> {
  const missing = missingConfig()
  if (missing.length) {
    throw new Error(
      `Lumen MCP is missing settings: ${missing.join(", ")}. Put them in mcp/.env or in this AI app's MCP config.`
    )
  }

  const db = createClient(config.supabaseUrl!, config.supabaseKey!, {
    auth: { persistSession: false, autoRefreshToken: true, detectSessionInUrl: false },
  })
  const { data, error } = await db.auth.signInWithPassword({
    email: config.email!,
    password: config.pin!,
  })
  if (error) {
    throw new Error(`Could not sign in to Lumen as ${config.email}: ${error.message}`)
  }

  const member = unwrap<Member | null>(
    await db.from("members").select("id, name, role").eq("id", data.user.id).maybeSingle()
  )
  if (!member) throw new Error(`${config.email} signed in but is not a Lumen team member.`)
  return { db, member }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function link(path: string) {
  return config.siteUrl ? `${config.siteUrl}${path}` : path
}

function sameText(a: string, b: string) {
  return a.trim().toLowerCase() === b.trim().toLowerCase()
}

/** Matches by exact slug, then by title (case-insensitive), then by slugified title. */
function pick<T extends { slug: string; title: string }>(
  items: T[],
  ref: string,
  kind: "domain" | "paper",
  scope = "Lumen"
) {
  const bySlug = items.find((item) => item.slug === ref.trim())
  if (bySlug) return bySlug

  const byTitle = items.filter((item) => sameText(item.title, ref))
  if (byTitle.length === 1) return byTitle[0]
  if (byTitle.length > 1) {
    throw new Error(
      `More than one ${kind} in ${scope} is titled "${ref}". Use one of these slugs instead: ${byTitle
        .map((item) => item.slug)
        .join(", ")}`
    )
  }

  const bySlugified = items.find((item) => item.slug === slugify(ref))
  if (bySlugified) return bySlugified

  const available = items.length
    ? items.map((item) => `"${item.title}" (${item.slug})`).join(", ")
    : "none yet"
  throw new Error(`No ${kind} matching "${ref}" in ${scope}. Available: ${available}`)
}

function normalizeUrl(value: string | null | undefined) {
  if (value === undefined) return undefined
  const trimmed = value?.trim()
  if (!trimmed) return null
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
  try {
    return new URL(withScheme).toString()
  } catch {
    throw new Error(`"${value}" doesn't look like a valid URL.`)
  }
}

async function insertWithSlug(
  db: SupabaseClient,
  table: "domains" | "papers",
  title: string,
  row: Record<string, unknown>
) {
  const base = slugify(title)
  for (const slug of [base, withSuffix(base), withSuffix(base)]) {
    const { data, error } = await db
      .from(table)
      .insert({ ...row, slug })
      .select("id, slug")
      .single()
    if (!error) return data as { id: string; slug: string }
    if (error.code !== UNIQUE_VIOLATION) throw new Error(error.message)
  }
  throw new Error(`Could not create a unique link for "${title}"`)
}

async function loadDomains(db: SupabaseClient) {
  return unwrap<DomainRow[]>(
    await db.from("domains").select("id, slug, title, description").order("title")
  )
}

async function loadDomain(db: SupabaseClient, ref: string) {
  return pick(await loadDomains(db), ref, "domain")
}

async function loadPaper(db: SupabaseClient, domainRef: string, paperRef: string) {
  const domain = await loadDomain(db, domainRef)
  const papers = unwrap<PaperRow[]>(
    await db.from("papers").select(PAPER_FIELDS).eq("domain_id", domain.id).order("title")
  )
  const paper = pick(papers, paperRef, "paper", `domain "${domain.title}"`)
  return { domain, paper }
}

function sectionEntries(sections: SectionInput) {
  return SECTIONS.flatMap(({ key }) => {
    const body = sections[key]
    return body === undefined ? [] : [{ key, body }]
  })
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

export async function getStructure() {
  const { member } = await connect()
  return {
    signed_in_as: { name: member.name, role: member.role },
    hierarchy:
      "Domains (research areas) contain papers. Every paper has the same fixed set of sections, listed below.",
    domain_fields: {
      title: `required, 1-${LIMITS.domainTitle} characters`,
      description: `optional, up to ${LIMITS.domainDescription} characters; one or two lines on what the area covers`,
    },
    paper_fields: {
      title: `required, 1-${LIMITS.paperTitle} characters; the paper's real title`,
      authors: `optional, up to ${LIMITS.paperAuthors} characters, e.g. "Vaswani et al."`,
      year: `optional, whole number ${LIMITS.yearMin}-${LIMITS.yearMax}`,
      external_url: "optional link to the paper (arXiv, DOI, publisher page)",
      pdf: "PDF upload is only possible from the website, not through this assistant",
    },
    sections: SECTIONS.map(({ key, title, hint }) => ({ key, title, what_goes_here: hint })),
    section_format: `Plain text, up to ${LIMITS.sectionBody} characters each. The website shows text exactly as written (line breaks kept, Markdown is NOT rendered), so use short paragraphs and "- " bullet lines; avoid **bold**, # headings and tables.`,
    links: config.siteUrl
      ? `Pages live at ${config.siteUrl}/d/<domain-slug>/<paper-slug>`
      : "Pages live at /d/<domain-slug>/<paper-slug> on the Lumen website",
  }
}

export async function listDomains() {
  const { db } = await connect()
  const rows = unwrap<
    (DomainRow & {
      papers: (Pick<PaperRow, "slug" | "title" | "authors" | "year"> & {
        paper_sections: { key: SectionKey; body: string }[]
      })[]
    })[]
  >(
    await db
      .from("domains")
      .select(
        "id, slug, title, description, papers(slug, title, authors, year, created_at, paper_sections(key, body))"
      )
      .order("title")
      .order("created_at", { referencedTable: "papers", ascending: false })
  )

  return rows.map((domain) => ({
    slug: domain.slug,
    title: domain.title,
    description: domain.description,
    link: link(`/d/${domain.slug}`),
    papers: domain.papers.map((paper) => {
      const filled = new Set(
        paper.paper_sections.filter((s) => s.body.trim()).map((s) => s.key)
      )
      return {
        slug: paper.slug,
        title: paper.title,
        authors: paper.authors,
        year: paper.year,
        filled_sections: SECTIONS.filter((s) => filled.has(s.key)).map((s) => s.key),
        empty_sections: SECTIONS.filter((s) => !filled.has(s.key)).map((s) => s.key),
      }
    }),
  }))
}

export async function getPaper(domainRef: string, paperRef: string) {
  const { db } = await connect()
  const { domain, paper } = await loadPaper(db, domainRef, paperRef)
  const [sections, members] = await Promise.all([
    db.from("paper_sections").select("key, body, updated_by, updated_at").eq("paper_id", paper.id),
    db.from("members").select("id, name"),
  ])
  const rows = unwrap<SectionRow[]>(sections)
  const names = new Map(unwrap<Member[]>(members).map((m) => [m.id, m.name]))

  return {
    domain: { slug: domain.slug, title: domain.title },
    slug: paper.slug,
    title: paper.title,
    authors: paper.authors,
    year: paper.year,
    external_url: paper.external_url,
    has_pdf: Boolean(paper.pdf_path),
    added_by: names.get(paper.created_by) ?? null,
    link: link(`/d/${domain.slug}/${paper.slug}`),
    sections: SECTIONS.map(({ key, title }) => {
      const row = rows.find((r) => r.key === key)
      return {
        key,
        title,
        body: row?.body ?? "",
        last_edited_by: row?.body ? (names.get(row.updated_by) ?? null) : null,
        last_edited_at: row?.body ? row.updated_at : null,
      }
    }),
  }
}

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

export async function createDomain(input: {
  title: string
  description?: string
  allowDuplicate?: boolean
}) {
  const { db, member } = await connect()
  const title = input.title.trim()
  const existing = (await loadDomains(db)).find((d) => sameText(d.title, title))
  if (existing && !input.allowDuplicate) {
    throw new Error(
      `A domain titled "${existing.title}" already exists (slug: ${existing.slug}). Use it, or set allow_duplicate to create another.`
    )
  }

  const created = await insertWithSlug(db, "domains", title, {
    title,
    description: input.description?.trim() ?? "",
    created_by: member.id,
  })
  return { created: "domain", slug: created.slug, title, link: link(`/d/${created.slug}`) }
}

export async function updateDomain(input: {
  domain: string
  title?: string
  description?: string
}) {
  const { db } = await connect()
  const domain = await loadDomain(db, input.domain)
  const changes: Record<string, string> = {}
  if (input.title !== undefined) changes.title = input.title.trim()
  if (input.description !== undefined) changes.description = input.description.trim()
  if (!Object.keys(changes).length) throw new Error("Nothing to change.")

  unwrap(await db.from("domains").update(changes).eq("id", domain.id))
  return { updated: "domain", slug: domain.slug, changed: Object.keys(changes) }
}

export async function createPaper(input: {
  domain: string
  title: string
  authors?: string
  year?: number | null
  externalUrl?: string | null
  sections?: SectionInput
  allowDuplicate?: boolean
}) {
  const { db, member } = await connect()
  const domain = await loadDomain(db, input.domain)
  const title = input.title.trim()

  const existing = unwrap<Pick<PaperRow, "slug" | "title">[]>(
    await db.from("papers").select("slug, title").eq("domain_id", domain.id)
  ).find((p) => sameText(p.title, title))
  if (existing && !input.allowDuplicate) {
    throw new Error(
      `"${existing.title}" is already in "${domain.title}" (slug: ${existing.slug}). Use lumen_write_sections to fill it, or set allow_duplicate.`
    )
  }

  const paper = await insertWithSlug(db, "papers", title, {
    domain_id: domain.id,
    title,
    authors: input.authors?.trim() ?? "",
    year: input.year ?? null,
    external_url: normalizeUrl(input.externalUrl) ?? null,
    created_by: member.id,
  })
  const result = {
    created: "paper",
    domain: domain.slug,
    slug: paper.slug,
    title,
    link: link(`/d/${domain.slug}/${paper.slug}`),
  }

  if (!input.sections || !sectionEntries(input.sections).length) return result
  try {
    const written = await saveSections(db, paper.id, input.sections, "replace")
    return { ...result, sections_written: written }
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)
    throw new Error(
      `The paper was created (${domain.slug}/${paper.slug}) but its sections could not be saved: ${reason}`
    )
  }
}

export async function updatePaper(input: {
  domain: string
  paper: string
  title?: string
  authors?: string
  year?: number | null
  externalUrl?: string | null
}) {
  const { db } = await connect()
  const { domain, paper } = await loadPaper(db, input.domain, input.paper)
  const changes: Record<string, unknown> = {}
  if (input.title !== undefined) changes.title = input.title.trim()
  if (input.authors !== undefined) changes.authors = input.authors.trim()
  if (input.year !== undefined) changes.year = input.year
  if (input.externalUrl !== undefined) changes.external_url = normalizeUrl(input.externalUrl)
  if (!Object.keys(changes).length) throw new Error("Nothing to change.")

  unwrap(await db.from("papers").update(changes).eq("id", paper.id))
  return {
    updated: "paper",
    domain: domain.slug,
    slug: paper.slug,
    changed: Object.keys(changes),
    link: link(`/d/${domain.slug}/${paper.slug}`),
  }
}

export async function writeSections(input: {
  domain: string
  paper: string
  sections: SectionInput
  mode: "replace" | "append"
}) {
  const { db } = await connect()
  const { domain, paper } = await loadPaper(db, input.domain, input.paper)
  const written = await saveSections(db, paper.id, input.sections, input.mode)
  return {
    updated: "sections",
    domain: domain.slug,
    paper: paper.slug,
    mode: input.mode,
    sections_written: written,
    link: link(`/d/${domain.slug}/${paper.slug}`),
  }
}

async function saveSections(
  db: SupabaseClient,
  paperId: string,
  sections: SectionInput,
  mode: "replace" | "append"
) {
  const entries = sectionEntries(sections)
  if (!entries.length) throw new Error("No sections given.")

  let current = new Map<SectionKey, string>()
  if (mode === "append") {
    const rows = unwrap<{ key: SectionKey; body: string }[]>(
      await db.from("paper_sections").select("key, body").eq("paper_id", paperId)
    )
    current = new Map(rows.map((row) => [row.key, row.body]))
  }

  const rows = entries.map(({ key, body }) => {
    const before = current.get(key)?.trim()
    const text = body.trim()
    const next = before && text ? `${before}\n\n${text}` : before || text
    if (next.length > LIMITS.sectionBody) {
      throw new Error(`Section "${key}" would be ${next.length} characters; the limit is ${LIMITS.sectionBody}.`)
    }
    return { paper_id: paperId, key, body: next }
  })

  unwrap(await db.from("paper_sections").upsert(rows, { onConflict: "paper_id,key" }))
  return rows.map((row) => row.key)
}
