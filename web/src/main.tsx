import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { RouterProvider } from "react-router-dom"

import "./index.css"
import { AuthProvider } from "@/auth/auth-provider"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { isSupabaseConfigured } from "@/lib/supabase"
import { SetupPage } from "@/pages/setup-page"
import { preloadPages, router } from "@/router"

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 30 * 60_000,
      retry: 1,
    },
  },
})

const root = createRoot(document.getElementById("root")!)

if (!isSupabaseConfigured) {
  root.render(
    <StrictMode>
      <SetupPage />
    </StrictMode>
  )
} else {
  root.render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <TooltipProvider delay={300}>
            <RouterProvider router={router} />
            <Toaster position="bottom-center" />
          </TooltipProvider>
        </AuthProvider>
      </QueryClientProvider>
    </StrictMode>
  )
  if ("requestIdleCallback" in window) {
    window.requestIdleCallback(preloadPages)
  } else {
    setTimeout(preloadPages, 1500)
  }
}
