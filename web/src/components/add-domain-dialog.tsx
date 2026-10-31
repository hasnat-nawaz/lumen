import { useState } from "react"
import { PlusIcon } from "lucide-react"
import { toast } from "sonner"

import { useMember } from "@/auth/use-auth"
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
import { Textarea } from "@/components/ui/textarea"
import { useCreateDomain } from "@/lib/queries"

export function AddDomainDialog({ variant = "default" }: { variant?: "default" | "outline" }) {
  const member = useMember()
  const createDomain = useCreateDomain()
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")

  function reset() {
    setTitle("")
    setDescription("")
    createDomain.reset()
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    const cleanTitle = title.trim()
    if (!cleanTitle) return
    try {
      await createDomain.mutateAsync({
        title: cleanTitle,
        description: description.trim(),
        memberId: member.id,
      })
    } catch {
      return
    }
    toast.success(`Added ${cleanTitle}`)
    setOpen(false)
    reset()
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (createDomain.isPending) return
        setOpen(next)
        if (!next) reset()
      }}
    >
      <DialogTrigger render={<Button variant={variant} />}>
        <PlusIcon />
        Add domain
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={submit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle className="text-xl">New domain</DialogTitle>
            <DialogDescription>
              A lane we might take the FYP down.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="domain-title">Name</Label>
            <Input
              id="domain-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Computer Vision"
              maxLength={80}
              required
              autoFocus
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="domain-description">Short description</Label>
            <Textarea
              id="domain-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="What this lane is about, in a line or two."
              maxLength={280}
              className="min-h-20"
            />
          </div>
          {createDomain.error && (
            <p className="text-sm text-destructive">{createDomain.error.message}</p>
          )}
          <DialogFooter>
            <Button type="submit" disabled={!title.trim() || createDomain.isPending}>
              {createDomain.isPending && <Spinner className="text-primary-foreground" />}
              Add domain
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
