type Env = {
  ARACHNID_KV: KVNamespace
}

type MissionId = 'm1' | 'm2' | 'm3'
type MissionProgressStatus = 'NOT_STARTED' | 'LOCKED'

type MissionProgress = {
  status: MissionProgressStatus
  lastSubmittedAt?: string
  data?: {
    feel?: string
    flight?: string
    videoUrl?: string
    shirtSize?: string
    confirmDistance200?: boolean
    confirmRights?: boolean
    aceUrl?: string
    hoodieSize?: string
  }
}

type ProgressRecord = {
  token: string
  first: string
  last: string
  codename: string
  missions: Record<MissionId, MissionProgress>
  submissionCount: number
  createdAt: string
  updatedAt: string
  lastSeenAt: string
}

type FeedbackPayload = {
  token?: string
  first?: string
  last?: string
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
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
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

const sanitizeToken = (value: string) => value.replace(/^@+/, '').trim()

const isHttpUrl = (value: string) => value.startsWith('http')
const parseMissionId = (value: string): MissionId | null =>
  value === 'm1' || value === 'm2' || value === 'm3' ? value : null
const buildProgressKey = (token: string) => `arachnid:progress:${token}`

const defaultMissions = (): Record<MissionId, MissionProgress> => ({
  m1: { status: 'NOT_STARTED' },
  m2: { status: 'NOT_STARTED' },
  m3: { status: 'NOT_STARTED' },
})

const buildProgressRecord = ({
  token,
  first,
  last,
  codename,
  nowISO,
}: {
  token: string
  first: string
  last: string
  codename: string
  nowISO: string
}): ProgressRecord => ({
  token,
  first,
  last,
  codename,
  missions: defaultMissions(),
  submissionCount: 0,
  createdAt: nowISO,
  updatedAt: nowISO,
  lastSeenAt: nowISO,
})

export default {
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url)

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders })
    }

    if (url.pathname === '/api/status') {
      if (request.method !== 'GET') {
        return jsonResponse({ ok: false, error: 'Method not allowed' }, 405)
      }

      const tokenParam = (url.searchParams.get('token') || '').trim()
      if (!tokenParam) {
        return jsonResponse({ ok: false, error: 'Missing token' }, 400)
      }

      const first = (url.searchParams.get('first') || '').trim()
      const last = (url.searchParams.get('last') || '').trim()
      const tokenTag = sanitizeToken(tokenParam)
      const codename = tokenTag ? `@${tokenTag}` : `@${first || 'tester'}`
      const nowISO = new Date().toISOString()
      const key = buildProgressKey(tokenParam)

      const existing = (await env.ARACHNID_KV.get(key, 'json')) as ProgressRecord | null

      const record = existing
        ? {
            ...existing,
            codename,
            lastSeenAt: nowISO,
            updatedAt: nowISO,
          }
        : buildProgressRecord({
            token: tokenParam,
            first,
            last,
            codename,
            nowISO,
          })

      await env.ARACHNID_KV.put(key, JSON.stringify(record))

      return jsonResponse({
        ok: true,
        progress: {
          token: record.token,
          codename: record.codename,
          missions: record.missions,
          updatedAt: record.updatedAt,
          lastSeenAt: record.lastSeenAt,
        },
      })
    }

    if (url.pathname !== '/api/feedback') {
      return jsonResponse({ ok: false, error: 'Not found' }, 404)
    }

    if (request.method !== 'POST') {
      return jsonResponse({ ok: false, error: 'Method not allowed' }, 405)
    }

    let payload: FeedbackPayload
    try {
      payload = (await request.json()) as FeedbackPayload
    } catch {
      return jsonResponse({ ok: false, error: 'Invalid JSON payload' }, 400)
    }

    const token = typeof payload.token === 'string' ? payload.token.trim() : ''
    if (!token) {
      return jsonResponse({ ok: false, error: 'Missing token' }, 400)
    }

    const honeypot = typeof payload.honeypot === 'string' ? payload.honeypot.trim() : ''
    if (honeypot) {
      return jsonResponse({ ok: false, error: 'Invalid submission' }, 400)
    }

    const first = typeof payload.first === 'string' ? payload.first.trim() : ''
    const last = typeof payload.last === 'string' ? payload.last.trim() : ''
    const tokenTag = sanitizeToken(token)
    const codename = tokenTag ? `@${tokenTag}` : `@${first || 'tester'}`

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

    try {
      const missionData =
        missionId === 'm1'
          ? { feel: mission1Feel }
          : missionId === 'm2'
            ? {
                flight: mission2Flight,
                videoUrl: mission2VideoUrl,
                shirtSize: mission2ShirtSize,
                confirmDistance200: mission2ConfirmDistance,
                confirmRights: mission2ConfirmRights,
              }
            : {
                aceUrl: mission3AceUrl,
                hoodieSize: mission3HoodieSize,
                confirmDistance200: mission3ConfirmDistance,
                confirmRights: mission3ConfirmRights,
              }
      const nowISO = new Date().toISOString()
      const key = buildProgressKey(token)
      const existing = (await env.ARACHNID_KV.get(key, 'json')) as ProgressRecord | null
      const record =
        existing ??
        buildProgressRecord({
          token,
          first,
          last,
          codename,
          nowISO,
        })

      record.missions = {
        ...record.missions,
        [missionId]: {
          status: 'LOCKED',
          lastSubmittedAt: nowISO,
          data: missionData,
        },
      }
      record.submissionCount = (record.submissionCount || 0) + 1
      record.updatedAt = nowISO
      record.lastSeenAt = nowISO

      await env.ARACHNID_KV.put(key, JSON.stringify(record))

      return jsonResponse({
        ok: true,
        progress: {
          missions: record.missions,
          updatedAt: record.updatedAt,
          lastSeenAt: record.lastSeenAt,
        },
      })
    } catch {
      return jsonResponse({ ok: false, error: 'Failed to save progress' }, 500)
    }
  },
} satisfies ExportedHandler<Env>
