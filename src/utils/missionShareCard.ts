import mission1CardBg from '../assets/mission-success-graphics/mission-1-card-bg.png'
import mission2CardBg from '../assets/mission-success-graphics/mission-2-card-bg.png'
import mission3CardBg from '../assets/mission-success-graphics/mission-3-card-bg.png'
import defaultProfileUrl from '../assets/agent-profile-images/default.png'

const agentProfiles = import.meta.glob('../assets/agent-profile-images/*.png', {
  eager: true,
  import: 'default',
}) as Record<string, string>

const TEMPLATE_VERSION = '2026-02-03-25'
const TEMPLATE_URL = `/templates/mission-success-template.svg?v=${TEMPLATE_VERSION}`
const CANVAS_WIDTH = 1080
const CANVAS_HEIGHT = 1440

let templateCache: string | null = null
let templatePromise: Promise<string> | null = null
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

const hashString = (value: string) => {
  let hash = 0
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i)
    hash |= 0
  }
  return hash >>> 0
}

const mulberry32 = (seed: number) => {
  let t = seed >>> 0
  return () => {
    t += 0x6d2b79f5
    let result = t
    result = Math.imul(result ^ (result >>> 15), result | 1)
    result ^= result + Math.imul(result ^ (result >>> 7), result | 61)
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296
  }
}

const makeTimestampBarcodeSvg = (timestamp: string, color: string) => {
  const width = 690
  const height = 36
  const originX = 1080 - 36 - width
  const originY = 1440 - height
  const rand = mulberry32(hashString(timestamp))
  const rects: string[] = []
  let cursor = 0

  while (cursor < width) {
    const barWidth = rand() < 0.5 ? 3 : 7
    const gap = 4
    const barHeight = height
    if (cursor + barWidth > width) {
      break
    }
    const barX = originX + cursor
    const barY = originY

    rects.push(
      `<rect x="${barX}" y="${barY}" width="${barWidth}" height="${barHeight}" fill="${color}"/>`,
    )

    cursor += barWidth + gap
  }

  return rects.join('')
}

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
        if (!reader.result.startsWith('data:image')) {
          reject(new Error('Asset data URL invalid'))
          return
        }
        resolve(reader.result)
      } else {
        reject(new Error('Unable to read asset data'))
      }
    }
    reader.onerror = () => reject(new Error('Unable to read asset data'))
    reader.readAsDataURL(blob)
  })
}

const missionCardBackgrounds: Record<1 | 2 | 3, string> = {
  1: mission1CardBg,
  2: mission2CardBg,
  3: mission3CardBg,
}

const missionBackgroundCache = new Map<number, string>()

const loadMissionBackgroundData = async (missionNumber: 1 | 2 | 3) => {
  if (missionBackgroundCache.has(missionNumber)) {
    return missionBackgroundCache.get(missionNumber) || TRANSPARENT_PNG
  }
  const source = missionCardBackgrounds[missionNumber]
  if (!source) {
    return TRANSPARENT_PNG
  }
  const dataUri = source.startsWith('data:image') ? source : await urlToDataUri(source)
  missionBackgroundCache.set(missionNumber, dataUri)
  return dataUri
}

const getMissionColors = (missionNumber: 1 | 2 | 3) => {
  if (missionNumber === 2) {
    return {
      timestamp: '#cccccc',
      headline: '#cccccc',
      accent: '#cccccc',
      tagline: '#cccccc',
      barcode: '#cccccc',
    }
  }
  if (missionNumber === 3) {
    return {
      timestamp: '#000000',
      headline: '#000000',
      accent: '#000000',
      tagline: '#000000',
      barcode: '#000000',
    }
  }
  return {
    timestamp: '#18b77a',
    headline: '#ffffff',
    accent: '#18b77a',
    tagline: '#ffffff',
    barcode: '#333333',
  }
}

const normalizeToken = (raw: string) =>
  (raw || '')
    .trim()
    .toLowerCase()
    .replace(/^@+/, '')
    .replace(/\.png$/i, '')
    .replace(/\s+/g, '')

const getProfileUrl = (token: string) => {
  const normalized = normalizeToken(token)
  const keys = Object.keys(agentProfiles)
  if (normalized) {
    const hitKey = keys.find((key) => key.toLowerCase().endsWith(`/${normalized}.png`))
    if (hitKey) {
      return agentProfiles[hitKey] as string
    }
    console.warn('Share card: profile URL not found for token', token)
  }
  const defaultKey = keys.find((key) => key.toLowerCase().endsWith('/default.png'))
  if (defaultKey) {
    return agentProfiles[defaultKey] as string
  }
  return null
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
  const normalized = normalizeToken(token)
  if (!normalized) {
    return loadDefaultProfileData()
  }
  if (profileDataCache.has(normalized)) {
    return profileDataCache.get(normalized) || TRANSPARENT_PNG
  }
  const url = getProfileUrl(normalized)
  if (!url) {
    console.warn('Share card: profile URL not found for token', token)
    const fallback = await loadDefaultProfileData()
    profileDataCache.set(normalized, fallback)
    return fallback
  }
  const dataUri = await urlToDataUri(url)
  if (!dataUri || !dataUri.startsWith('data:image')) {
    console.warn('Share card: profile data URI invalid', token)
  }
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

const embedImages = (svg: string, data: { agentProfile: string; cardBackground: string }) => {
  let nextSvg = svg
  const replacements = [
    { token: '__CARD_BG__', dataUri: data.cardBackground, label: 'card background' },
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

const loadCanvasImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.crossOrigin = 'anonymous'
    let settled = false
    const retryTimeout = window.setTimeout(() => {
      if (!settled) {
        image.src = src
      }
    }, 2000)
    const finalize = (success: boolean) => {
      if (settled) {
        return
      }
      settled = true
      window.clearTimeout(retryTimeout)
      if (success) {
        resolve(image)
      } else {
        reject(new Error('Image failed to load'))
      }
    }
    image.onload = () => finalize(true)
    image.onerror = () => finalize(false)
    image.src = src
    if (typeof image.decode === 'function') {
      image.decode().then(() => finalize(true)).catch(() => {})
    }
  })

export const svgToPngBlob = async (
  svgText: string,
  backgroundSrc?: string | null,
): Promise<Blob> => {
  const svgWithNamespaces = ensureSvgNamespaces(svgText)
  const svgBlob = new Blob([svgWithNamespaces], { type: 'image/svg+xml;charset=utf-8' })
  const svgUrl = URL.createObjectURL(svgBlob)

  try {
    const [svgImage, backgroundImage] = await Promise.all([
      loadCanvasImage(svgUrl),
      backgroundSrc
        ? loadCanvasImage(backgroundSrc).catch((error) => {
            console.warn('Share card: background image failed to load', error)
            return null
          })
        : Promise.resolve(null),
    ])

    const canvas = document.createElement('canvas')
    canvas.width = CANVAS_WIDTH
    canvas.height = CANVAS_HEIGHT
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      throw new Error('Canvas not supported')
    }

    if (backgroundImage) {
      ctx.drawImage(backgroundImage, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
    }
    ctx.drawImage(svgImage, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (result) => {
          if (!result) {
            reject(new Error('Unable to export image'))
            return
          }
          resolve(result)
        },
        'image/png',
        0.92,
      )
    })

    return blob
  } finally {
    URL.revokeObjectURL(svgUrl)
  }
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
  const safeToken = normalizeToken(rawToken || safeHandle)
  const displayHandle = `@${safeHandle}`
  const date = timestamp ? new Date(timestamp) : new Date()
  const safeDate = Number.isNaN(date.getTime()) ? new Date() : date
  const displayTimestamp = formatDisplayTimestamp(safeDate)
  const timestampLabel = `M${missionNumber}: ${displayTimestamp.replace(',', ' •')}`
  const colors = getMissionColors(missionNumber)
  const barcodeSvg = makeTimestampBarcodeSvg(timestampLabel, colors.barcode)

  const filled = fillSvgPlaceholders(template, {
    USERNAME: displayHandle,
    TIMESTAMP: timestampLabel,
    MISSION_NUMBER: String(missionNumber),
    RANK: rank,
    AGENT: displayHandle,
    DOT1_FILL: missionNumber >= 1 ? '#18b77a' : 'none',
    DOT2_FILL: missionNumber >= 2 ? '#18b77a' : 'none',
    DOT3_FILL: missionNumber >= 3 ? '#18b77a' : 'none',
    TIMESTAMP_COLOR: colors.timestamp,
    HEADLINE_COLOR: colors.headline,
    ACCENT_COLOR: colors.accent,
    TAGLINE_COLOR: colors.tagline,
  })
  const withBarcode = filled.replaceAll('{{BARCODE_SVG}}', barcodeSvg)

  const backgroundDataUri = await loadMissionBackgroundData(missionNumber)
  const agentProfile = await loadProfileData(safeToken)
  if (!agentProfile || agentProfile.length < 50) {
    console.warn('Share card: profile data URI missing/too short', { token: safeToken })
  }
  let embedded = embedImages(withBarcode, { agentProfile, cardBackground: backgroundDataUri })
  embedded = embedded.replaceAll('__CARD_BG__', backgroundDataUri)
  embedded = embedded.replaceAll('__AGENT_PROFILE__', agentProfile)
  if (embedded.includes('__CARD_BG__')) {
    console.warn('Share card: CARD_BG token not replaced')
  }
  if (embedded.includes('__AGENT_PROFILE__')) {
    console.warn('Share card: AGENT_PROFILE token not replaced')
  }
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
