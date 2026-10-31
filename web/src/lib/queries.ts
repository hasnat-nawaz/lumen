import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
  type QueryClient,
} from "@tanstack/react-query"

import { PDF_BUCKET, supabase } from "@/lib/supabase"
import type { SectionKey } from "@/lib/sections"
import { slugify, UNIQUE_VIOLATION, withSuffix } from "@/lib/slug"
import type {
  DomainDetail,
  DomainWithCount,
  Member,
  Message,
  PaperDetail,
  PaperSummary,
} from "@/lib/types"

export const keys = {
  members: ["members"] as const,
  domains: ["domains"] as const,
  domain: (slug: string) => ["domain", slug] as const,
  paper: (domainSlug: string, paperSlug: string) =>
    ["paper", domainSlug, paperSlug] as const,
  targets: ["mention-targets"] as const,
  messages: ["messages"] as const,
  pdfUrl: (path: string) => ["pdf-url", path] as const,
}

const PAPER_FIELDS =
  "id, slug, title, authors, year, pdf_path, external_url, created_by, created_at"

function unwrap<T>(result: { data: T | null; error: { message: string } | null }) {
  if (result.error) throw new Error(result.error.message)
  return result.data as T
}

// ---------------------------------------------------------------------------
// Members
// ---------------------------------------------------------------------------

export function useMembers() {
  return useQuery({
    queryKey: keys.members,
    queryFn: async () =>
      unwrap<Member[]>(
        await supabase.from("members").select("id, name, role").order("name")
      ),
    staleTime: Infinity,
  })
}

export function useMemberNames() {
  const { data } = useMembers()
  const names = new Map<string, string>()
  data?.forEach((member) => names.set(member.id, member.name))
  return names
}

// ---------------------------------------------------------------------------
// Domains
// ---------------------------------------------------------------------------

async function fetchDomains() {
  return unwrap<DomainWithCount[]>(
    await supabase
      .from("domains")
      .select(
        "id, slug, title, description, created_by, created_at, papers(count)"
      )
      .order("created_at", { ascending: true })
  )
}

export function useDomains() {
  return useQuery({ queryKey: keys.domains, queryFn: fetchDomains })
}

async function fetchDomain(slug: string) {
  return unwrap<DomainDetail | null>(
    await supabase
      .from("domains")
      .select(
        `id, slug, title, description, created_by, created_at, papers(${PAPER_FIELDS})`
      )
      .eq("slug", slug)
      .order("created_at", { referencedTable: "papers", ascending: false })
      .maybeSingle()
  )
}

export function useDomain(slug: string) {
  return useQuery({
    queryKey: keys.domain(slug),
    queryFn: () => fetchDomain(slug),
  })
}

export function prefetchDomain(queryClient: QueryClient, slug: string) {
  return queryClient.prefetchQuery({
    queryKey: keys.domain(slug),
    queryFn: () => fetchDomain(slug),
    staleTime: 30_000,
  })
}

export function useCreateDomain() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      title: string
      description: string
      memberId: string
    }) => {
      const base = slugify(input.title)
      for (const slug of [base, withSuffix(base), withSuffix(base)]) {
        const { data, error } = await supabase
          .from("domains")
          .insert({
            slug,
            title: input.title,
            description: input.description,
            created_by: input.memberId,
          })
          .select("slug")
          .single()
        if (!error) return data.slug as string
        if (error.code !== UNIQUE_VIOLATION) throw new Error(error.message)
      }
      throw new Error("Could not create a unique link for this domain")
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.domains })
      queryClient.invalidateQueries({ queryKey: keys.targets })
    },
  })
}

export function useDeleteDomain() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (domainId: string) => {
      const papers = unwrap<{ pdf_path: string | null }[]>(
        await supabase
          .from("papers")
          .select("pdf_path")
          .eq("domain_id", domainId)
      )
      const paths = papers
        .map((paper) => paper.pdf_path)
        .filter((path): path is string => Boolean(path))
      if (paths.length) await supabase.storage.from(PDF_BUCKET).remove(paths)
      unwrap(await supabase.from("domains").delete().eq("id", domainId))
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.domains })
      queryClient.invalidateQueries({ queryKey: keys.targets })
    },
  })
}

// ---------------------------------------------------------------------------
// Papers
// ---------------------------------------------------------------------------

async function fetchPaper(domainSlug: string, paperSlug: string) {
  return unwrap<PaperDetail | null>(
    await supabase
      .from("papers")
      .select(
        `${PAPER_FIELDS}, domain:domains!inner(id, slug, title), paper_sections(key, body, updated_by, updated_at)`
      )
      .eq("slug", paperSlug)
      .eq("domain.slug", domainSlug)
      .maybeSingle()
  )
}

export function usePaper(domainSlug: string, paperSlug: string) {
  return useQuery({
    queryKey: keys.paper(domainSlug, paperSlug),
    queryFn: () => fetchPaper(domainSlug, paperSlug),
  })
}

export function prefetchPaper(
  queryClient: QueryClient,
  domainSlug: string,
  paperSlug: string
) {
  return queryClient.prefetchQuery({
    queryKey: keys.paper(domainSlug, paperSlug),
    queryFn: () => fetchPaper(domainSlug, paperSlug),
    staleTime: 30_000,
  })
}

async function uploadPdf(file: File) {
  const path = `${crypto.randomUUID()}.pdf`
  const { error } = await supabase.storage
    .from(PDF_BUCKET)
    .upload(path, file, { contentType: "application/pdf", upsert: false })
  if (error) throw new Error(`PDF upload failed: ${error.message}`)
  return path
}

export type PaperInput = {
  title: string
  authors: string
  year: number | null
  externalUrl: string | null
  file: File | null
}

export function useCreatePaper(domain: { id: string; slug: string }) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: PaperInput & { memberId: string }) => {
      const pdfPath = input.file ? await uploadPdf(input.file) : null
      const base = slugify(input.title)
      try {
        for (const slug of [base, withSuffix(base), withSuffix(base)]) {
          const { data, error } = await supabase
            .from("papers")
            .insert({
              domain_id: domain.id,
              slug,
              title: input.title,
              authors: input.authors,
              year: input.year,
              external_url: input.externalUrl,
              pdf_path: pdfPath,
              created_by: input.memberId,
            })
            .select("slug")
            .single()
          if (!error) return data.slug as string
          if (error.code !== UNIQUE_VIOLATION) throw new Error(error.message)
        }
        throw new Error("Could not create a unique link for this paper")
      } catch (error) {
        if (pdfPath) await supabase.storage.from(PDF_BUCKET).remove([pdfPath])
        throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.domain(domain.slug) })
      queryClient.invalidateQueries({ queryKey: keys.domains })
      queryClient.invalidateQueries({ queryKey: keys.targets })
    },
  })
}

export function useUpdatePaper(paper: PaperDetail) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: Omit<PaperInput, "title">) => {
      const newPath = input.file ? await uploadPdf(input.file) : null
      const { error } = await supabase
        .from("papers")
        .update({
          authors: input.authors,
          year: input.year,
          external_url: input.externalUrl,
          ...(newPath ? { pdf_path: newPath } : {}),
        })
        .eq("id", paper.id)
      if (error) {
        if (newPath) await supabase.storage.from(PDF_BUCKET).remove([newPath])
        throw new Error(error.message)
      }
      if (newPath && paper.pdf_path) {
        await supabase.storage.from(PDF_BUCKET).remove([paper.pdf_path])
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: keys.paper(paper.domain.slug, paper.slug),
      })
      queryClient.invalidateQueries({ queryKey: keys.domain(paper.domain.slug) })
    },
  })
}

export function useDeletePaper(paper: PaperSummary, domainSlug: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      if (paper.pdf_path) {
        await supabase.storage.from(PDF_BUCKET).remove([paper.pdf_path])
      }
      unwrap(await supabase.from("papers").delete().eq("id", paper.id))
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.domain(domainSlug) })
      queryClient.invalidateQueries({ queryKey: keys.domains })
      queryClient.invalidateQueries({ queryKey: keys.targets })
      queryClient.removeQueries({ queryKey: keys.paper(domainSlug, paper.slug) })
    },
  })
}

export function useSaveSection(paper: PaperDetail) {
  const queryClient = useQueryClient()
  const queryKey = keys.paper(paper.domain.slug, paper.slug)
  return useMutation({
    mutationFn: async (input: { key: SectionKey; body: string }) =>
      unwrap(
        await supabase
          .from("paper_sections")
          .upsert(
            { paper_id: paper.id, key: input.key, body: input.body },
            { onConflict: "paper_id,key" }
          )
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  })
}

export function usePdfUrl(path: string | null) {
  return useQuery({
    queryKey: keys.pdfUrl(path ?? ""),
    enabled: Boolean(path),
    staleTime: 50 * 60_000,
    gcTime: 55 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.storage
        .from(PDF_BUCKET)
        .createSignedUrl(path!, 60 * 60)
      if (error) throw new Error(error.message)
      return data.signedUrl
    },
  })
}

// ---------------------------------------------------------------------------
// Mention targets (all domains and papers, lightweight)
// ---------------------------------------------------------------------------

export type TargetData = {
  domains: { id: string; slug: string; title: string }[]
  papers: { id: string; slug: string; title: string; domain_id: string }[]
}

export function useMentionTargets() {
  return useQuery({
    queryKey: keys.targets,
    staleTime: 60_000,
    queryFn: async (): Promise<TargetData> => {
      const [domains, papers] = await Promise.all([
        supabase.from("domains").select("id, slug, title").order("title"),
        supabase
          .from("papers")
          .select("id, slug, title, domain_id")
          .order("title"),
      ])
      return {
        domains: unwrap(domains),
        papers: unwrap(papers),
      }
    },
  })
}

// ---------------------------------------------------------------------------
// Chat
// ---------------------------------------------------------------------------

export const MESSAGE_PAGE = 40
const MESSAGE_FIELDS = "id, client_id, author_id, body, created_at"

export type MessagePages = InfiniteData<Message[], number | null>

export function useMessages() {
  return useInfiniteQuery({
    queryKey: keys.messages,
    initialPageParam: null as number | null,
    staleTime: Infinity,
    queryFn: async ({ pageParam }) => {
      let query = supabase
        .from("messages")
        .select(MESSAGE_FIELDS)
        .order("id", { ascending: false })
        .limit(MESSAGE_PAGE)
      if (pageParam !== null) query = query.lt("id", pageParam)
      return unwrap<Message[]>(await query)
    },
    getNextPageParam: (lastPage) =>
      lastPage.length === MESSAGE_PAGE ? lastPage[lastPage.length - 1].id : null,
  })
}

export function upsertMessage(queryClient: QueryClient, message: Message) {
  queryClient.setQueryData<MessagePages>(keys.messages, (data) => {
    if (!data) return data
    let replaced = false
    const pages = data.pages.map((page) =>
      page.map((existing) => {
        if (existing.client_id === message.client_id) {
          replaced = true
          return message
        }
        return existing
      })
    )
    if (!replaced) pages[0] = [message, ...(pages[0] ?? [])]
    return { ...data, pages }
  })
}

export function useSendMessage(memberId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: { body: string; clientId: string }) =>
      unwrap<Message>(
        await supabase
          .from("messages")
          .insert({
            body: input.body,
            client_id: input.clientId,
            author_id: memberId,
          })
          .select(MESSAGE_FIELDS)
          .single()
      ),
    onMutate: ({ body, clientId }) => {
      upsertMessage(queryClient, {
        id: -Date.now(),
        client_id: clientId,
        author_id: memberId,
        body,
        created_at: new Date().toISOString(),
        pending: true,
      })
    },
    onSuccess: (message) => upsertMessage(queryClient, message),
    onError: (_error, { body, clientId }) => {
      upsertMessage(queryClient, {
        id: -Date.now(),
        client_id: clientId,
        author_id: memberId,
        body,
        created_at: new Date().toISOString(),
        failed: true,
      })
    },
  })
}
