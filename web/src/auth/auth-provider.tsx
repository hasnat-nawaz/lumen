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
    const { data: email, error } = await supabase.rpc("email_for_pin", { pin })
    if (error) throw new Error("Lumen could not reach the server. Try again.")
    if (!email) throw new Error("That PIN doesn't match anyone.")

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email as string,
      password: pin,
    })
    if (signInError) throw new Error("Sign in failed. Try again.")
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
