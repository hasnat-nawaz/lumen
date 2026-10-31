import { useCallback, useMemo } from "react"

import { useMember } from "@/auth/use-auth"
import { Composer } from "@/components/chat/composer"
import { MessageList } from "@/components/chat/message-list"
import { ErrorNote, PageLoader } from "@/components/page"
import { buildTargets } from "@/lib/mentions"
import {
  useMembers,
  useMentionTargets,
  useMessages,
  useSendMessage,
} from "@/lib/queries"
import type { Message } from "@/lib/types"

export function ChatPage() {
  const member = useMember()
  const members = useMembers()
  const targetsQuery = useMentionTargets()
  const messagesQuery = useMessages()
  const send = useSendMessage(member.id)
  const { fetchNextPage, hasNextPage, isFetchingNextPage } = messagesQuery

  const targets = useMemo(() => buildTargets(targetsQuery.data), [targetsQuery.data])
  const byPath = useMemo(
    () => new Map(targets.map((target) => [target.path, target])),
    [targets]
  )
  const names = useMemo(
    () => new Map((members.data ?? []).map((m) => [m.id, m.name])),
    [members.data]
  )
  const colorOrder = useMemo(
    () => (members.data ?? []).filter((m) => m.id !== member.id).map((m) => m.id),
    [members.data, member.id]
  )
  const messages = useMemo(
    () => (messagesQuery.data?.pages.flat() ?? []).slice().reverse(),
    [messagesQuery.data]
  )

  const loadOlder = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) void fetchNextPage()
  }, [fetchNextPage, hasNextPage, isFetchingNextPage])

  const sendBody = (body: string) =>
    send.mutate({ body, clientId: crypto.randomUUID() })
  const retry = (message: Message) =>
    send.mutate({ body: message.body, clientId: message.client_id })

  return (
    <div className="mx-auto flex h-[calc(100dvh-3.5rem-1px)] w-full max-w-3xl flex-col sm:border-x">
      <div className="flex items-baseline justify-between border-b px-4 py-2.5">
        <h1 className="font-heading text-2xl leading-none">Group chat</h1>
        <p className="text-xs text-muted-foreground">
          {members.data?.map((m) => m.name).join(", ")}
        </p>
      </div>

      {messagesQuery.isPending ? (
        <PageLoader />
      ) : messagesQuery.error ? (
        <div className="p-4">
          <ErrorNote error={messagesQuery.error} />
        </div>
      ) : messages.length === 0 ? (
        <div className="grid flex-1 place-items-center px-6 text-center">
          <div>
            <p className="font-heading text-3xl">Say hello</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Messages here are kept forever. Type @ to tag a domain, paper or section.
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
    </div>
  )
}
