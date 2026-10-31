import { useEffect, useSyncExternalStore } from "react"

function subscribe(onChange: () => void) {
  const viewport = window.visualViewport
  viewport?.addEventListener("resize", onChange)
  window.addEventListener("resize", onChange)
  return () => {
    viewport?.removeEventListener("resize", onChange)
    window.removeEventListener("resize", onChange)
  }
}

const readHeight = () => window.visualViewport?.height ?? window.innerHeight

/**
 * Height of the part of the screen the user can actually see. On phones this
 * shrinks when the on-screen keyboard opens, unlike 100dvh on iOS Safari.
 */
export function useViewportHeight() {
  const height = useSyncExternalStore(subscribe, readHeight, readHeight)

  useEffect(() => {
    const viewport = window.visualViewport
    if (!viewport) return
    const pin = () => {
      if (window.scrollY !== 0) window.scrollTo(0, 0)
    }
    viewport.addEventListener("resize", pin)
    viewport.addEventListener("scroll", pin)
    return () => {
      viewport.removeEventListener("resize", pin)
      viewport.removeEventListener("scroll", pin)
    }
  }, [])

  return height
}
