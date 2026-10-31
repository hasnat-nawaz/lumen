import { lazy, Suspense } from "react"
import { createBrowserRouter, Navigate, useLocation } from "react-router-dom"

import { useAuth } from "@/auth/use-auth"
import { AppShell } from "@/components/app-shell"
import { FullScreenLoader } from "@/components/page"
import { LoginPage } from "@/pages/login-page"

const DomainsPage = lazy(() =>
  import("@/pages/domains-page").then((m) => ({ default: m.DomainsPage }))
)
const DomainPage = lazy(() =>
  import("@/pages/domain-page").then((m) => ({ default: m.DomainPage }))
)
const PaperPage = lazy(() =>
  import("@/pages/paper-page").then((m) => ({ default: m.PaperPage }))
)
const ChatPage = lazy(() =>
  import("@/pages/chat-page").then((m) => ({ default: m.ChatPage }))
)
const NotFoundPage = lazy(() =>
  import("@/pages/not-found-page").then((m) => ({ default: m.NotFoundPage }))
)

function RequireMember() {
  const auth = useAuth()
  const location = useLocation()

  if (auth.status === "loading") return <FullScreenLoader />
  if (auth.status === "signed-out") {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname + location.search }}
      />
    )
  }
  return <AppShell />
}

function PublicLogin() {
  const auth = useAuth()
  if (auth.status === "loading") return <FullScreenLoader />
  return <LoginPage />
}

export const router = createBrowserRouter([
  { path: "/login", element: <PublicLogin /> },
  {
    path: "/",
    element: <RequireMember />,
    children: [
      { index: true, element: <DomainsPage /> },
      { path: "chat", element: <ChatPage /> },
      { path: "d/:domainSlug", element: <DomainPage /> },
      { path: "d/:domainSlug/:paperSlug", element: <PaperPage /> },
      { path: "d/:domainSlug/:paperSlug/:sectionKey", element: <PaperPage /> },
      {
        path: "*",
        element: (
          <Suspense>
            <NotFoundPage />
          </Suspense>
        ),
      },
    ],
  },
])

export function preloadPages() {
  void import("@/pages/domains-page")
  void import("@/pages/domain-page")
  void import("@/pages/paper-page")
  void import("@/pages/chat-page")
}
