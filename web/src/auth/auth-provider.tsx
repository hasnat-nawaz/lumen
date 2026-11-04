import { useCallback, useEffect, useMemo, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"

import { AuthContext, type AuthState } from "@/auth/auth-context"
import { supabase } from "@/lib/supabase"
import type { Member } from "@/lib/types"

async function loadMember(userId: string) {
  const { data, error } = await supabase
    .from("members")
    .select("id, name, role")
    .eq("id", userId)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return data as Member | null
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient()
  const [userId, setUserId] = useState<string | null | undefined>(undefined)
  const [loaded, setLoaded] = useState<{
    userId: string
    member: Member | null
  } | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUserId(data.session?.user.id ?? null)
    })
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user.id ?? null)
    })
    return () => data.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!userId) return

    let cancelled = false
    loadMember(userId)
      .then(async (member) => {
        if (cancelled) return
        setLoaded({ userId, member })
        if (!member) await supabase.auth.signOut()
      })
      .catch(() => {
        if (!cancelled) setLoaded({ userId, member: null })
      })
    return () => {
      cancelled = true
    }
  }, [userId])

  const state: AuthState = useMemo(() => {
    if (userId === undefined) return { status: "loading", member: null }
    if (userId === null) return { status: "signed-out", member: null }
    if (loaded?.userId !== userId) return { status: "loading", member: null }
    return loaded.member
      ? { status: "signed-in", member: loaded.member }
      : { status: "signed-out", member: null }
  }, [userId, loaded])

  const signInWithPin = useCallback(async (pin: string) => {
    // Each person's PIN is their Auth password. Try the fixed team emails.
    const teamEmails = [
      "hasnat@lumen.com",
      "fatima@lumen.com",
      "atta@lumen.com",
      "labiba@lumen.com",
    ]

    let lastAuthError: string | null = null
    for (const email of teamEmails) {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password: pin,
      })
      if (!error) return

      const message = error.message || "Unknown auth error"
      lastAuthError = message
      const lower = message.toLowerCase()
      // Wrong PIN for this email — try the next person.
      if (
        lower.includes("invalid login") ||
        lower.includes("invalid credentials") ||
        lower.includes("invalid email or password") ||
        error.status === 400
      ) {
        continue
      }
      // Real failure (network, disabled provider, unconfirmed, bad API key, …)
      throw new Error(message)
    }

    throw new Error(
      lastAuthError
        ? `That PIN doesn't match anyone. (${lastAuthError})`
        : "That PIN doesn't match anyone."
    )
  }, [])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    queryClient.clear()
  }, [queryClient])

  const value = useMemo(
    () => ({ ...state, signInWithPin, signOut }),
    [state, signInWithPin, signOut]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
