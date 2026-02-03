import webBgUrl from '../assets/mission-success-graphics/black-web-background.png'
import discUrl from '../assets/mission-success-graphics/disc.png'
import logoUrl from '../assets/mission-success-graphics/innova-arachnid-logo.png'
import defaultProfileUrl from '../assets/agent-profile-images/default.png'

const agentProfiles = import.meta.glob('../assets/agent-profile-images/*.png', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>

const TEMPLATE_VERSION = '2026-02-03-08'
const TEMPLATE_URL = `/templates/mission-success-template.svg?v=${TEMPLATE_VERSION}`
const CANVAS_WIDTH = 1080
const CANVAS_HEIGHT = 1440

let templateCache: string | null = null
let templatePromise: Promise<string> | null = null
let imageDataCache: {
  webBg: string
  disc: string
  logo: string
  agentProfile: string
} | null = null
let imageDataPromise: Promise<{
  webBg: string
  disc: string
  logo: string
  agentProfile: string
}> | null = null
let defaultProfileCache: string | null = null
let defaultProfilePromise: Promise<string> | null = null

const TRANSPARENT_PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/wcAAwAB/2kW0F4AAAAASUVORK5CYII='

const escapeXml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const formatDisplayTimestamp = (date: Date) =>
  date.toLocaleString('en-US', {
    month: 'numeric',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  })

const formatFilenameTimestamp = (date: Date) => {
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}_${pad(
    date.getHours(),
  )}${pad(date.getMinutes())}${pad(date.getSeconds())}`
}

const urlToDataUri = async (url: string) => {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Unable to load asset: ${url}`)
  }
  const blob = await response.blob()
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result)
      } else {
        reject(new Error('Unable to read asset data'))
      }
    }
    reader.onerror = () => reject(new Error('Unable to read asset data'))
    reader.readAsDataURL(blob)
  })
}

const loadImageData = async () => {
  if (imageDataCache) {
    return imageDataCache
  }
  if (!imageDataPromise) {
    imageDataPromise = Promise.all([
      urlToDataUri(webBgUrl),
      urlToDataUri(discUrl),
      urlToDataUri(logoUrl),
    ]).then(([webBg, disc, logo]) => {
      imageDataCache = { webBg, disc, logo, agentProfile: TRANSPARENT_PNG }
      return imageDataCache
    })
  }
  return imageDataPromise
}

const sanitizeTokenForFile = (token: string) =>
  token.replace(/^@+/, '').trim().toLowerCase().replace(/\s+/g, '')

const getAgentProfileUrl = (token: string) => {
  const normalized = sanitizeTokenForFile(token)
  if (!normalized) {
    return defaultProfileUrl
  }
  const entry = Object.entries(agentProfiles).find(([path]) => {
    const filename = path.split('/').pop() || ''
    const name = filename.replace(/\\.png$/i, '').toLowerCase()
    return name === normalized
  })
  return entry?.[1] ?? defaultProfileUrl
}

const profileDataCache = new Map<string, string>()

const loadDefaultProfileData = async () => {
  if (defaultProfileCache) {
    return defaultProfileCache
  }
  if (!defaultProfilePromise) {
    defaultProfilePromise = urlToDataUri(defaultProfileUrl).then((data) => {
      defaultProfileCache = data
      return data
    })
  }
  return defaultProfilePromise
}

const loadProfileData = async (token: string) => {
  const normalized = sanitizeTokenForFile(token)
  if (!normalized) {
    return loadDefaultProfileData()
  }
  if (profileDataCache.has(normalized)) {
    return profileDataCache.get(normalized) || TRANSPARENT_PNG
  }
  const url = getAgentProfileUrl(normalized)
  if (!url) {
    const fallback = await loadDefaultProfileData()
    profileDataCache.set(normalized, fallback)
    return fallback
  }
  const dataUri = await urlToDataUri(url)
  profileDataCache.set(normalized, dataUri)
  return dataUri
}

const replaceImageHref = (svg: string, token: string, dataUri: string) => {
  const pattern = new RegExp(`(href|xlink:href)=("|')([^"']*${escapeRegExp(token)}[^"']*)\\2`, 'gi')
  let replaced = false
  const nextSvg = svg.replace(pattern, (_match, attr, quote) => {
    replaced = true
    return `${attr}=${quote}${dataUri}${quote}`
  })
  return { svg: nextSvg, replaced }
}

const embedImages = (
  svg: string,
  data: { webBg: string; disc: string; logo: string; agentProfile: string },
) => {
  let nextSvg = svg
  const replacements = [
    { token: 'black-web-background', dataUri: data.webBg, label: 'web background' },
    { token: 'disc', dataUri: data.disc, label: 'disc' },
    { token: 'innova-arachnid-logo', dataUri: data.logo, label: 'logo' },
    { token: '__AGENT_PROFILE__', dataUri: data.agentProfile, label: 'agent profile' },
  ]

  for (const replacement of replacements) {
    const result = replaceImageHref(nextSvg, replacement.token, replacement.dataUri)
    nextSvg = result.svg
    if (!result.replaced) {
      console.warn(`Share card: ${replacement.label} not embedded`)
    }
  }

  return nextSvg
}

const ensureSvgNamespaces = (svg: string) => {
  let nextSvg = svg
  if (!/xmlns=/.test(nextSvg)) {
    nextSvg = nextSvg.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"')
  }
  if (!/xmlns:xlink=/.test(nextSvg)) {
    nextSvg = nextSvg.replace('<svg', '<svg xmlns:xlink="http://www.w3.org/1999/xlink"')
  }
  return nextSvg
}

export const fetchTemplateSvg = async (): Promise<string> => {
  if (templateCache) {
    return templateCache
  }
  if (!templatePromise) {
    templatePromise = fetch(TEMPLATE_URL)
      .then((response) => {
        if (!response.ok) {
          throw new Error('Unable to load mission template')
        }
        return response.text()
      })
      .then((text) => {
        templateCache = text
        return text
      })
  }
  return templatePromise
}

export const fillSvgPlaceholders = (svg: string, vars: Record<string, string>) => {
  return Object.entries(vars).reduce((current, [key, value]) => {
    const safeValue = escapeXml(value)
    const pattern = new RegExp(`\\{\\{${escapeRegExp(key)}\\}\\}`, 'g')
    return current.replace(pattern, safeValue)
  }, svg)
}

export const svgToPngBlob = (svgText: string): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const svgWithNamespaces = ensureSvgNamespaces(svgText)
    const svgBlob = new Blob([svgWithNamespaces], { type: 'image/svg+xml;charset=utf-8' })
    const svgUrl = URL.createObjectURL(svgBlob)
    const img = new Image()
    img.crossOrigin = 'anonymous'

    let settled = false

    const cleanup = () => {
      URL.revokeObjectURL(svgUrl)
    }

    const handleError = () => {
      if (settled) {
        return
      }
      settled = true
      window.clearTimeout(retryTimeout)
      cleanup()
      reject(new Error('Failed to render image'))
    }

    const handleLoad = () => {
      if (settled) {
        return
      }
      settled = true
      window.clearTimeout(retryTimeout)
      const canvas = document.createElement('canvas')
      canvas.width = CANVAS_WIDTH
      canvas.height = CANVAS_HEIGHT
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        cleanup()
        reject(new Error('Canvas not supported'))
        return
      }
      ctx.drawImage(img, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
      canvas.toBlob(
        (blob) => {
          cleanup()
          if (!blob) {
            reject(new Error('Unable to export image'))
            return
          }
          resolve(blob)
        },
        'image/png',
        0.92,
      )
    }

    img.onload = handleLoad
    img.onerror = handleError

    const retryTimeout = window.setTimeout(() => {
      if (settled) {
        return
      }
      img.src = svgUrl
    }, 2000)

    img.src = svgUrl

    if (typeof img.decode === 'function') {
      img.decode().then(handleLoad).catch(() => {})
    }
  })
}

export const buildMissionSuccessCardPng = async ({
  token,
  handle,
  timestamp,
  missionNumber,
  rank,
}: {
  token: string
  handle: string
  timestamp?: Date | string | number
  missionNumber: 1 | 2 | 3
  rank: string
}) => {
  const template = await fetchTemplateSvg()
  const rawHandle = (handle || '').replace(/^@+/, '').trim()
  const rawToken = (token || '').replace(/^@+/, '').trim()
  const safeHandle = rawHandle || 'agent'
  const safeToken = sanitizeTokenForFile(rawToken || safeHandle)
  const displayHandle = `@${safeHandle}`
  const date = timestamp ? new Date(timestamp) : new Date()
  const safeDate = Number.isNaN(date.getTime()) ? new Date() : date
  const displayTimestamp = formatDisplayTimestamp(safeDate)

  const filled = fillSvgPlaceholders(template, {
    USERNAME: displayHandle,
    TIMESTAMP: displayTimestamp,
    MISSION_NUMBER: String(missionNumber),
    RANK: rank,
    AGENT: displayHandle,
  })

  const imageData = await loadImageData()
  const agentProfile = await loadProfileData(safeToken)
  if (!agentProfile || agentProfile.length < 50) {
    console.warn('Share card: profile data URI missing/too short', { token: safeToken })
  }
  let embedded = embedImages(filled, { ...imageData, agentProfile })
  embedded = embedded.replaceAll('__AGENT_PROFILE__', agentProfile)
  if (!embedded.includes('data:image/png')) {
    console.warn('Share card: no data URIs embedded (profile likely missing)')
  }
  const blob = await svgToPngBlob(embedded)

  const filenameHandle = safeHandle
    .replace(/[^a-z0-9._-]+/gi, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '')
  const filename = `arachnid_mission-complete_${filenameHandle || 'agent'}_${formatFilenameTimestamp(
    safeDate,
  )}.png`

  return { blob, filename }
}
