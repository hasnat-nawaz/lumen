import { FileTextIcon, FolderIcon, TextIcon } from "lucide-react"

import type { MentionTarget } from "@/lib/mentions"
import { cn } from "@/lib/utils"

const ICONS = {
  domain: FolderIcon,
  paper: FileTextIcon,
  section: TextIcon,
}

export function MentionMenu({
  id,
  items,
  activeIndex,
  onHover,
  onPick,
}: {
  id: string
  items: MentionTarget[]
  activeIndex: number
  onHover: (index: number) => void
  onPick: (target: MentionTarget) => void
}) {
  return (
    <div className="absolute inset-x-2 bottom-full z-20 mb-2 overflow-hidden rounded-xl border bg-popover shadow-lg shadow-black/30 sm:inset-x-3">
      {items.length === 0 ? (
        <p className="px-3 py-3 text-sm text-muted-foreground">
          No domain, paper or section matches.
        </p>
      ) : (
        <ul id={id} role="listbox" aria-label="Tag suggestions" className="max-h-72 overflow-y-auto p-1">
          {items.map((item, index) => {
            const Icon = ICONS[item.kind]
            const [domain, paper, section] = item.trail
            return (
              <li
                key={item.path}
                id={`${id}-${index}`}
                role="option"
                aria-selected={index === activeIndex}
                onMouseEnter={() => onHover(index)}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => onPick(item)}
                className={cn(
                  "flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2",
                  index === activeIndex && "bg-accent"
                )}
              >
                <Icon className={cn("size-4 shrink-0", item.kind === "domain" ? "text-gold" : "text-muted-foreground")} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">
                    {section ? (
                      <>
                        <span className="text-muted-foreground">{domain} / {paper} → </span>
                        {section}
                      </>
                    ) : paper ? (
                      <>
                        <span className="text-muted-foreground">{domain} / </span>
                        {paper}
                      </>
                    ) : (
                      domain
                    )}
                  </p>
                  <p className="truncate font-mono text-[11px] text-muted-foreground">
                    @{item.path}
                  </p>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
