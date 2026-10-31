import { Fragment } from "react"
import { Link } from "react-router-dom"
import { ChevronRightIcon, Loader2Icon } from "lucide-react"

import { cn } from "@/lib/utils"

export function Page({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "mx-auto w-full max-w-6xl px-4 pt-6 pb-16 sm:px-6 sm:pt-10",
        className
      )}
      {...props}
    />
  )
}

export function Crumbs({ items }: { items: { label: string; to?: string }[] }) {
  return (
    <nav
      aria-label="Breadcrumb"
      className="mb-3 flex min-w-0 items-center gap-1 text-sm text-muted-foreground"
    >
      {items.map((item, index) => (
        <Fragment key={`${item.label}-${index}`}>
          {index > 0 && <ChevronRightIcon className="size-3.5 shrink-0 opacity-60" />}
          {item.to ? (
            <Link
              to={item.to}
              className="truncate transition-colors hover:text-foreground"
            >
              {item.label}
            </Link>
          ) : (
            <span className="truncate text-foreground/80">{item.label}</span>
          )}
        </Fragment>
      ))}
    </nav>
  )
}

export function PageTitle({
  title,
  description,
  actions,
}: {
  title: string
  description?: React.ReactNode
  actions?: React.ReactNode
}) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="font-heading text-3xl leading-tight text-balance wrap-anywhere sm:text-4xl">
          {title}
        </h1>
        {description && (
          <p className="mt-2 max-w-2xl text-pretty text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </div>
  )
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string
  description: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-dashed px-6 py-14 text-center">
      <p className="font-heading text-xl">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

export function Spinner({ className }: { className?: string }) {
  return (
    <Loader2Icon
      aria-hidden
      className={cn("size-4 animate-spin text-muted-foreground", className)}
    />
  )
}

export function FullScreenLoader() {
  return (
    <div className="grid min-h-dvh place-items-center" role="status">
      <span className="sr-only">Loading Lumen</span>
      <span className="font-heading animate-pulse text-2xl text-muted-foreground">
        Lumen
      </span>
    </div>
  )
}

export function PageLoader() {
  return (
    <div className="grid flex-1 place-items-center py-24" role="status">
      <span className="sr-only">Loading</span>
      <Spinner className="size-5" />
    </div>
  )
}

export function ErrorNote({ error }: { error: unknown }) {
  return (
    <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
      {error instanceof Error ? error.message : "Something went wrong."}
    </div>
  )
}
