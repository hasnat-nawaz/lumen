import { useId, useMemo, useRef, useState } from "react"
import { AtSignIcon, SendHorizontalIcon } from "lucide-react"

import { MentionMenu } from "@/components/chat/mention-menu"
import { Button } from "@/components/ui/button"
import {
  activeMention,
  filterTargets,
  type MentionTarget,
} from "@/lib/mentions"

export function Composer({
  targets,
  onSend,
}: {
  targets: MentionTarget[]
  onSend: (body: string) => void
}) {
  const menuId = useId()
  const textarea = useRef<HTMLTextAreaElement>(null)
  const [value, setValue] = useState("")
  const [mention, setMention] = useState<{
    query: string
    start: number
  } | null>(null)
  const [dismissedAt, setDismissedAt] = useState<number | null>(null)
  const [activeIndex, setActiveIndex] = useState(0)

  const open = mention !== null && mention.start !== dismissedAt
  const items = useMemo(
    () => (open ? filterTargets(targets, mention.query) : []),
    [open, targets, mention]
  )
  const safeIndex = Math.min(activeIndex, Math.max(items.length - 1, 0))

  function syncMention(nextValue: string, caret: number) {
    const next = activeMention(nextValue, caret)
    setMention(next)
    if (!next || next.query !== mention?.query) setActiveIndex(0)
    if (!next) setDismissedAt(null)
  }

  function pick(target: MentionTarget) {
    const element = textarea.current
    if (!element || !mention) return
    const caret = element.selectionStart
    const insert = `@${target.path} `
    const nextValue =
      value.slice(0, mention.start) + insert + value.slice(caret)
    const nextCaret = mention.start + insert.length
    setValue(nextValue)
    setMention(null)
    requestAnimationFrame(() => {
      element.focus()
      element.setSelectionRange(nextCaret, nextCaret)
    })
  }

  function startTag() {
    const element = textarea.current
    if (!element) return
    const start = element.selectionStart
    const before = value.slice(0, start)
    const pad = before && !/\s$/.test(before) ? " " : ""
    const nextValue = before + pad + "@" + value.slice(element.selectionEnd)
    const nextCaret = start + pad.length + 1
    setValue(nextValue)
    setDismissedAt(null)
    syncMention(nextValue, nextCaret)
    requestAnimationFrame(() => {
      element.focus()
      element.setSelectionRange(nextCaret, nextCaret)
    })
  }

  function send() {
    const body = value.trim()
    if (!body) return
    onSend(body)
    setValue("")
    setMention(null)
    textarea.current?.focus()
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.nativeEvent.isComposing) return

    if (open && items.length > 0) {
      if (event.key === "ArrowDown") {
        event.preventDefault()
        setActiveIndex((safeIndex + 1) % items.length)
        return
      }
      if (event.key === "ArrowUp") {
        event.preventDefault()
        setActiveIndex((safeIndex - 1 + items.length) % items.length)
        return
      }
      if (event.key === "Enter" || event.key === "Tab") {
        event.preventDefault()
        pick(items[safeIndex])
        return
      }
    }
    if (open && event.key === "Escape") {
      event.preventDefault()
      setDismissedAt(mention.start)
      return
    }
    const touch = window.matchMedia("(pointer: coarse)").matches
    if (event.key === "Enter" && !event.shiftKey && !touch) {
      event.preventDefault()
      send()
    }
  }

  return (
    <div className="relative z-20 bg-card px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:px-0">
      <div className="relative sm:px-2">
        {open && (
          <MentionMenu
            id={menuId}
            items={items}
            activeIndex={safeIndex}
            onHover={setActiveIndex}
            onPick={pick}
          />
        )}
        <form
          className="flex items-end gap-2"
          onSubmit={(event) => {
            event.preventDefault()
            send()
          }}
        >
          <div className="flex min-w-0 flex-1 items-end rounded-3xl bg-bubble px-1">
            <Button
              type="button"
              variant="ghost"
              size="icon-lg"
              className="my-0.5 size-9 shrink-0 rounded-full text-muted-foreground hover:bg-transparent hover:text-gold"
              onMouseDown={(event) => event.preventDefault()}
              onClick={startTag}
              aria-label="Tag a domain, paper or section"
            >
              <AtSignIcon />
            </Button>
            <label htmlFor={`${menuId}-input`} className="sr-only">
              Message
            </label>
            <textarea
              id={`${menuId}-input`}
              ref={textarea}
              rows={1}
              value={value}
              maxLength={4000}
              placeholder="Message · type @ to tag"
              role="combobox"
              aria-expanded={open}
              aria-controls={open ? menuId : undefined}
              aria-activedescendant={
                open && items.length ? `${menuId}-${safeIndex}` : undefined
              }
              aria-autocomplete="list"
              onChange={(event) => {
                setValue(event.target.value)
                syncMention(event.target.value, event.target.selectionStart)
              }}
              onSelect={(event) =>
                syncMention(
                  event.currentTarget.value,
                  event.currentTarget.selectionStart
                )
              }
              onKeyDown={onKeyDown}
              onBlur={() => setMention(null)}
              className="field-sizing-content max-h-36 min-h-10 flex-1 resize-none bg-transparent py-2.5 pr-3 text-[15px] leading-snug outline-none placeholder:text-muted-foreground"
            />
          </div>
          <Button
            type="submit"
            size="icon-lg"
            className="size-10 shrink-0 rounded-full transition-transform active:scale-95"
            onMouseDown={(event) => event.preventDefault()}
            disabled={!value.trim()}
            aria-label="Send"
          >
            <SendHorizontalIcon />
          </Button>
        </form>
      </div>
    </div>
  )
}
