import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"
import * as z from "zod"

import { SECTIONS, type SectionKey } from "../../web/src/lib/sections.ts"
import {
  connect,
  createDomain,
  createPaper,
  getPaper,
  getStructure,
  LIMITS,
  listDomains,
  updateDomain,
  updatePaper,
  writeSections,
} from "./lumen.ts"

const INSTRUCTIONS = `Lumen is the team's FYP research desk: domains (research areas) contain papers, and every paper has the same fixed sections.

When the user asks to add or update something in Lumen:
1. Call lumen_get_structure once per conversation to learn the fields and what each section is for. Do not ask the user which boxes to fill; decide from the structure.
2. Call lumen_list_domains to find existing domains and papers, so you reuse them instead of creating duplicates.
3. Create what is missing, then fill every section you have real information for from the conversation. Leave a section out rather than inventing facts.
4. Reply with the links the tools return.

Sections are plain text (line breaks are kept, Markdown is not rendered). Write for teammates: clear, specific, no filler.`

const domainRef = z
  .string()
  .min(1)
  .describe("Domain slug (preferred) or exact title, as returned by lumen_list_domains")
const paperRef = z
  .string()
  .min(1)
  .describe("Paper slug (preferred) or exact title within that domain")
const year = z.number().int().min(LIMITS.yearMin).max(LIMITS.yearMax)

const sections = z
  .object(
    Object.fromEntries(
      SECTIONS.map(({ key, title, hint }) => [
        key,
        z.string().max(LIMITS.sectionBody).optional().describe(`${title}: ${hint}`),
      ])
    ) as Record<SectionKey, z.ZodOptional<z.ZodString>>
  )
  .describe("Section texts keyed by section key. Only include sections you have content for.")

function respond(work: () => Promise<unknown>) {
  return work().then(
    (data) => ({ content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] }),
    (error: unknown) => ({
      isError: true,
      content: [
        { type: "text" as const, text: error instanceof Error ? error.message : String(error) },
      ],
    })
  )
}

const server = new McpServer(
  { name: "lumen", version: "0.1.0" },
  { instructions: INSTRUCTIONS }
)

server.registerTool(
  "lumen_get_structure",
  {
    title: "Get Lumen structure",
    description:
      "Describes how Lumen is organised: domain fields, paper fields, every paper section with what belongs in it, and formatting rules. Call this before adding or editing content.",
    annotations: { readOnlyHint: true },
  },
  () => respond(getStructure)
)

server.registerTool(
  "lumen_list_domains",
  {
    title: "List domains and papers",
    description:
      "Lists every domain with its papers, including which sections of each paper are filled or still empty. Use it to find slugs and avoid duplicates.",
    annotations: { readOnlyHint: true },
  },
  () => respond(listDomains)
)

server.registerTool(
  "lumen_get_paper",
  {
    title: "Read a paper",
    description: "Returns a paper's details and the full text of all its sections.",
    inputSchema: { domain: domainRef, paper: paperRef },
    annotations: { readOnlyHint: true },
  },
  ({ domain, paper }) => respond(() => getPaper(domain, paper))
)

server.registerTool(
  "lumen_create_domain",
  {
    title: "Create a domain",
    description: "Creates a new research domain. Fails if one with the same title exists.",
    inputSchema: {
      title: z.string().trim().min(1).max(LIMITS.domainTitle),
      description: z.string().max(LIMITS.domainDescription).optional(),
      allow_duplicate: z
        .boolean()
        .optional()
        .describe("Only set true if the user explicitly wants a second domain with the same title"),
    },
  },
  ({ title, description, allow_duplicate }) =>
    respond(() => createDomain({ title, description, allowDuplicate: allow_duplicate }))
)

server.registerTool(
  "lumen_update_domain",
  {
    title: "Edit a domain",
    description: "Changes a domain's title and/or description. Its link (slug) stays the same.",
    inputSchema: {
      domain: domainRef,
      title: z.string().trim().min(1).max(LIMITS.domainTitle).optional(),
      description: z.string().max(LIMITS.domainDescription).optional(),
    },
    annotations: { idempotentHint: true },
  },
  (args) => respond(() => updateDomain(args))
)

server.registerTool(
  "lumen_create_paper",
  {
    title: "Add a paper",
    description:
      "Adds a paper to an existing domain and can fill its sections in the same call. Fails if the domain already has a paper with the same title.",
    inputSchema: {
      domain: domainRef,
      title: z.string().trim().min(1).max(LIMITS.paperTitle),
      authors: z.string().max(LIMITS.paperAuthors).optional(),
      year: year.optional(),
      external_url: z.string().optional().describe("Link to the paper, e.g. an arXiv or DOI URL"),
      sections: sections.optional(),
      allow_duplicate: z
        .boolean()
        .optional()
        .describe("Only set true if the user explicitly wants a second paper with the same title"),
    },
  },
  (args) =>
    respond(() =>
      createPaper({
        domain: args.domain,
        title: args.title,
        authors: args.authors,
        year: args.year,
        externalUrl: args.external_url,
        sections: args.sections,
        allowDuplicate: args.allow_duplicate,
      })
    )
)

server.registerTool(
  "lumen_update_paper",
  {
    title: "Edit paper details",
    description:
      "Changes a paper's title, authors, year or link. Pass null for year or external_url to clear them. The paper's link (slug) stays the same.",
    inputSchema: {
      domain: domainRef,
      paper: paperRef,
      title: z.string().trim().min(1).max(LIMITS.paperTitle).optional(),
      authors: z.string().max(LIMITS.paperAuthors).optional(),
      year: year.nullable().optional(),
      external_url: z.string().nullable().optional(),
    },
    annotations: { idempotentHint: true },
  },
  (args) =>
    respond(() =>
      updatePaper({
        domain: args.domain,
        paper: args.paper,
        title: args.title,
        authors: args.authors,
        year: args.year,
        externalUrl: args.external_url,
      })
    )
)

server.registerTool(
  "lumen_write_sections",
  {
    title: "Write paper sections",
    description:
      'Fills or updates sections of an existing paper. mode "replace" overwrites each given section (an empty string clears it); mode "append" adds the text below what is already there. Sections not included are left untouched.',
    inputSchema: {
      domain: domainRef,
      paper: paperRef,
      sections,
      mode: z.enum(["replace", "append"]).default("replace"),
    },
  },
  (args) => respond(() => writeSections(args))
)

if (process.argv.includes("--check")) {
  try {
    const { member } = await connect()
    const domains = await listDomains()
    const papers = domains.reduce((sum, d) => sum + d.papers.length, 0)
    console.log(
      `Lumen MCP is ready. Signed in as ${member.name} (${member.role}). ${domains.length} domains, ${papers} papers.`
    )
    process.exit(0)
  } catch (error) {
    console.error(error instanceof Error ? error.message : error)
    process.exit(1)
  }
}

await server.connect(new StdioServerTransport())
