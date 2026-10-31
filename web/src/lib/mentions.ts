import type { TargetData } from "@/lib/queries"
import { SECTIONS } from "@/lib/sections"

export type MentionKind = "domain" | "paper" | "section"

export type MentionTarget = {
  kind: MentionKind
  path: string
  label: string
  trail: string[]
  search: string
}

export function buildTargets(data: TargetData | undefined) {
  const list: MentionTarget[] = []
  if (!data) return list

  const domainsById = new Map(data.domains.map((domain) => [domain.id, domain]))

  for (const domain of data.domains) {
    list.push({
      kind: "domain",
      path: domain.slug,
      label: domain.title,
      trail: [domain.title],
      search: `${domain.slug} ${domain.title}`.toLowerCase(),
    })
  }

  for (const paper of data.papers) {
    const domain = domainsById.get(paper.domain_id)
    if (!domain) continue
    const paperPath = `${domain.slug}/${paper.slug}`
    list.push({
      kind: "paper",
      path: paperPath,
      label: paper.title,
      trail: [domain.title, paper.title],
      search: `${paperPath} ${domain.title} ${paper.title}`.toLowerCase(),
    })
    for (const section of SECTIONS) {
      list.push({
        kind: "section",
        path: `${paperPath}/${section.key}`,
        label: section.title,
        trail: [domain.title, paper.title, section.title],
        search:
          `${paperPath}/${section.key} ${domain.title} ${paper.title} ${section.title}`.toLowerCase(),
      })
    }
  }

  return list
}

export function filterTargets(targets: MentionTarget[], rawQuery: string) {
  const query = rawQuery.toLowerCase()
  const depth = query.split("/").length - 1
  const terms = query.split(/[\s/]+/).filter(Boolean)

  const scored: { target: MentionTarget; score: number }[] = []
  for (const target of targets) {
    const targetDepth = target.path.split("/").length - 1
    if (targetDepth > depth + 1) continue
    if (!terms.every((term) => target.search.includes(term))) continue

    let score = targetDepth * 10
    if (target.path.startsWith(query)) score -= 50
    if (target.label.toLowerCase().startsWith(terms.at(-1) ?? "")) score -= 5
    scored.push({ target, score })
  }

  return scored
    .sort((a, b) => a.score - b.score)
    .slice(0, 8)
    .map((entry) => entry.target)
}

export function mentionHref(path: string) {
  return `/d/${path}`
}

export type BodyPart =
  | { type: "text"; value: string }
  | { type: "mention"; value: string; target: MentionTarget }
  | { type: "link"; value: string }

const TOKEN = /(^|\s)(@[a-z0-9-]+(?:\/[a-z0-9-]+){0,2})|(https?:\/\/[^\s]+)/g

export function parseBody(
  body: string,
  byPath: Map<string, MentionTarget>
): BodyPart[] {
  const parts: BodyPart[] = []
  let cursor = 0

  for (const match of body.matchAll(TOKEN)) {
    const [whole, lead = "", mention, url] = match
    const start = match.index! + lead.length
    if (start > cursor) parts.push({ type: "text", value: body.slice(cursor, start) })

    if (url) {
      parts.push({ type: "link", value: url })
    } else if (mention) {
      const target = byPath.get(mention.slice(1))
      parts.push(
        target
          ? { type: "mention", value: mention, target }
          : { type: "text", value: mention }
      )
    }
    cursor = match.index! + whole.length
  }

  if (cursor < body.length) parts.push({ type: "text", value: body.slice(cursor) })
  return parts
}

export function activeMention(value: string, caret: number) {
  const before = value.slice(0, caret)
  const match = /(^|\s)@([^\s@]*)$/.exec(before)
  if (!match) return null
  return { query: match[2], start: caret - match[2].length - 1 }
}
