export function slugify(input: string) {
  const slug = input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/g, "")

  return slug || "untitled"
}

export function withSuffix(slug: string) {
  return `${slug}-${Math.random().toString(36).slice(2, 6)}`
}

export const UNIQUE_VIOLATION = "23505"
