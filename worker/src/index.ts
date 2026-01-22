import { EmailMessage } from 'cloudflare:email'

type Env = {
  EMAIL: SendEmail
}

type FeedbackPayload = {
  message?: string
  first?: string
  last?: string
  userAgent?: string
  timestampISO?: string
  company?: string
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

const getName = (first: string, last: string) => {
  const firstName = first || 'tester'
  return first && last ? `${first} ${last}` : firstName
}

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

    const message = typeof payload.message === 'string' ? payload.message.trim() : ''
    const company = typeof payload.company === 'string' ? payload.company.trim() : ''

    if (company) {
      return jsonResponse({ ok: false, error: 'Invalid submission' }, 400)
    }

    if (message.length < 10 || message.length > 2000) {
      return jsonResponse({ ok: false, error: 'Message must be 10-2000 characters' }, 400)
    }

    const first = typeof payload.first === 'string' ? payload.first.trim() : ''
    const last = typeof payload.last === 'string' ? payload.last.trim() : ''
    const fullName = getName(first, last)

    const userAgent =
      typeof payload.userAgent === 'string' && payload.userAgent.trim()
        ? payload.userAgent
        : 'unknown'
    const timestampISO =
      typeof payload.timestampISO === 'string' && payload.timestampISO.trim()
        ? payload.timestampISO
        : new Date().toISOString()

    const to = 'jeff@innovadiscs.com'
    const from = 'feedback@innovadiscs.com'
    const subject = `Arachnid Pre-Release Feedback: ${fullName}`

    const body = [
      `From: ${from}`,
      `To: ${to}`,
      `Subject: ${subject}`,
      'Content-Type: text/plain; charset="UTF-8"',
      '',
      `Name: ${fullName}`,
      '',
      'Message:',
      message,
      '',
      `User Agent: ${userAgent}`,
      `Timestamp: ${timestampISO}`,
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
