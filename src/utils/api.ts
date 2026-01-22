export const getApiUrl = (path: string) => {
  const workerUrl = import.meta.env.VITE_WORKER_URL
  if (!workerUrl) {
    return path
  }

  try {
    const origin =
      typeof window === 'undefined' ? 'http://localhost' : window.location.origin
    const base = new URL(workerUrl, origin)
    if (base.pathname.endsWith('/api/feedback')) {
      base.pathname = base.pathname.replace(/\/api\/feedback\/?$/, '')
    }
    const basePath = base.pathname.replace(/\/$/, '')
    base.pathname = `${basePath}${path}`
    return base.toString()
  } catch {
    return path
  }
}
