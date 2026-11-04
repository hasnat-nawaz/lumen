import { Link } from "react-router-dom"

import { mentionHref, parseBody, type MentionTarget } from "@/lib/mentions"

function mentionText(target: MentionTarget) {
  const [domain, paper, section] = target.trail
  if (section) return `${domain} / ${paper} → ${section}`
  if (paper) return `${domain} / ${paper}`
  return domain
}

export function MessageBody({
  body,
  byPath,
}: {
  body: string
  byPath: Map<string, MentionTarget>
}) {
  return (
    <>
      {parseBody(body, byPath).map((part, index) => {
        if (part.type === "mention") {
          return (
            <Link
              key={index}
              to={mentionHref(part.target.path)}
              title={part.value}
              className="rounded-[0.3rem] bg-gold/12 px-1 py-px font-medium text-gold decoration-gold/50 underline-offset-2 hover:underline"
            >
              @{mentionText(part.target)}
            </Link>
          )
        }
        if (part.type === "link") {
          return (
            <a
              key={index}
              href={part.value}
              target="_blank"
              rel="noreferrer"
              className="break-all text-foreground underline decoration-foreground/40 underline-offset-2 transition-colors hover:decoration-foreground"
            >
              {part.value}
            </a>
          )
        }
        return <span key={index}>{part.value}</span>
      })}
    </>
  )
}
