import { Fragment, useEffect, useLayoutEffect, useRef } from "react"
import { ClockIcon, RotateCcwIcon } from "lucide-react"

import { Avatar, NAME_TONES, toneIndex } from "@/components/chat/avatar"
import { MessageBody } from "@/components/chat/message-body"
import { Spinner } from "@/components/page"
import { dayKey, formatDay, formatTime } from "@/lib/format"
import type { MentionTarget } from "@/lib/mentions"
import type { Message } from "@/lib/types"
import { cn } from "@/lib/utils"

const GROUP_WINDOW_MS = 5 * 60_000

export function MessageList({
  messages,
  memberId,
  names,
  colorOrder,
  byPath,
  hasOlder,
  loadingOlder,
  onLoadOlder,
  onRetry,
}: {
  messages: Message[]
  memberId: string
  names: Map<string, string>
  colorOrder: string[]
  byPath: Map<string, MentionTarget>
  hasOlder: boolean
  loadingOlder: boolean
  onLoadOlder: () => void
  onRetry: (message: Message) => void
}) {
  const scroller = useRef<HTMLDivElement>(null)
  const sentinel = useRef<HTMLDivElement>(null)
  const fromBottom = useRef(0)
  const edges = useRef<{ first?: string; last?: string }>({})

  useLayoutEffect(() => {
    const element = scroller.current
    if (!element) return
    const first = messages[0]?.client_id
    const last = messages.at(-1)?.client_id
    const previous = edges.current
    edges.current = { first, last }

    if (previous.last === undefined) {
      element.scrollTop = element.scrollHeight
    } else if (last !== previous.last) {
      const mine = messages.at(-1)?.author_id === memberId
      if (mine || fromBottom.current - element.clientHeight < 160) {
        element.scrollTop = element.scrollHeight
      }
    } else if (first !== previous.first) {
      element.scrollTop = element.scrollHeight - fromBottom.current
    }
    fromBottom.current = element.scrollHeight - element.scrollTop
  }, [messages, memberId])

  useEffect(() => {
    const element = scroller.current
    if (!element) return
    let height = element.clientHeight
    const observer = new ResizeObserver(() => {
      const nearBottom = fromBottom.current - height < 160
      height = element.clientHeight
      if (nearBottom) element.scrollTop = element.scrollHeight
      fromBottom.current = element.scrollHeight - element.scrollTop
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const element = sentinel.current
    const root = scroller.current
    if (!element || !root || !hasOlder) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !loadingOlder) onLoadOlder()
      },
      { root, rootMargin: "200px 0px 0px 0px" }
    )
    observer.observe(element)
    return () => observer.disconnect()
  }, [hasOlder, loadingOlder, onLoadOlder])

  return (
    <div
      ref={scroller}
      onScroll={(event) => {
        const element = event.currentTarget
        fromBottom.current = element.scrollHeight - element.scrollTop
      }}
      className="flex-1 overflow-y-auto overscroll-contain lumen-wallpaper"
      role="log"
      aria-live="polite"
      aria-label="Group chat"
    >
      <div className="px-3 pt-2 pb-4 sm:px-4">
        <div ref={sentinel} className="flex h-8 items-center justify-center">
          {loadingOlder && <Spinner />}
          {!hasOlder && messages.length > 0 && (
            <span className="text-xs text-muted-foreground">
              Start of the conversation
            </span>
          )}
        </div>

        {messages.map((message, index) => {
          const previous = messages[index - 1]
          const newDay =
            !previous ||
            dayKey(previous.created_at) !== dayKey(message.created_at)
          const grouped =
            !newDay &&
            previous.author_id === message.author_id &&
            new Date(message.created_at).getTime() -
              new Date(previous.created_at).getTime() <
              GROUP_WINDOW_MS
          const own = message.author_id === memberId
          const tone = toneIndex(message.author_id, colorOrder)
          const name = names.get(message.author_id) ?? "Someone"

          return (
            <Fragment key={message.client_id}>
              {newDay && (
                <div className="sticky top-0 z-10 my-4 flex justify-center">
                  <span className="rounded-lg bg-bubble px-3 py-1 text-[11.5px] font-medium text-muted-foreground shadow-sm shadow-black/30">
                    {formatDay(message.created_at)}
                  </span>
                </div>
              )}
              <div
                className={cn(
                  "flex items-start gap-2",
                  own ? "justify-end" : "justify-start",
                  grouped ? "mt-0.5" : "mt-3"
                )}
              >
                {!own &&
                  (grouped ? (
                    <span aria-hidden className="w-7 shrink-0" />
                  ) : (
                    <Avatar name={name} tone={tone} className="mt-0.5" />
                  ))}
                <div
                  className={cn(
                    "max-w-[82%] rounded-lg px-2.5 py-1.5 text-[14.5px] leading-snug shadow-sm shadow-black/30 sm:max-w-[65%]",
                    own ? "bg-bubble-own" : "bg-bubble",
                    !grouped && (own ? "rounded-tr-none" : "rounded-tl-none"),
                    message.pending && "opacity-70",
                    message.failed && "ring-1 ring-destructive/60"
                  )}
                >
                  {!own && !grouped && (
                    <p
                      className={cn(
                        "mb-0.5 text-xs font-semibold",
                        NAME_TONES[tone]
                      )}
                    >
                      {name}
                    </p>
                  )}
                  <p className="break-words whitespace-pre-wrap">
                    <MessageBody body={message.body} byPath={byPath} />
                    <span className="float-right mt-1.5 ml-2.5 inline-flex translate-y-0.5 items-center gap-1 text-[10.5px] leading-none text-muted-foreground select-none">
                      {message.pending && (
                        <ClockIcon className="size-3" aria-label="Sending" />
                      )}
                      {formatTime(message.created_at)}
                    </span>
                  </p>
                  {message.failed && (
                    <button
                      type="button"
                      onClick={() => onRetry(message)}
                      className="mt-1 inline-flex items-center gap-1 text-xs text-destructive hover:underline"
                    >
                      <RotateCcwIcon className="size-3" />
                      Not sent. Tap to retry
                    </button>
                  )}
                </div>
              </div>
            </Fragment>
          )
        })}
      </div>
    </div>
  )
}
