import { useState } from "react"
import { AtSignIcon, CheckIcon, PencilIcon } from "lucide-react"
import { toast } from "sonner"

import { Spinner } from "@/components/page"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { formatRelative } from "@/lib/format"
import { useSaveSection } from "@/lib/queries"
import type { SECTIONS } from "@/lib/sections"
import type { PaperDetail, PaperSection } from "@/lib/types"

type SectionDef = (typeof SECTIONS)[number]

export function SectionBlock({
  paper,
  section,
  value,
  editorName,
}: {
  paper: PaperDetail
  section: SectionDef
  value?: PaperSection
  editorName?: string
}) {
  const save = useSaveSection(paper)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState("")
  const [copied, setCopied] = useState(false)
  const body = value?.body ?? ""
  const mention = `@${paper.domain.slug}/${paper.slug}/${section.key}`

  function startEditing() {
    setDraft(body)
    setEditing(true)
  }

  async function commit() {
    if (draft === body) {
      setEditing(false)
      return
    }
    try {
      await save.mutateAsync({ key: section.key, body: draft.trim() })
      setEditing(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save")
    }
  }

  async function copyMention() {
    try {
      await navigator.clipboard.writeText(`${mention} `)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      toast.error("Copy failed")
    }
  }

  return (
    <section
      id={`section-${section.key}`}
      aria-labelledby={`section-title-${section.key}`}
      className="scroll-mt-24 rounded-xl border bg-card px-5 py-5 sm:px-6"
    >
      <header className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h2
            id={`section-title-${section.key}`}
            className="font-heading text-2xl leading-tight"
          >
            {section.title}
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">{section.hint}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Copy ${mention}`}
                  onClick={copyMention}
                  className="text-muted-foreground"
                />
              }
            >
              {copied ? <CheckIcon className="text-gold" /> : <AtSignIcon />}
            </TooltipTrigger>
            <TooltipContent>Copy chat tag</TooltipContent>
          </Tooltip>
          {!editing && (
            <Button variant="ghost" size="sm" onClick={startEditing}>
              <PencilIcon />
              Edit
            </Button>
          )}
        </div>
      </header>

      <div className="mt-4">
        {editing ? (
          <div className="grid gap-3">
            <Textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                  event.preventDefault()
                  void commit()
                }
                if (event.key === "Escape") setEditing(false)
              }}
              placeholder={section.hint}
              className="max-h-[70vh] min-h-40 text-[15px] leading-relaxed md:text-[15px]"
              autoFocus
              disabled={save.isPending}
            />
            <div className="flex items-center justify-end gap-2">
              <span className="mr-auto hidden text-xs text-muted-foreground sm:inline">
                Ctrl + Enter to save
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setEditing(false)}
                disabled={save.isPending}
              >
                Cancel
              </Button>
              <Button size="sm" onClick={() => void commit()} disabled={save.isPending}>
                {save.isPending && <Spinner className="text-primary-foreground" />}
                Save
              </Button>
            </div>
          </div>
        ) : body ? (
          <div className="text-[15px] leading-relaxed break-words whitespace-pre-wrap text-foreground/90">
            {body}
          </div>
        ) : (
          <button
            type="button"
            onClick={startEditing}
            className="w-full rounded-lg border border-dashed px-4 py-6 text-left text-sm text-muted-foreground transition-colors hover:border-gold/40 hover:text-foreground"
          >
            Nothing here yet. Click to write the {section.title.toLowerCase()}.
          </button>
        )}
      </div>

      {value && body && !editing && (
        <p className="mt-4 text-xs text-muted-foreground">
          Edited by {editorName ?? "someone"} · {formatRelative(value.updated_at)}
        </p>
      )}
    </section>
  )
}
