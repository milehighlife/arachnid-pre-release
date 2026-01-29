export const getApiUrl = (path: string) => {
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname
    if (hostname === 'arachnidagent.com' || hostname.endsWith('.arachnidagent.com')) {
      return path
    }
  }

  const workerUrl =
    import.meta.env.VITE_WORKER_URL ||
    (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
      ? 'https://arachnidagent.com/api/feedback'
      : '')
  if (!workerUrl) {
    return path
  }

  try {
    const origin = typeof window === 'undefined' ? 'http://localhost' : window.location.origin
    const base = new URL(workerUrl, origin)
    base.pathname = base.pathname.replace(/\/api\/feedback\/?$/, '')
    const basePath = base.pathname.replace(/\/$/, '')
    base.pathname = `${basePath}${path}`
    return base.toString()
  } catch {
    return path
  }
}
