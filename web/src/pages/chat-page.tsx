import { useCallback, useMemo } from "react"
import { MessagesSquareIcon } from "lucide-react"

import { useMember } from "@/auth/use-auth"
import { Composer } from "@/components/chat/composer"
import { MessageList } from "@/components/chat/message-list"
import { ErrorNote, PageLoader } from "@/components/page"
import { uuid } from "@/lib/browser"
import { buildTargets } from "@/lib/mentions"
import {
  useMembers,
  useMentionTargets,
  useMessages,
  useSendMessage,
} from "@/lib/queries"
import type { Message } from "@/lib/types"
import { useViewportHeight } from "@/lib/use-viewport-height"

export function ChatPage() {
  const member = useMember()
  const members = useMembers()
  const viewportHeight = useViewportHeight()
  const targetsQuery = useMentionTargets()
  const messagesQuery = useMessages()
  const send = useSendMessage(member.id)
  const { fetchNextPage, hasNextPage, isFetchingNextPage } = messagesQuery

  const targets = useMemo(
    () => buildTargets(targetsQuery.data),
    [targetsQuery.data]
  )
  const byPath = useMemo(
    () => new Map(targets.map((target) => [target.path, target])),
    [targets]
  )
  const names = useMemo(
    () => new Map((members.data ?? []).map((m) => [m.id, m.name])),
    [members.data]
  )
  const colorOrder = useMemo(
    () =>
      (members.data ?? []).filter((m) => m.id !== member.id).map((m) => m.id),
    [members.data, member.id]
  )
  const messages = useMemo(
    () => (messagesQuery.data?.pages.flat() ?? []).slice().reverse(),
    [messagesQuery.data]
  )

  const loadOlder = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) void fetchNextPage()
  }, [fetchNextPage, hasNextPage, isFetchingNextPage])

  const sendBody = (body: string) => send.mutate({ body, clientId: uuid() })
  const retry = (message: Message) =>
    send.mutate({ body: message.body, clientId: message.client_id })

  return (
    <div className="flex flex-1 justify-center">
      <section
        className="flex w-full max-w-3xl flex-col overflow-hidden sm:border-x"
        style={{ height: `calc(${viewportHeight}px - 3.5rem - 1px)` }}
      >
        <h1 className="sr-only">Group chat</h1>

        {messagesQuery.isPending ? (
          <div className="flex flex-1 flex-col lumen-wallpaper">
            <PageLoader />
          </div>
        ) : messagesQuery.error ? (
          <div className="flex-1 lumen-wallpaper p-4">
            <ErrorNote error={messagesQuery.error} />
          </div>
        ) : messages.length === 0 ? (
          <div className="grid flex-1 place-items-center lumen-wallpaper px-6 text-center">
            <div className="flex flex-col items-center">
              <span className="grid size-14 place-items-center rounded-full bg-bubble text-gold">
                <MessagesSquareIcon className="size-6" />
              </span>
              <p className="mt-4 font-heading text-xl">Say hello</p>
              <p className="mt-1 max-w-xs text-sm text-muted-foreground">
                Messages here are kept forever. Type @ to tag a domain, paper or
                section.
              </p>
            </div>
          </div>
        ) : (
          <MessageList
            messages={messages}
            memberId={member.id}
            names={names}
            colorOrder={colorOrder}
            byPath={byPath}
            hasOlder={Boolean(hasNextPage)}
            loadingOlder={isFetchingNextPage}
            onLoadOlder={loadOlder}
            onRetry={retry}
          />
        )}

        <Composer targets={targets} onSend={sendBody} />
      </section>
    </div>
  )
}
