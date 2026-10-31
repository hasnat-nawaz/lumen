import { Link, useNavigate, useParams } from "react-router-dom"
import { useQueryClient } from "@tanstack/react-query"
import { FileTextIcon, LinkIcon, PlusIcon, Trash2Icon } from "lucide-react"
import { toast } from "sonner"

import { useMember } from "@/auth/use-auth"
import { ConfirmDelete } from "@/components/confirm-delete"
import {
  Crumbs,
  EmptyState,
  ErrorNote,
  Page,
  PageTitle,
} from "@/components/page"
import { PaperFormDialog } from "@/components/paper-form-dialog"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { formatRelative } from "@/lib/format"
import {
  prefetchPaper,
  useCreatePaper,
  useDeleteDomain,
  useDeletePaper,
  useDomain,
  useMemberNames,
} from "@/lib/queries"
import type { PaperSummary } from "@/lib/types"
import { NotFoundPage } from "@/pages/not-found-page"

function PaperRow({
  paper,
  domainSlug,
  addedBy,
  canDelete,
}: {
  paper: PaperSummary
  domainSlug: string
  addedBy?: string
  canDelete: boolean
}) {
  const queryClient = useQueryClient()
  const deletePaper = useDeletePaper(paper, domainSlug)
  const prefetch = () => void prefetchPaper(queryClient, domainSlug, paper.slug)
  const meta = [paper.authors, paper.year].filter(Boolean).join(" · ")

  return (
    <li className="group relative">
      <Link
        to={`/d/${domainSlug}/${paper.slug}`}
        onMouseEnter={prefetch}
        onFocus={prefetch}
        onTouchStart={prefetch}
        className="flex flex-col gap-1 px-4 py-4 transition-colors hover:bg-accent/40 focus-visible:bg-accent/40 focus-visible:outline-none sm:flex-row sm:items-center sm:gap-4 sm:px-5"
      >
        <div className="min-w-0 flex-1 pr-8 sm:pr-0">
          <p className="font-medium text-pretty">{paper.title}</p>
          {meta && <p className="mt-0.5 truncate text-sm text-muted-foreground">{meta}</p>}
        </div>
        <div className="flex shrink-0 items-center gap-3 text-xs text-muted-foreground sm:pr-8">
          {paper.pdf_path && (
            <span className="inline-flex items-center gap-1">
              <FileTextIcon className="size-3.5 text-gold" /> PDF
            </span>
          )}
          {paper.external_url && (
            <span className="inline-flex items-center gap-1">
              <LinkIcon className="size-3.5" /> Link
            </span>
          )}
          <span>
            {addedBy ? `${addedBy}, ` : ""}
            {formatRelative(paper.created_at)}
          </span>
        </div>
      </Link>
      {canDelete && (
        <div className="absolute top-3 right-2 sm:top-1/2 sm:-translate-y-1/2">
          <ConfirmDelete
            title={`Delete “${paper.title}”?`}
            description="This removes the paper, its sections and its PDF. Chat messages stay."
            onConfirm={async () => {
              await deletePaper.mutateAsync()
              toast.success("Paper deleted")
            }}
          />
        </div>
      )}
    </li>
  )
}

export function DomainPage() {
  const { domainSlug = "" } = useParams()
  const member = useMember()
  const names = useMemberNames()
  const navigate = useNavigate()
  const { data: domain, isPending, error } = useDomain(domainSlug)
  const deleteDomain = useDeleteDomain()
  const createPaper = useCreatePaper({
    id: domain?.id ?? "",
    slug: domainSlug,
  })
  const isAdmin = member.role === "admin"

  if (isPending) {
    return (
      <Page>
        <Skeleton className="mb-3 h-4 w-24" />
        <Skeleton className="mb-10 h-12 w-2/3 max-w-md" />
        <Skeleton className="h-64 rounded-xl" />
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

  if (!domain) return <NotFoundPage />

  const addPaper = (
    <PaperFormDialog
      mode="create"
      trigger={
        <Button>
          <PlusIcon />
          Add paper
        </Button>
      }
      onSubmit={async (input) => {
        const slug = await createPaper.mutateAsync({ ...input, memberId: member.id })
        toast.success("Paper added", {
          action: {
            label: "Open",
            onClick: () => navigate(`/d/${domain.slug}/${slug}`),
          },
        })
      }}
    />
  )

  return (
    <Page>
      <Crumbs items={[{ label: "Domains", to: "/" }, { label: domain.title }]} />
      <PageTitle
        title={domain.title}
        description={domain.description || undefined}
        actions={
          <>
            {isAdmin && (
              <ConfirmDelete
                title={`Delete ${domain.title}?`}
                description={`This removes the domain and all ${domain.papers.length} of its papers, sections and PDFs. Chat messages stay.`}
                trigger={
                  <Button variant="ghost" className="text-muted-foreground hover:text-destructive">
                    <Trash2Icon />
                    Delete
                  </Button>
                }
                onConfirm={async () => {
                  await deleteDomain.mutateAsync(domain.id)
                  toast.success(`Deleted ${domain.title}`)
                  navigate("/", { replace: true })
                }}
              />
            )}
            {domain.papers.length > 0 && addPaper}
          </>
        }
      />

      {domain.papers.length === 0 ? (
        <EmptyState
          title="No papers yet"
          description="Add the first research paper for this domain."
          action={addPaper}
        />
      ) : (
        <ul className="divide-y overflow-hidden rounded-xl border bg-card">
          {domain.papers.map((paper) => (
            <PaperRow
              key={paper.id}
              paper={paper}
              domainSlug={domain.slug}
              addedBy={names.get(paper.created_by)}
              canDelete={isAdmin}
            />
          ))}
        </ul>
      )}
    </Page>
  )
}
