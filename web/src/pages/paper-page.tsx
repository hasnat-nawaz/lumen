import { useEffect } from "react"
import { Link, useLocation, useNavigate, useParams } from "react-router-dom"
import {
  ExternalLinkIcon,
  FileTextIcon,
  PencilIcon,
  Trash2Icon,
} from "lucide-react"
import { toast } from "sonner"

import { useMember } from "@/auth/use-auth"
import { ConfirmDelete } from "@/components/confirm-delete"
import { Crumbs, ErrorNote, Page, Spinner } from "@/components/page"
import { PaperFormDialog } from "@/components/paper-form-dialog"
import { SectionBlock } from "@/components/section-block"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { formatDate } from "@/lib/format"
import {
  useDeletePaper,
  useMemberNames,
  usePaper,
  usePdfUrl,
  useUpdatePaper,
} from "@/lib/queries"
import { isSectionKey, SECTIONS } from "@/lib/sections"
import type { PaperDetail } from "@/lib/types"
import { cn } from "@/lib/utils"
import { NotFoundPage } from "@/pages/not-found-page"

function PaperActions({ paper }: { paper: PaperDetail }) {
  const member = useMember()
  const navigate = useNavigate()
  const pdfUrl = usePdfUrl(paper.pdf_path)
  const updatePaper = useUpdatePaper(paper)
  const deletePaper = useDeletePaper(paper, paper.domain.slug)

  return (
    <div className="flex flex-wrap items-center gap-2">
      {paper.pdf_path && (
        <Button
          nativeButton={false}
          render={
            <a
              href={pdfUrl.data}
              target="_blank"
              rel="noreferrer"
              aria-disabled={!pdfUrl.data}
              onClick={(event) => {
                if (!pdfUrl.data) event.preventDefault()
              }}
            />
          }
        >
          {pdfUrl.isPending ? <Spinner className="text-primary-foreground" /> : <FileTextIcon />}
          Open PDF
        </Button>
      )}
      {paper.external_url && (
        <Button
          variant="outline"
          nativeButton={false}
          render={<a href={paper.external_url} target="_blank" rel="noreferrer" />}
        >
          <ExternalLinkIcon />
          Open link
        </Button>
      )}
      <PaperFormDialog
        mode="edit"
        initial={{
          title: paper.title,
          authors: paper.authors,
          year: paper.year,
          externalUrl: paper.external_url,
          hasPdf: Boolean(paper.pdf_path),
        }}
        trigger={
          <Button variant="ghost">
            <PencilIcon />
            Details
          </Button>
        }
        onSubmit={async (input) => {
          await updatePaper.mutateAsync(input)
          toast.success("Paper updated")
        }}
      />
      {member.role === "admin" && (
        <ConfirmDelete
          title={`Delete “${paper.title}”?`}
          description="This removes the paper, its sections and its PDF. Chat messages stay."
          trigger={
            <Button variant="ghost" className="text-muted-foreground hover:text-destructive">
              <Trash2Icon />
              Delete
            </Button>
          }
          onConfirm={async () => {
            await deletePaper.mutateAsync()
            toast.success("Paper deleted")
            navigate(`/d/${paper.domain.slug}`, { replace: true })
          }}
        />
      )}
    </div>
  )
}

export function PaperPage() {
  const { domainSlug = "", paperSlug = "", sectionKey } = useParams()
  const names = useMemberNames()
  const { data: paper, isPending, error } = usePaper(domainSlug, paperSlug)
  const activeSection = isSectionKey(sectionKey) ? sectionKey : null
  const location = useLocation()
  const loaded = Boolean(paper)

  useEffect(() => {
    if (!loaded || !activeSection) return
    const element = document.getElementById(`section-${activeSection}`)
    if (!element) return
    const done = () => element.classList.remove("lumen-flash")
    const frame = requestAnimationFrame(() => {
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
      element.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" })
      element.classList.remove("lumen-flash")
      void element.offsetWidth
      element.classList.add("lumen-flash")
      element.addEventListener("animationend", done, { once: true })
    })
    return () => {
      cancelAnimationFrame(frame)
      element.removeEventListener("animationend", done)
    }
  }, [loaded, activeSection, location.key])

  if (isPending) {
    return (
      <Page>
        <Skeleton className="mb-3 h-4 w-48" />
        <Skeleton className="mb-3 h-12 w-3/4 max-w-xl" />
        <Skeleton className="mb-10 h-4 w-40" />
        <div className="grid gap-4">
          <Skeleton className="h-40 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </Page>
    )
  }

  if (error) {
    return (
      <Page>
        <ErrorNote error={error} />
      </Page>
    )
  }

  if (!paper) return <NotFoundPage />

  const sections = new Map(paper.paper_sections.map((section) => [section.key, section]))
  const base = `/d/${paper.domain.slug}/${paper.slug}`
  const meta = [paper.authors, paper.year].filter(Boolean).join(" · ")
  const addedBy = names.get(paper.created_by)

  return (
    <Page>
      <Crumbs
        items={[
          { label: "Domains", to: "/" },
          { label: paper.domain.title, to: `/d/${paper.domain.slug}` },
          { label: paper.title },
        ]}
      />

      <div className="mb-8">
        <h1 className="font-heading text-4xl leading-[1.05] text-balance sm:text-5xl">
          {paper.title}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {meta && <span className="text-foreground/80">{meta}</span>}
          {meta && " · "}
          Added {addedBy ? `by ${addedBy} ` : ""}on {formatDate(paper.created_at)}
        </p>
        <div className="mt-5">
          <PaperActions paper={paper} />
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[11rem_minmax(0,1fr)] lg:gap-12">
        <nav
          aria-label="Sections"
          className="-mx-4 overflow-x-auto px-4 lg:sticky lg:top-24 lg:mx-0 lg:self-start lg:overflow-visible lg:px-0"
        >
          <ol className="flex gap-1 lg:flex-col">
            {SECTIONS.map((section) => {
              const filled = Boolean(sections.get(section.key)?.body)
              return (
                <li key={section.key}>
                  <Link
                    to={`${base}/${section.key}`}
                    replace
                    preventScrollReset
                    className={cn(
                      "flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm whitespace-nowrap text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground",
                      activeSection === section.key && "bg-muted text-foreground"
                    )}
                  >
                    <span
                      aria-hidden
                      className={cn(
                        "size-1.5 rounded-full",
                        filled ? "bg-gold" : "bg-muted-foreground/30"
                      )}
                    />
                    {section.title}
                  </Link>
                </li>
              )
            })}
          </ol>
        </nav>

        <div className="grid gap-4">
          {SECTIONS.map((section) => {
            const value = sections.get(section.key)
            return (
              <SectionBlock
                key={section.key}
                paper={paper}
                section={section}
                value={value}
                editorName={value ? names.get(value.updated_by) : undefined}
              />
            )
          })}
        </div>
      </div>
    </Page>
  )
}
