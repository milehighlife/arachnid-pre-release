import { useCallback, useMemo, useState } from 'react'
import FeedbackForm, { type MissionStatusMap, type ProgressPayload } from './FeedbackForm'

const defaultStatus: MissionStatusMap = {
  m1: 'NOT STARTED',
  m2: 'NOT STARTED',
  m3: 'NOT STARTED',
}

type MissionsProps = {
  first: string
  last: string
  fullName: string
  handle: string
  codename: string
  token: string
  progress: ProgressPayload | null
  onProgressUpdate: (progress: ProgressPayload) => void
}

function Missions({ first, last, fullName, handle, codename, token, progress, onProgressUpdate }: MissionsProps) {
  const [statusMap, setStatusMap] = useState<MissionStatusMap>(defaultStatus)

  const handleStatusChange = useCallback((nextStatus: MissionStatusMap) => {
    setStatusMap(nextStatus)
  }, [])

  const lockedCount = useMemo(() => {
    return ['m1', 'm2', 'm3'].filter((key) => statusMap[key as keyof MissionStatusMap] === 'LOCKED')
      .length
  }, [statusMap])

  const progressPercent = Math.round((lockedCount / 3) * 100)

  return (
    <section id='missions' className='missions'>
      <div className='container'>
        <div className='missions-header'>
          <div className='section-label'>Mission Log — {codename}</div>
          <h2>Your Missions</h2>
          <p className='missions-intro'>Codename {codename}, your missions are live.</p>
          <p className='missions-copy'>
            Codename {codename}, complete missions to maintain Tester Team Status and unlock
            rewards.
          </p>
          <p className='missions-awards'>Awards will be issued to {fullName} after verification.</p>
        </div>

        <div className='mission-progress'>
          <div className='mission-progress-top'>
            <span>Mission Progress: {lockedCount}/3</span>
          </div>
          <div className='mission-progress-bar'>
            <div className='mission-progress-fill' style={{ width: `${progressPercent}%` }} />
          </div>
          <div className='mission-progress-steps'>
            {[1, 2, 3].map((step) => {
              const key = `m${step}` as keyof MissionStatusMap
              const isComplete = statusMap[key] === 'LOCKED'
              return (
                <div
                  key={step}
                  className={`mission-progress-step${isComplete ? ' is-complete' : ''}`}
                >
                  {step}
                </div>
              )
            })}
          </div>
        </div>

        <FeedbackForm
          first={first}
          last={last}
          fullName={fullName}
          handle={handle}
          codename={codename}
          token={token}
          progress={progress}
          onProgressUpdate={onProgressUpdate}
          onStatusChange={handleStatusChange}
        />
      </div>
    </section>
  )
}

export default Missions
