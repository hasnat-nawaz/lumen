import { Link } from "react-router-dom"
import { useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { useMember } from "@/auth/use-auth"
import { AddDomainDialog } from "@/components/add-domain-dialog"
import { ConfirmDelete } from "@/components/confirm-delete"
import { EmptyState, ErrorNote, Page, PageTitle } from "@/components/page"
import { Skeleton } from "@/components/ui/skeleton"
import {
  prefetchDomain,
  useDeleteDomain,
  useDomains,
  useMemberNames,
} from "@/lib/queries"
import type { DomainWithCount } from "@/lib/types"

function DomainCard({
  domain,
  canDelete,
  addedBy,
}: {
  domain: DomainWithCount
  canDelete: boolean
  addedBy?: string
}) {
  const queryClient = useQueryClient()
  const deleteDomain = useDeleteDomain()
  const count = domain.papers[0]?.count ?? 0
  const prefetch = () => void prefetchDomain(queryClient, domain.slug)

  return (
    <div className="group relative min-w-0">
      <Link
        to={`/d/${domain.slug}`}
        onMouseEnter={prefetch}
        onFocus={prefetch}
        onTouchStart={prefetch}
        className="flex h-full min-h-40 flex-col rounded-xl border bg-card p-5 transition-colors hover:border-foreground/15 hover:bg-accent/40 focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none"
      >
        <h2 className="pr-8 font-heading text-xl leading-snug text-balance wrap-anywhere">
          {domain.title}
        </h2>
        <p className="mt-2 line-clamp-2 text-sm text-muted-foreground wrap-anywhere">
          {domain.description || "No description yet"}
        </p>
        <div className="mt-auto flex items-center gap-2 pt-5 text-xs text-muted-foreground">
          <span className="text-foreground/90 tabular-nums">
            {count} {count === 1 ? "paper" : "papers"}
          </span>
          {addedBy && (
            <>
              <span aria-hidden>·</span>
              <span>added by {addedBy}</span>
            </>
          )}
        </div>
      </Link>
      {canDelete && (
        <div className="absolute top-3 right-3 opacity-100 transition-opacity sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100">
          <ConfirmDelete
            title={`Delete ${domain.title}?`}
            description={`This removes the domain and all ${count} of its papers, sections and PDFs. Chat messages stay.`}
            onConfirm={async () => {
              await deleteDomain.mutateAsync(domain.id)
              toast.success(`Deleted ${domain.title}`)
            }}
          />
        </div>
      )}
    </div>
  )
}

export function DomainsPage() {
  const member = useMember()
  const names = useMemberNames()
  const { data, isPending, error } = useDomains()

  return (
    <Page>
      <PageTitle
        title="Domains"
        description="The lanes we're exploring for the FYP. Open one to see its papers."
        actions={data && data.length > 0 && <AddDomainDialog />}
      />

      {error && <ErrorNote error={error} />}

      {isPending && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }, (_, index) => (
            <Skeleton key={index} className="h-40 rounded-xl" />
          ))}
        </div>
      )}

      {data && data.length === 0 && (
        <EmptyState
          title="No domains yet"
          description="Start with a lane you want to explore, then add papers to it"
          action={<AddDomainDialog />}
        />
      )}

      {data && data.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((domain) => (
            <DomainCard
              key={domain.id}
              domain={domain}
              canDelete={member.role === "admin"}
              addedBy={names.get(domain.created_by)}
            />
          ))}
        </div>
      )}
    </Page>
  )
}
