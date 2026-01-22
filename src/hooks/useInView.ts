import { useEffect, useRef, useState } from 'react'

type InViewOptions = {
  root?: Element | null
  rootMargin?: string
  threshold?: number | number[]
  once?: boolean
}

export default function useInView<T extends Element>(options: InViewOptions = {}) {
  const { root = null, rootMargin = '0px', threshold = 0.2, once = true } = options
  const ref = useRef<T | null>(null)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const node = ref.current
    if (!node) {
      return
    }

    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
      setInView(true)
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        if (!entry) {
          return
        }

        if (entry.isIntersecting) {
          setInView(true)
          if (once) {
            observer.unobserve(node)
          }
        } else if (!once) {
          setInView(false)
        }
      },
      { root, rootMargin, threshold },
    )

    observer.observe(node)

    return () => {
      observer.disconnect()
    }
  }, [root, rootMargin, threshold, once])

  return { ref, inView }
}
