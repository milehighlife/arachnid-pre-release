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
  codename: string
  token: string
  progress: ProgressPayload | null
  onProgressUpdate: (progress: ProgressPayload) => void
}

function Missions({ first, last, fullName, codename, token, progress, onProgressUpdate }: MissionsProps) {
  const [statusMap, setStatusMap] = useState<MissionStatusMap>(defaultStatus)
  const tokenLabel = token.trim().replace(/^@+/, '') || 'tester'

  const handleStatusChange = useCallback((nextStatus: MissionStatusMap) => {
    setStatusMap(nextStatus)
  }, [])

  const lockedCount = useMemo(() => {
    return ['m1', 'm2', 'm3'].filter((key) => statusMap[key as keyof MissionStatusMap] === 'LOCKED')
      .length
  }, [statusMap])

  const statusLabel = useMemo(() => {
    if (statusMap.m3 === 'LOCKED') {
      return 'Tier One'
    }
    if (statusMap.m2 === 'LOCKED') {
      return 'Operator'
    }
    if (statusMap.m1 === 'LOCKED') {
      return 'Qualified'
    }
    return 'Candidate'
  }, [statusMap])

  const progressPercent = lockedCount === 3 ? 100 : lockedCount * 33

  return (
    <section id='missions' className='missions'>
      <div className='container'>
        <div className='system-label mono'>SECURE CHANNEL: ACTIVE</div>
        <div className='missions-header'>
          <div className='section-label'>Mission Log — {codename}</div>
          <h2>{statusLabel === 'Tier One' ? 'Missions Completed' : 'Your Missions'}</h2>
          <p className='missions-copy'>
            {statusLabel === 'Tier One'
              ? 'Congratulations! You are an elite-level operator and have accomplished a challenging mission set. Your insights into the Arachnid are first class. Thank you for your contribution!'
              : `Agent ${tokenLabel} your missions are live. Unlocked rewards will be issued upon verification. Allow 2-3 weeks for fulfillment.`}
          </p>
        </div>

        <div className='mission-progress'>
          <div className='mission-progress-top'>
            <span>
              Mission Progress: {statusLabel} ({lockedCount}/3)
            </span>
          </div>
          <div className='mission-progress-bar'>
            <div className='mission-progress-fill' style={{ width: `${progressPercent}%` }} />
            <div className='mission-progress-steps'>
              {[1, 2, 3].map((step) => {
                const key = `m${step}` as keyof MissionStatusMap
                const isComplete = statusMap[key] === 'LOCKED'
                const position = step === 1 ? 33 : step === 2 ? 66 : 100
                return (
                  <div
                    key={step}
                    className={`mission-progress-step${isComplete ? ' is-complete' : ''}${
                      step === 3 ? ' is-end' : ''
                    }`}
                    style={{ left: `${position}%` }}
                  >
                    {isComplete ? (
                      <svg viewBox='0 0 16 16' aria-hidden='true'>
                        <path
                          d='M3.2 8.6 6.4 11.6 12.8 4.8'
                          fill='none'
                          stroke='currentColor'
                          strokeWidth='2'
                          strokeLinecap='round'
                          strokeLinejoin='round'
                        />
                      </svg>
                    ) : (
                      step
                    )}
                  </div>
                )
              })}
            </div>
          </div>
          <div className='progress-label mono'>DATA ENCRYPTED AT REST</div>
        </div>

        <FeedbackForm
          first={first}
          last={last}
          fullName={fullName}
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
