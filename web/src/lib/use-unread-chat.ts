import { useCallback, useEffect, useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"

import { supabase } from "@/lib/supabase"
import type { Message } from "@/lib/types"

type Latest = { id: number; author_id: string } | null

const latestKey = ["latest-message"] as const
const storageKey = (memberId: string) => `lumen:last-seen-message:${memberId}`

function readLastSeen(memberId: string) {
  const raw = localStorage.getItem(storageKey(memberId))
  const value = raw ? Number(raw) : 0
  return Number.isFinite(value) ? value : 0
}

export function useUnreadChat(memberId: string, onChat: boolean) {
  const queryClient = useQueryClient()
  const [lastSeen, setLastSeen] = useState(() => readLastSeen(memberId))

  const { data: latest } = useQuery({
    queryKey: latestKey,
    staleTime: Infinity,
    queryFn: async (): Promise<Latest> => {
      const { data, error } = await supabase
        .from("messages")
        .select("id, author_id")
        .order("id", { ascending: false })
        .limit(1)
        .maybeSingle()
      if (error) throw new Error(error.message)
      return data
    },
  })

  const noteIncoming = useCallback(
    (message: Message) => {
      queryClient.setQueryData<Latest>(latestKey, (current) =>
        !current || message.id > current.id
          ? { id: message.id, author_id: message.author_id }
          : current
      )
    },
    [queryClient]
  )

  const latestId = latest?.id ?? 0

  useEffect(() => {
    if (!onChat || latestId <= lastSeen) return
    localStorage.setItem(storageKey(memberId), String(latestId))
    const frame = requestAnimationFrame(() => setLastSeen(latestId))
    return () => cancelAnimationFrame(frame)
  }, [onChat, latestId, lastSeen, memberId])

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === storageKey(memberId)) setLastSeen(readLastSeen(memberId))
    }
    window.addEventListener("storage", onStorage)
    return () => window.removeEventListener("storage", onStorage)
  }, [memberId])

  const unread =
    !onChat && !!latest && latest.id > lastSeen && latest.author_id !== memberId

  return { unread, noteIncoming }
}
