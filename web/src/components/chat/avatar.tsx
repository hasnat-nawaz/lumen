import { cn } from "@/lib/utils"

const TONES = [
  "bg-[oklch(0.78_0.09_190_/_0.16)] text-[oklch(0.82_0.09_190)]",
  "bg-[oklch(0.78_0.1_20_/_0.16)] text-[oklch(0.82_0.1_20)]",
  "bg-[oklch(0.8_0.09_140_/_0.16)] text-[oklch(0.84_0.09_140)]",
  "bg-[oklch(0.78_0.1_300_/_0.16)] text-[oklch(0.82_0.1_300)]",
]

export const NAME_TONES = [
  "text-[oklch(0.82_0.09_190)]",
  "text-[oklch(0.82_0.1_20)]",
  "text-[oklch(0.84_0.09_140)]",
  "text-[oklch(0.82_0.1_300)]",
]

export function toneIndex(authorId: string, colorOrder: string[]) {
  return Math.max(colorOrder.indexOf(authorId), 0) % TONES.length
}

export function Avatar({
  name,
  tone,
  own = false,
  className,
}: {
  name: string
  tone: number
  own?: boolean
  className?: string
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "grid size-7 shrink-0 place-items-center rounded-full text-xs font-semibold select-none",
        own ? "bg-gold/15 text-gold" : TONES[tone],
        className
      )}
    >
      {name[0]?.toUpperCase() ?? "?"}
    </span>
  )
}
