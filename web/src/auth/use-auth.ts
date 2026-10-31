import { useContext } from "react"

import { AuthContext } from "@/auth/auth-context"

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error("useAuth must be used inside AuthProvider")
  return context
}

export function useMember() {
  const auth = useAuth()
  if (auth.status !== "signed-in") {
    throw new Error("useMember needs a signed-in member")
  }
  return auth.member
}
