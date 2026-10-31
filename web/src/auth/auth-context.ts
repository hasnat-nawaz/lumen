import { createContext } from "react"

import type { Member } from "@/lib/types"

export type AuthState =
  | { status: "loading"; member: null }
  | { status: "signed-out"; member: null }
  | { status: "signed-in"; member: Member }

export type AuthContextValue = AuthState & {
  signInWithPin: (pin: string) => Promise<void>
  signOut: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)
