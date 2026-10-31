import { useState } from "react"
import {
  AtSignIcon,
  CheckIcon,
  CopyIcon,
  PencilIcon,
  SendHorizontalIcon,
} from "lucide-react"
import { toast } from "sonner"

import { useMember } from "@/auth/use-auth"
import { Spinner } from "@/components/page"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Textarea } from "@/components/ui/textarea"
import { copyText, uuid } from "@/lib/browser"
import { formatRelative } from "@/lib/format"
import { useSaveSection, useSendMessage } from "@/lib/queries"
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
  const member = useMember()
  const save = useSaveSection(paper)
  const send = useSendMessage(member.id)
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
      await copyText(`${mention} `)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
      toast.success("Tag copied")
    } catch {
      toast.error("Couldn't copy the tag")
    }
  }

  function sendToChat() {
    send.mutate(
      { body: mention, clientId: uuid() },
      {
        onSuccess: () => toast.success("Sent to chat"),
        onError: (error) => toast.error(error.message || "Couldn't send"),
      }
    )
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
            className="font-heading text-lg leading-tight"
          >
            {section.title}
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">{section.hint}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Share ${mention}`}
                  className="text-muted-foreground data-popup-open:bg-muted data-popup-open:text-foreground"
                />
              }
            >
              {copied ? <CheckIcon className="text-gold" /> : <AtSignIcon />}
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="end" className="w-44">
              <DropdownMenuItem onClick={() => void copyMention()}>
                <CopyIcon />
                Copy tag
              </DropdownMenuItem>
              <DropdownMenuItem onClick={sendToChat} disabled={send.isPending}>
                <SendHorizontalIcon />
                Send in chat
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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
              <Button
                size="sm"
                onClick={() => void commit()}
                disabled={save.isPending}
              >
                {save.isPending && (
                  <Spinner className="text-primary-foreground" />
                )}
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
          Edited by {editorName ?? "someone"} ·{" "}
          {formatRelative(value.updated_at)}
        </p>
      )}
    </section>
  )
}
