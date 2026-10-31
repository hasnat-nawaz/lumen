import { Suspense, useCallback, useState } from "react"
import {
  Link,
  NavLink,
  Outlet,
  ScrollRestoration,
  useLocation,
} from "react-router-dom"
import { LibraryIcon, LogOutIcon, MessagesSquareIcon } from "lucide-react"

import { useAuth, useMember } from "@/auth/use-auth"
import { PageLoader } from "@/components/page"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { Message } from "@/lib/types"
import { useChatRealtime } from "@/lib/use-chat-realtime"
import { cn } from "@/lib/utils"

function NavItem({
  to,
  icon: Icon,
  label,
  dot,
}: {
  to: string
  icon: typeof LibraryIcon
  label: string
  dot?: boolean
}) {
  return (
    <NavLink
      to={to}
      end={to === "/"}
      className={({ isActive }) =>
        cn(
          "relative inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-sm text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground",
          isActive && "bg-muted text-foreground"
        )
      }
    >
      <Icon className="size-4" />
      <span>{label}</span>
      {dot && (
        <span className="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-gold">
          <span className="sr-only">New messages</span>
        </span>
      )}
    </NavLink>
  )
}

export function AppShell() {
  const member = useMember()
  const { signOut } = useAuth()
  const location = useLocation()
  const onChat = location.pathname === "/chat"
  const [unread, setUnread] = useState(false)

  const onIncoming = useCallback(
    (message: Message) => {
      if (message.author_id !== member.id && !onChat) setUnread(true)
    },
    [member.id, onChat]
  )
  useChatRealtime(onIncoming)

  const showDot = unread && !onChat
  if (unread && onChat) setUnread(false)

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-2 px-4 sm:px-6">
          <Link
            to="/"
            className="mr-2 font-heading text-[1.7rem] leading-none tracking-tight sm:mr-4"
          >
            Lumen
          </Link>
          <nav className="flex items-center gap-1" aria-label="Main">
            <NavItem to="/" icon={LibraryIcon} label="Library" />
            <NavItem
              to="/chat"
              icon={MessagesSquareIcon}
              label="Chat"
              dot={showDot}
            />
          </nav>
          <div className="ml-auto">
            <DropdownMenu>
              <DropdownMenuTrigger
                render={<Button variant="ghost" className="gap-2 pr-2 pl-1.5" />}
              >
                <span className="grid size-6 place-items-center rounded-full bg-gold/15 text-xs font-medium text-gold">
                  {member.name[0]}
                </span>
                <span className="hidden sm:inline">{member.name}</span>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="flex items-center justify-between">
                    {member.name}
                    <Badge variant="outline" className="capitalize">
                      {member.role}
                    </Badge>
                  </DropdownMenuLabel>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => void signOut()}>
                  <LogOutIcon />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>
      <main className="flex flex-1 flex-col">
        <Suspense fallback={<PageLoader />}>
          <Outlet />
        </Suspense>
      </main>
      <ScrollRestoration
        getKey={(location) =>
          location.pathname.split("/").slice(0, 4).join("/")
        }
      />
    </div>
  )
}
