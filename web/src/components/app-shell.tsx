import { Suspense } from "react"
import {
  Link,
  NavLink,
  Outlet,
  ScrollRestoration,
  useLocation,
} from "react-router-dom"
import { FolderIcon, LogOutIcon, MessagesSquareIcon } from "lucide-react"

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
import { useChatRealtime } from "@/lib/use-chat-realtime"
import { useUnreadChat } from "@/lib/use-unread-chat"
import { cn } from "@/lib/utils"

function NavItem({
  to,
  icon: Icon,
  label,
  dot,
  active,
}: {
  to: string
  icon: typeof FolderIcon
  label: string
  dot?: boolean
  active?: boolean
}) {
  return (
    <NavLink
      to={to}
      end={to === "/"}
      className={({ isActive }) =>
        cn(
          "relative inline-flex h-8 items-center gap-2 rounded-lg px-2.5 text-sm text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground",
          (active ?? isActive) && "bg-muted text-foreground"
        )
      }
    >
      <Icon className="size-4" />
      <span>{label}</span>
      {dot && (
        <span className="absolute top-1 right-1 size-2 rounded-full bg-gold ring-2 ring-background">
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
  const { unread: showDot, noteIncoming } = useUnreadChat(member.id, onChat)
  useChatRealtime(noteIncoming)

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur-md">
        <div className="mx-auto grid h-14 w-full max-w-6xl grid-cols-[1fr_auto_1fr] items-center gap-2 px-4 sm:px-6">
          <Link
            to="/"
            className="justify-self-start font-heading text-xl leading-none"
          >
            Lumen
          </Link>
          <nav className="hidden items-center gap-1 sm:flex" aria-label="Main">
            <NavItem
              to="/"
              icon={FolderIcon}
              label="Domains"
              active={location.pathname === "/" || location.pathname.startsWith("/d/")}
            />
            <NavItem
              to="/chat"
              icon={MessagesSquareIcon}
              label="Chat"
              dot={showDot}
            />
          </nav>
          <div className="col-start-3 justify-self-end">
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button variant="ghost" className="gap-2 pr-2 pl-1.5" />
                }
              >
                <span className="grid size-6 place-items-center rounded-full bg-muted text-xs font-medium text-foreground">
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
      <main className={cn("flex flex-1 flex-col", !onChat && "pb-24 sm:pb-0")}>
        <Suspense fallback={<PageLoader />}>
          <Outlet />
        </Suspense>
      </main>
      {!onChat && (
        <Link
          to="/chat"
          aria-label={showDot ? "Chat, new messages" : "Chat"}
          className="fixed right-4 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-40 grid size-14 place-items-center rounded-full border bg-popover text-foreground shadow-lg shadow-black/40 transition-transform active:scale-95 sm:hidden"
        >
          <MessagesSquareIcon className="size-6" />
          {showDot && (
            <span className="absolute top-0.5 right-0.5 size-3 rounded-full bg-gold ring-2 ring-background" />
          )}
        </Link>
      )}
      <ScrollRestoration
        getKey={(location) =>
          location.pathname.split("/").slice(0, 4).join("/")
        }
      />
    </div>
  )
}
