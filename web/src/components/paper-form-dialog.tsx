import { useRef, useState } from "react"
import { FileUpIcon, XIcon } from "lucide-react"

import { Spinner } from "@/components/page"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { PaperInput } from "@/lib/queries"

const MAX_PDF_BYTES = 50 * 1024 * 1024

type Initial = {
  title: string
  authors: string
  year: number | null
  externalUrl: string | null
  hasPdf: boolean
}

const EMPTY: Initial = {
  title: "",
  authors: "",
  year: null,
  externalUrl: null,
  hasPdf: false,
}

function normalizeUrl(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return null
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
  try {
    return new URL(withScheme).toString()
  } catch {
    return undefined
  }
}

export function PaperFormDialog({
  mode,
  trigger,
  initial = EMPTY,
  onSubmit,
}: {
  mode: "create" | "edit"
  trigger: React.ReactElement
  initial?: Initial
  onSubmit: (input: PaperInput) => Promise<unknown>
}) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [title, setTitle] = useState(initial.title)
  const [authors, setAuthors] = useState(initial.authors)
  const [year, setYear] = useState(initial.year?.toString() ?? "")
  const [url, setUrl] = useState(initial.externalUrl ?? "")
  const [file, setFile] = useState<File | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  function reset() {
    setTitle(initial.title)
    setAuthors(initial.authors)
    setYear(initial.year?.toString() ?? "")
    setUrl(initial.externalUrl ?? "")
    setFile(null)
    setError(null)
  }

  function pickFile(next: File | undefined) {
    setError(null)
    if (!next) return
    if (next.type !== "application/pdf" && !next.name.toLowerCase().endsWith(".pdf")) {
      setError("Only PDF files can be uploaded.")
      return
    }
    if (next.size > MAX_PDF_BYTES) {
      setError("PDFs must be 50 MB or smaller.")
      return
    }
    setFile(next)
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    const externalUrl = normalizeUrl(url)
    if (externalUrl === undefined) {
      setError("That link doesn't look like a valid URL.")
      return
    }
    const parsedYear = year.trim() ? Number(year) : null
    if (parsedYear !== null && (!Number.isInteger(parsedYear) || parsedYear < 1900 || parsedYear > 2100)) {
      setError("Year should be between 1900 and 2100.")
      return
    }

    setBusy(true)
    setError(null)
    try {
      await onSubmit({
        title: title.trim(),
        authors: authors.trim(),
        year: parsedYear,
        externalUrl,
        file,
      })
      setOpen(false)
      if (mode === "create") reset()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Saving failed.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (busy) return
        setOpen(next)
        if (!next) reset()
      }}
    >
      <DialogTrigger render={trigger} />
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={submit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle className="text-xl">
              {mode === "create" ? "Add a paper" : "Edit paper details"}
            </DialogTitle>
            <DialogDescription>
              Upload the PDF, paste a link to it, or both.
            </DialogDescription>
          </DialogHeader>

          {mode === "create" && (
            <div className="grid gap-2">
              <Label htmlFor="paper-title">Title</Label>
              <Input
                id="paper-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Attention Is All You Need"
                maxLength={200}
                required
                autoFocus
              />
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-[1fr_7rem]">
            <div className="grid gap-2">
              <Label htmlFor="paper-authors">Authors</Label>
              <Input
                id="paper-authors"
                value={authors}
                onChange={(event) => setAuthors(event.target.value)}
                placeholder="Vaswani et al."
                maxLength={300}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="paper-year">Year</Label>
              <Input
                id="paper-year"
                value={year}
                onChange={(event) => setYear(event.target.value.replace(/\D/g, "").slice(0, 4))}
                placeholder="2017"
                inputMode="numeric"
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="paper-url">External link</Label>
            <Input
              id="paper-url"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="arxiv.org/abs/1706.03762"
              inputMode="url"
            />
          </div>

          <div className="grid gap-2">
            <Label>PDF file</Label>
            <input
              ref={fileInput}
              type="file"
              accept="application/pdf,.pdf"
              className="sr-only"
              tabIndex={-1}
              onChange={(event) => {
                pickFile(event.target.files?.[0])
                event.target.value = ""
              }}
            />
            {file ? (
              <div className="flex items-center gap-2 rounded-lg border bg-input/20 px-3 py-2 text-sm">
                <FileUpIcon className="size-4 shrink-0 text-gold" />
                <span className="min-w-0 flex-1 truncate">{file.name}</span>
                <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                  {(file.size / 1024 / 1024).toFixed(1)} MB
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  aria-label="Remove file"
                  onClick={() => setFile(null)}
                >
                  <XIcon />
                </Button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInput.current?.click()}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault()
                  pickFile(event.dataTransfer.files[0])
                }}
                className="flex flex-col items-center gap-1 rounded-lg border border-dashed px-4 py-5 text-sm text-muted-foreground transition-colors hover:border-gold/40 hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none"
              >
                <FileUpIcon className="size-5" />
                {initial.hasPdf ? "Replace the current PDF" : "Choose or drop a PDF"}
                <span className="text-xs">Up to 50 MB</span>
              </button>
            )}
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button type="submit" disabled={busy || (mode === "create" && !title.trim())}>
              {busy && <Spinner className="text-primary-foreground" />}
              {busy && file ? "Uploading…" : mode === "create" ? "Add paper" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
