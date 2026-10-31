export const SECTIONS = [
  {
    key: "overview",
    title: "Overview",
    hint: "What is it, in plain words.",
  },
  {
    key: "explanation",
    title: "Explanation",
    hint: "Concept, methodology, formulas, experiments and results.",
  },
  {
    key: "hardware",
    title: "Hardware",
    hint: "Devices, compute and sensors the work used or needs.",
  },
  {
    key: "software",
    title: "Software",
    hint: "Frameworks, models, datasets and tools.",
  },
  {
    key: "gaps",
    title: "Gaps",
    hint: "Limitations and places we could improve on.",
  },
  {
    key: "notes",
    title: "Notes",
    hint: "Anything else the team should know.",
  },
] as const

export type SectionKey = (typeof SECTIONS)[number]["key"]

export function isSectionKey(value: string | undefined): value is SectionKey {
  return SECTIONS.some((section) => section.key === value)
}

export function sectionTitle(key: SectionKey) {
  return SECTIONS.find((section) => section.key === key)!.title
}
