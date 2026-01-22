import { EmailMessage } from 'cloudflare:email'

type Env = {
  EMAIL: SendEmail
}

type MissionId = 'm1' | 'm2' | 'm3'

type FeedbackPayload = {
  first?: string
  last?: string
  fullName?: string
  handle?: string
  codename?: string
  userAgent?: string
  timestampISO?: string
  pageUrl?: string
  missionMeta?: {
    missionId?: string
  }
  mission?: {
    feel?: string
    flight?: string
    videoUrl?: string
    shirtSize?: string
    confirmDistance200?: boolean
    confirmRights?: boolean
    aceUrl?: string
    hoodieSize?: string
  }
  honeypot?: string
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Feedback-Token',
}

const jsonResponse = (payload: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  })

const sanitizeHandle = (value: string) => value.replace(/^@+/, '').trim()

const getName = (first: string, last: string) => {
  const firstName = first || 'tester'
  return first && last ? `${first} ${last}` : firstName
}

const isHttpUrl = (value: string) => value.startsWith('http')
const parseMissionId = (value: string): MissionId | null =>
  value === 'm1' || value === 'm2' || value === 'm3' ? value : null

export default {
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url)

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders })
    }

    if (url.pathname !== '/api/feedback') {
      return jsonResponse({ ok: false, error: 'Not found' }, 404)
    }

    if (request.method !== 'POST') {
      return jsonResponse({ ok: false, error: 'Method not allowed' }, 405)
    }

    const token = request.headers.get('X-Feedback-Token') || ''
    if (token.length < 16) {
      return jsonResponse({ ok: false, error: 'Invalid token' }, 400)
    }

    let payload: FeedbackPayload
    try {
      payload = (await request.json()) as FeedbackPayload
    } catch {
      return jsonResponse({ ok: false, error: 'Invalid JSON payload' }, 400)
    }

    const honeypot = typeof payload.honeypot === 'string' ? payload.honeypot.trim() : ''
    if (honeypot) {
      return jsonResponse({ ok: false, error: 'Invalid submission' }, 400)
    }

    const first = typeof payload.first === 'string' ? payload.first.trim() : ''
    const last = typeof payload.last === 'string' ? payload.last.trim() : ''
    const computedName = getName(first, last)
    const fullName =
      typeof payload.fullName === 'string' && payload.fullName.trim()
        ? payload.fullName.trim()
        : computedName

    const handleRaw = typeof payload.handle === 'string' ? payload.handle.trim() : ''
    const handle = sanitizeHandle(handleRaw)
    const codename = handle ? `@${handle}` : `@${first || 'tester'}`

    const missionIdRaw =
      typeof payload.missionMeta?.missionId === 'string' ? payload.missionMeta.missionId.trim() : ''
    const missionId = parseMissionId(missionIdRaw)
    if (!missionId) {
      return jsonResponse({ ok: false, error: 'Invalid mission id' }, 400)
    }

    const mission = payload.mission ?? {}

    const mission1Feel = typeof mission.feel === 'string' ? mission.feel.trim() : ''
    const mission2Flight = typeof mission.flight === 'string' ? mission.flight.trim() : ''
    const mission2VideoUrl = typeof mission.videoUrl === 'string' ? mission.videoUrl.trim() : ''
    const mission2ShirtSize = typeof mission.shirtSize === 'string' ? mission.shirtSize.trim() : ''
    const mission2ConfirmDistance = Boolean(mission.confirmDistance200)
    const mission2ConfirmRights = Boolean(mission.confirmRights)
    const mission3AceUrl = typeof mission.aceUrl === 'string' ? mission.aceUrl.trim() : ''
    const mission3HoodieSize = typeof mission.hoodieSize === 'string' ? mission.hoodieSize.trim() : ''
    const mission3ConfirmDistance = Boolean(mission.confirmDistance200)
    const mission3ConfirmRights = Boolean(mission.confirmRights)

    if (missionId === 'm1') {
      if (mission1Feel.length < 10 || mission1Feel.length > 2000) {
        return jsonResponse({ ok: false, error: 'Mission 1 text must be 10-2000 characters' }, 400)
      }
    }

    if (missionId === 'm2') {
      if (!mission2Flight || !mission2VideoUrl || !mission2ShirtSize) {
        return jsonResponse({ ok: false, error: 'Mission 2 requires all fields' }, 400)
      }
      if (!isHttpUrl(mission2VideoUrl)) {
        return jsonResponse({ ok: false, error: 'Mission 2 video URL must start with http' }, 400)
      }
      if (!mission2ConfirmDistance || !mission2ConfirmRights) {
        return jsonResponse({ ok: false, error: 'Mission 2 confirmations are required' }, 400)
      }
    }

    if (missionId === 'm3') {
      if (!mission3AceUrl || !mission3HoodieSize) {
        return jsonResponse({ ok: false, error: 'Mission 3 requires all fields' }, 400)
      }
      if (!isHttpUrl(mission3AceUrl)) {
        return jsonResponse({ ok: false, error: 'Mission 3 video URL must start with http' }, 400)
      }
      if (!mission3ConfirmDistance || !mission3ConfirmRights) {
        return jsonResponse({ ok: false, error: 'Mission 3 confirmations are required' }, 400)
      }
    }

    const userAgent =
      typeof payload.userAgent === 'string' && payload.userAgent.trim()
        ? payload.userAgent
        : 'unknown'
    const timestampISO =
      typeof payload.timestampISO === 'string' && payload.timestampISO.trim()
        ? payload.timestampISO
        : new Date().toISOString()
    const pageUrl = typeof payload.pageUrl === 'string' ? payload.pageUrl.trim() : ''

    const to = 'jeff@innovadiscs.com'
    const from = 'feedback@innovadiscs.com'
    const missionNumber = missionId === 'm1' ? '1' : missionId === 'm2' ? '2' : '3'
    const subject = `Arachnid Mission ${missionNumber} Submission: ${fullName} (${codename})`

    const missionHeader =
      missionId === 'm1'
        ? 'Mission 1 — Tell Us How the Disc Feels'
        : missionId === 'm2'
          ? 'Mission 2 — Share How the Arachnid Flew'
          : 'Mission 3 — Sharpshooter: Get an Arachnid Ace on Video'

    const missionDetails =
      missionId === 'm1'
        ? [`Feel: ${mission1Feel || 'n/a'}`]
        : missionId === 'm2'
          ? [
              `Flight: ${mission2Flight || 'n/a'}`,
              `Video URL: ${mission2VideoUrl || 'n/a'}`,
              `Shirt Size: ${mission2ShirtSize || 'n/a'}`,
              `Confirm Distance 200ft: ${mission2ConfirmDistance ? 'Yes' : 'No'}`,
              `Confirm Rights: ${mission2ConfirmRights ? 'Yes' : 'No'}`,
              `Award Eligible: ${mission2ConfirmDistance && mission2ConfirmRights ? 'Yes' : 'No'}`,
            ]
          : [
              `Ace URL: ${mission3AceUrl || 'n/a'}`,
              `Hoodie Size: ${mission3HoodieSize || 'n/a'}`,
              `Confirm Distance 200ft: ${mission3ConfirmDistance ? 'Yes' : 'No'}`,
              `Confirm Rights: ${mission3ConfirmRights ? 'Yes' : 'No'}`,
              `Award Eligible: ${mission3ConfirmDistance && mission3ConfirmRights ? 'Yes' : 'No'}`,
            ]

    const body = [
      `From: ${from}`,
      `To: ${to}`,
      `Subject: ${subject}`,
      'Content-Type: text/plain; charset="UTF-8"',
      '',
      `Name: ${fullName}`,
      `Codename: ${codename}`,
      `Handle: ${handle ? `@${handle}` : 'n/a'}`,
      '',
      `Timestamp: ${timestampISO}`,
      `User Agent: ${userAgent}`,
      `Page URL: ${pageUrl || 'n/a'}`,
      '',
      `Mission ID: ${missionId}`,
      missionHeader,
      ...missionDetails,
    ].join('\n')

    try {
      const email = new EmailMessage(from, to, body)
      await env.EMAIL.send(email)
      return jsonResponse({ ok: true })
    } catch {
      return jsonResponse({ ok: false, error: 'Failed to send email' }, 500)
    }
  },
} satisfies ExportedHandler<Env>
