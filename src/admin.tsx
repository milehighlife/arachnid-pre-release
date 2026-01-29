import { useEffect, useMemo, useState } from 'react'
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
  submissionCount: number
  missions: {
    m1?: MissionProgress
    m2?: MissionProgress
    m3?: MissionProgress
  }
}

const formatComplete = (value?: boolean) => (value ? 'Complete' : 'Incomplete')

const renderMission1 = (mission?: MissionProgress) => {
  if (!mission || mission.status !== 'LOCKED') {
    return 'Incomplete'
  }
  return mission.data?.feel?.trim() || 'Complete'
}

const renderMission2 = (mission?: MissionProgress) => {
  if (!mission || mission.status !== 'LOCKED') {
    return 'Incomplete'
  }
  const data = mission.data || {}
  return [
    data.videoUrl || 'No URL',
    data.shirtSize || 'No size',
    `200ft: ${formatComplete(data.confirmDistance200)}`,
    `Public: ${formatComplete(data.confirmRights)}`,
  ].join(' | ')
}

const renderMission3 = (mission?: MissionProgress) => {
  if (!mission || mission.status !== 'LOCKED') {
    return 'Incomplete'
  }
  const data = mission.data || {}
  return [
    data.aceUrl || 'No URL',
    data.hoodieSize || 'No size',
    `200ft: ${formatComplete(data.confirmDistance200)}`,
    `Public: ${formatComplete(data.confirmRights)}`,
  ].join(' | ')
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
    return [...agents].sort((a, b) => a.last.localeCompare(b.last))
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
                <th>Mission 1</th>
                <th>Mission 2</th>
                <th>Mission 3</th>
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
                  <tr key={agent.token}>
                    <td>
                      {agent.last || '—'}, {agent.first || '—'}
                    </td>
                    <td>{agent.token}</td>
                    <td>{formatComplete(agent.introViewed ?? agent.introAccepted)}</td>
                    <td>{formatComplete(agent.introAccepted)}</td>
                    <td>{renderMission1(agent.missions?.m1)}</td>
                    <td>{renderMission2(agent.missions?.m2)}</td>
                    <td>{renderMission3(agent.missions?.m3)}</td>
                  </tr>
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
