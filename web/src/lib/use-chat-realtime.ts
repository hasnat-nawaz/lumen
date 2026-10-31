import { useEffect, useRef } from "react"
import { useQueryClient } from "@tanstack/react-query"

import { keys, upsertMessage } from "@/lib/queries"
import { supabase } from "@/lib/supabase"
import type { Message } from "@/lib/types"

export function useChatRealtime(onIncoming: (message: Message) => void) {
  const queryClient = useQueryClient()
  const onIncomingRef = useRef(onIncoming)

  useEffect(() => {
    onIncomingRef.current = onIncoming
  })

  useEffect(() => {
    let subscribedOnce = false
    const channel = supabase
      .channel("lumen-chat")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const message = payload.new as Message
          upsertMessage(queryClient, message)
          onIncomingRef.current(message)
        }
      )
      .subscribe((status) => {
        if (status !== "SUBSCRIBED") return
        if (subscribedOnce) {
          queryClient.invalidateQueries({ queryKey: keys.messages })
        }
        subscribedOnce = true
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [queryClient])
}
