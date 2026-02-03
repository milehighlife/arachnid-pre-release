const TEMPLATE_URL = '/templates/mission-success-template.svg'
const CANVAS_WIDTH = 1080
const CANVAS_HEIGHT = 1440

let templateCache: string | null = null
let templatePromise: Promise<string> | null = null

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
    const svgBlob = new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' })
    const svgUrl = URL.createObjectURL(svgBlob)
    const img = new Image()
    img.crossOrigin = 'anonymous'

    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = CANVAS_WIDTH
      canvas.height = CANVAS_HEIGHT
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        URL.revokeObjectURL(svgUrl)
        reject(new Error('Canvas not supported'))
        return
      }
      ctx.drawImage(img, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
      canvas.toBlob(
        (blob) => {
          URL.revokeObjectURL(svgUrl)
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

    img.onerror = () => {
      URL.revokeObjectURL(svgUrl)
      reject(new Error('Failed to render image'))
    }

    img.src = svgUrl
  })
}

export const buildMissionSuccessCardPng = async ({
  handle,
  timestamp,
}: {
  handle: string
  timestamp?: Date | string | number
}) => {
  const template = await fetchTemplateSvg()
  const rawHandle = (handle || '').replace(/^@+/, '').trim()
  const safeHandle = rawHandle || 'agent'
  const displayHandle = `@${safeHandle}`
  const date = timestamp ? new Date(timestamp) : new Date()
  const safeDate = Number.isNaN(date.getTime()) ? new Date() : date
  const displayTimestamp = formatDisplayTimestamp(safeDate)

  const filled = fillSvgPlaceholders(template, {
    USERNAME: displayHandle,
    TIMESTAMP: displayTimestamp,
  })

  const blob = await svgToPngBlob(filled)
  const filenameHandle = safeHandle
    .replace(/[^a-z0-9._-]+/gi, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '')
  const filename = `arachnid_mission-complete_${filenameHandle || 'agent'}_${formatFilenameTimestamp(
    safeDate,
  )}.png`

  return { blob, filename }
}
