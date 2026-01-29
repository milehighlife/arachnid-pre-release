import { Fragment, useEffect, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'
import { getApiUrl } from './utils/api'

type MissionProgress = {
  status: 'NOT_STARTED' | 'LOCKED'
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

const renderMission1 = (mission?: MissionProgress, fallbackTime?: string | null) => {
  if (!mission || mission.status !== 'LOCKED') {
    return 'Incomplete'
  }
  const details = mission.data?.feel?.trim() || 'Complete'
  const time = formatTimestamp(mission.lastSubmittedAt || fallbackTime || null)
  return (
    <div>
      <div>{details}</div>
      <div className='admin-meta'>{time}</div>
    </div>
  )
}

const renderMission2 = (mission?: MissionProgress, fallbackTime?: string | null) => {
  if (!mission || mission.status !== 'LOCKED') {
    return 'Incomplete'
  }
  const data = mission.data || {}
  const time = formatTimestamp(mission.lastSubmittedAt || fallbackTime || null)
  return (
    <div>
      <div>
        {(data.videoUrl || 'No URL')} | {(data.shirtSize || 'No size')} | 200ft:{' '}
        {formatComplete(data.confirmDistance200)} | Public:{' '}
        {formatComplete(data.confirmRights)}
      </div>
      <div className='admin-meta'>{time}</div>
    </div>
  )
}

const renderMission3 = (mission?: MissionProgress, fallbackTime?: string | null) => {
  if (!mission || mission.status !== 'LOCKED') {
    return 'Incomplete'
  }
  const data = mission.data || {}
  const time = formatTimestamp(mission.lastSubmittedAt || fallbackTime || null)
  return (
    <div>
      <div>
        {(data.aceUrl || 'No URL')} | {(data.hoodieSize || 'No size')} | 200ft:{' '}
        {formatComplete(data.confirmDistance200)} | Public:{' '}
        {formatComplete(data.confirmRights)}
      </div>
      <div className='admin-meta'>{time}</div>
    </div>
  )
}

function AdminApp() {
  const [tokenInput, setTokenInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [agents, setAgents] = useState<AgentRecord[]>([])
  const [authed, setAuthed] = useState(false)

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
                <th>Agent Last, First</th>
                <th>Agent Token</th>
                <th>Viewed Intro Video</th>
                <th>Accepted Missions</th>
                <th>Last Seen</th>
                <th>Last Update</th>
                <th>Update Action</th>
              </tr>
            </thead>
            <tbody>
              {sortedAgents.length === 0 && !loading ? (
                <tr>
                  <td colSpan={7} className='admin-empty'>
                    No agent data available.
                  </td>
                </tr>
              ) : (
                sortedAgents.map((agent) => (
                  <Fragment key={agent.token}>
                    <tr className='admin-row-main'>
                      <td>
                        {agent.last || '—'}, {agent.first || '—'}
                      </td>
                      <td>{agent.token}</td>
                      <td>
                        {formatComplete(agent.introViewed ?? agent.introAccepted)} •{' '}
                        {formatTimestamp(agent.introViewedAt)}
                      </td>
                      <td>
                        {formatComplete(agent.introAccepted || Boolean(agent.introAcceptedAt))} •{' '}
                        {formatTimestamp(agent.introAcceptedAt)}
                      </td>
                      <td>{formatTimestamp(agent.lastSeenAt)}</td>
                      <td>{formatTimestamp(agent.updatedAt)}</td>
                      <td>{agent.updateAction || 'Viewed page'}</td>
                    </tr>
                    <tr className='admin-row-missions'>
                      <td colSpan={7}>
                        <div className='admin-mission-row'>
                          <div className='admin-mission-cell'>
                            <span className='admin-mission-label'>Mission 1</span>
                            <div className='admin-mission-value'>
                              {renderMission1(agent.missions?.m1, agent.updatedAt)}
                            </div>
                          </div>
                          <div className='admin-mission-cell'>
                            <span className='admin-mission-label'>Mission 2</span>
                            <div className='admin-mission-value'>
                              {renderMission2(agent.missions?.m2, agent.updatedAt)}
                            </div>
                          </div>
                          <div className='admin-mission-cell'>
                            <span className='admin-mission-label'>Mission 3</span>
                            <div className='admin-mission-value'>
                              {renderMission3(agent.missions?.m3, agent.updatedAt)}
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  </Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

const root = document.getElementById('admin-root')
if (root) {
  createRoot(root).render(<AdminApp />)
}
