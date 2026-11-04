import type { SectionKey } from "@/lib/sections"

export type Role = "admin" | "member"

export type Member = {
  id: string
  name: string
  role: Role
}

export type Domain = {
  id: string
  slug: string
  title: string
  description: string
  created_by: string
  created_at: string
}

export type DomainWithCount = Domain & { papers: { count: number }[] }

export type PaperSummary = {
  id: string
  slug: string
  title: string
  authors: string
  year: number | null
  pdf_path: string | null
  external_url: string | null
  created_by: string
  created_at: string
}

export type PaperSection = {
  key: SectionKey
  body: string
  updated_by: string
  updated_at: string
}

export type PaperDetail = PaperSummary & {
  domain: Pick<Domain, "id" | "slug" | "title">
  paper_sections: PaperSection[]
}

export type PaperListItem = PaperSummary & {
  paper_sections: { key: SectionKey }[]
}

export type DomainDetail = Domain & { papers: PaperListItem[] }

export type Message = {
  id: number
  client_id: string
  author_id: string
  body: string
  created_at: string
  pending?: boolean
  failed?: boolean
}
