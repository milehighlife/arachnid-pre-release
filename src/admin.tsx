import { Fragment, useEffect, useMemo, useState, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'
import { getApiUrl } from './utils/api'

type MissionProgress = {
  status: 'NOT_STARTED' | 'LOCKED'
  lastSubmittedAt?: string
  data?: {
    feel?: string
    feelRating?: number
    feelNote?: string
    flight?: string
    flightRating?: number
    flightNote?: string
    videoUrl?: string
    shirtSize?: string
    confirmDistance200?: boolean
    confirmRights?: boolean
    aceUrl?: string
    hoodieSize?: string
  }
}

type AgentRecord = {
  token: string
  first: string
  last: string
  codename: string
  introViewed?: boolean
  introViewedAt?: string | null
  introAccepted: boolean
  introAcceptedAt?: string | null
  submissionCount: number
  visitCount?: number
  lastSeenAt?: string | null
  updatedAt?: string | null
  updateAction?: string
  missions: {
    m1?: MissionProgress
    m2?: MissionProgress
    m3?: MissionProgress
  }
}

const formatComplete = (value?: boolean) => (value ? 'Complete' : 'Incomplete')

const formatTimestamp = (value?: string | null) => {
  if (!value) {
    return '—'
  }
  try {
    return new Date(value).toLocaleString()
  } catch {
    return value
  }
}

const renderValue = (value?: string) => (value && value.trim().length > 0 ? value : '—')

const fieldCell = (label: string, value: ReactNode) => (
  <div className='admin-field-cell'>
    <span className='admin-field-label'>{label}</span>
    <span className='admin-field-value'>{value}</span>
  </div>
)

const renderLink = (url?: string) =>
  url ? (
    <a className='admin-link' href={url} target='_blank' rel='noreferrer'>
      {url}
    </a>
  ) : (
    '—'
  )

const renderMission1 = (mission?: MissionProgress, fallbackTime?: string | null) => {
  if (!mission || mission.status !== 'LOCKED') {
    return fieldCell('Status', 'Incomplete')
  }
  const time = formatTimestamp(mission.lastSubmittedAt || fallbackTime || null)
  return (
    <div className='admin-field-grid'>
      {fieldCell('Status', 'Complete')}
      {fieldCell('Feel Summary', renderValue(mission.data?.feel))}
      {fieldCell(
        'Feel Rating',
        typeof mission.data?.feelRating === 'number'
          ? `${mission.data.feelRating}/5`
          : '—',
      )}
      {fieldCell('Poor Feel Explanation', renderValue(mission.data?.feelNote))}
      {fieldCell('Submitted', time)}
    </div>
  )
}

const renderMission2 = (mission?: MissionProgress, fallbackTime?: string | null) => {
  if (!mission || mission.status !== 'LOCKED') {
    return fieldCell('Status', 'Incomplete')
  }
  const data = mission.data || {}
  const time = formatTimestamp(mission.lastSubmittedAt || fallbackTime || null)
  return (
    <div className='admin-field-grid'>
      {fieldCell('Status', 'Complete')}
      {fieldCell('Flight Summary', renderValue(data.flight))}
      {fieldCell(
        'Flight Rating',
        typeof data.flightRating === 'number' ? `${data.flightRating}/5` : '—',
      )}
      {fieldCell('Poor Flight Explanation', renderValue(data.flightNote))}
      {fieldCell('Video URL', renderLink(data.videoUrl))}
      {fieldCell('Shirt Size', renderValue(data.shirtSize))}
      {fieldCell('200ft+', formatComplete(data.confirmDistance200))}
      {fieldCell('Public Video', formatComplete(data.confirmRights))}
      {fieldCell('Submitted', time)}
    </div>
  )
}

const renderMission3 = (mission?: MissionProgress, fallbackTime?: string | null) => {
  if (!mission || mission.status !== 'LOCKED') {
    return fieldCell('Status', 'Incomplete')
  }
  const data = mission.data || {}
  const time = formatTimestamp(mission.lastSubmittedAt || fallbackTime || null)
  return (
    <div className='admin-field-grid'>
      {fieldCell('Status', 'Complete')}
      {fieldCell('Ace Video URL', renderLink(data.aceUrl))}
      {fieldCell('Hoodie Size', renderValue(data.hoodieSize))}
      {fieldCell('200ft+', formatComplete(data.confirmDistance200))}
      {fieldCell('Public Video', formatComplete(data.confirmRights))}
      {fieldCell('Submitted', time)}
    </div>
  )
}

function AdminApp() {
  const [tokenInput, setTokenInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [agents, setAgents] = useState<AgentRecord[]>([])
  const [authed, setAuthed] = useState(false)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  useEffect(() => {
    const cached = sessionStorage.getItem('arachnid_admin_token') || ''
    setTokenInput(cached)
    setAuthed(Boolean(cached))
  }, [])

  useEffect(() => {
    if (tokenInput) {
      sessionStorage.setItem('arachnid_admin_token', tokenInput)
    }
  }, [tokenInput])

  const sortedAgents = useMemo(() => {
    const toTime = (value?: string | null) => (value ? new Date(value).getTime() : 0)
    return [...agents].sort((a, b) => toTime(b.lastSeenAt) - toTime(a.lastSeenAt))
  }, [agents])

  const handleLoad = async () => {
    setLoading(true)
    setError('')
    try {
      const response = await fetch(getApiUrl('/api/admin/agents'), {
        headers: { 'X-Admin-Token': tokenInput.trim() },
      })
      const data = (await response.json()) as { ok?: boolean; agents?: AgentRecord[]; error?: string }
      if (!response.ok || !data.ok) {
        const isUnauthorized =
          response.status === 401 || String(data?.error || '').toLowerCase().includes('unauthorized')
        const message = isUnauthorized ? 'unauthorized access' : data?.error || 'Unable to load agent stats.'
        setError(message)
        setAuthed(false)
        setLoading(false)
        return
      }
      setAgents(data.agents || [])
      setAuthed(true)
      setLoading(false)
    } catch {
      setError('Unable to load agent stats.')
      setAuthed(false)
      setLoading(false)
    }
  }

  const handleLogout = () => {
    sessionStorage.removeItem('arachnid_admin_token')
    setTokenInput('')
    setAgents([])
    setAuthed(false)
    setError('')
  }

  const handleDownloadCsv = () => {
    if (!agents.length) {
      return
    }
    const headers = [
      'Name',
      'Token',
      'Updated',
      'Visits',
      'Viewed Video',
      'Viewed Video At',
      'Accepted Missions',
      'Accepted Missions At',
      'Update Action',
      'Mission 1 Status',
      'Mission 1 Feel',
      'Mission 1 Feel Rating',
      'Mission 1 Poor Feel Explanation',
      'Mission 1 Submitted At',
      'Mission 2 Status',
      'Mission 2 Flight',
      'Mission 2 Flight Rating',
      'Mission 2 Poor Flight Explanation',
      'Mission 2 Video URL',
      'Mission 2 Shirt Size',
      'Mission 2 200ft+',
      'Mission 2 Public Video',
      'Mission 2 Submitted At',
      'Mission 3 Status',
      'Mission 3 Ace URL',
      'Mission 3 Hoodie Size',
      'Mission 3 200ft+',
      'Mission 3 Public Video',
      'Mission 3 Submitted At',
    ]

    const escapeValue = (value: string | number | boolean | null | undefined) => {
      const stringValue = String(value ?? '')
      if (stringValue.includes('"') || stringValue.includes(',') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`
      }
      return stringValue
    }

    const rows = agents.map((agent) => {
      const m1 = agent.missions?.m1
      const m2 = agent.missions?.m2
      const m3 = agent.missions?.m3
      return [
        `${agent.last || '—'}, ${agent.first || '—'}`,
        agent.token,
        agent.updatedAt || '',
        agent.visitCount ?? 0,
        formatComplete(agent.introViewed ?? agent.introAccepted),
        agent.introViewedAt || '',
        formatComplete(agent.introAccepted || Boolean(agent.introAcceptedAt)),
        agent.introAcceptedAt || '',
        agent.updateAction || '',
        m1?.status || 'NOT_STARTED',
        m1?.data?.feel || '',
        m1?.data?.feelRating ?? '',
        m1?.data?.feelNote || '',
        m1?.lastSubmittedAt || '',
        m2?.status || 'NOT_STARTED',
        m2?.data?.flight || '',
        m2?.data?.flightRating ?? '',
        m2?.data?.flightNote || '',
        m2?.data?.videoUrl || '',
        m2?.data?.shirtSize || '',
        formatComplete(m2?.data?.confirmDistance200),
        formatComplete(m2?.data?.confirmRights),
        m2?.lastSubmittedAt || '',
        m3?.status || 'NOT_STARTED',
        m3?.data?.aceUrl || '',
        m3?.data?.hoodieSize || '',
        formatComplete(m3?.data?.confirmDistance200),
        formatComplete(m3?.data?.confirmRights),
        m3?.lastSubmittedAt || '',
      ]
    })

    const csv = [headers, ...rows]
      .map((row) => row.map((value) => escapeValue(value)).join(','))
      .join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'arachnid-agent-responses.csv'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const toggleRow = (token: string) => {
    setExpanded((prev) => ({ ...prev, [token]: !prev[token] }))
  }

  return (
    <div className='admin-page'>
      <div className='container'>
        <header className='admin-header'>
          <h1>Arachnid Agent Console</h1>
          <p className='admin-subtitle'>Secure access required.</p>
        </header>
        <div className='admin-controls'>
          <input
            type='password'
            placeholder='Admin token'
            value={tokenInput}
            onChange={(event) => setTokenInput(event.target.value)}
          />
          <button type='button' onClick={handleLoad} disabled={!tokenInput.trim() || loading}>
            {loading ? 'Loading…' : 'Load Agents'}
          </button>
          {authed && (
            <button type='button' className='admin-logout' onClick={handleLogout}>
              Log out
            </button>
          )}
        </div>
        {error && <div className='admin-error'>{error}</div>}
        <div className='admin-table-wrap'>
          <table className='admin-table'>
            <thead>
              <tr>
                <th></th>
                <th>Name</th>
                <th>Updated</th>
                <th>Visits</th>
                <th>Token</th>
                <th>Viewed Video</th>
                <th>Accepted Missions</th>
                <th>Update Action</th>
              </tr>
            </thead>
            <tbody>
              {sortedAgents.length === 0 && !loading ? (
                <tr>
                  <td colSpan={8} className='admin-empty'>
                    No agent data available.
                  </td>
                </tr>
              ) : (
                sortedAgents.map((agent) => (
                  <Fragment key={agent.token}>
                    <tr className='admin-row-main'>
                      <td className='admin-toggle-cell'>
                        <button
                          type='button'
                          className='admin-toggle'
                          onClick={() => toggleRow(agent.token)}
                          aria-expanded={Boolean(expanded[agent.token])}
                          aria-label='Toggle agent details'
                        >
                          {expanded[agent.token] ? '−' : '+'}
                        </button>
                      </td>
                      <td>
                        <span className='admin-name'>
                          {agent.last || '—'}, {agent.first || '—'}
                        </span>
                      </td>
                      <td>{formatTimestamp(agent.updatedAt)}</td>
                      <td>{agent.visitCount ?? 0}</td>
                      <td>{agent.token}</td>
                      <td>
                        {formatComplete(agent.introViewed ?? agent.introAccepted)} •{' '}
                        {formatTimestamp(agent.introViewedAt)}
                      </td>
                      <td>
                        {formatComplete(agent.introAccepted || Boolean(agent.introAcceptedAt))} •{' '}
                        {formatTimestamp(agent.introAcceptedAt)}
                      </td>
                      <td>{agent.updateAction || 'Viewed page'}</td>
                    </tr>
                    {expanded[agent.token] && (
                      <>
                        <tr className='admin-row-missions'>
                          <td colSpan={8}>
                            <div className='admin-mission-block'>
                              <div className='admin-mission-title'>Mission 1</div>
                              {renderMission1(agent.missions?.m1, agent.updatedAt)}
                            </div>
                          </td>
                        </tr>
                        <tr className='admin-row-missions'>
                          <td colSpan={8}>
                            <div className='admin-mission-block'>
                              <div className='admin-mission-title'>Mission 2</div>
                              {renderMission2(agent.missions?.m2, agent.updatedAt)}
                            </div>
                          </td>
                        </tr>
                        <tr className='admin-row-missions'>
                          <td colSpan={8}>
                            <div className='admin-mission-block'>
                              <div className='admin-mission-title'>Mission 3</div>
                              {renderMission3(agent.missions?.m3, agent.updatedAt)}
                            </div>
                          </td>
                        </tr>
                      </>
                    )}
                  </Fragment>
                ))
              )}
            </tbody>
          </table>
          {agents.length > 0 && (
            <div className='admin-download'>
              <button type='button' onClick={handleDownloadCsv}>
                Download CSV
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const root = document.getElementById('admin-root')
if (root) {
  createRoot(root).render(<AdminApp />)
}
