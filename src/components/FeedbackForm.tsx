import { useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import MissionCard, { type MissionStatus } from './MissionCard'
import MissionSuccessModal from './MissionSuccessModal'
import { getApiUrl } from '../utils/api'

type FeedbackFormProps = {
  first: string
  last: string
  fullName: string
  codename: string
  token: string
  handle: string
  progress: ProgressPayload | null
  onProgressUpdate: (progress: ProgressPayload) => void
  onStatusChange?: (statusMap: MissionStatusMap) => void
}

export type MissionId = 'm1' | 'm2' | 'm3'

type SubmitStage = 'idle' | 'encrypting' | 'uploading' | 'sent'

type ErrorMap = Record<string, string>

export type MissionStatusMap = Record<MissionId, MissionStatus>

type MissionStageMap = Record<MissionId, SubmitStage>

type MissionStringMap = Record<MissionId, string>

type MissionTouchedMap = Record<MissionId, boolean>

type MissionSuccessMeta = {
  missionNumber: 1 | 2 | 3
  rank: string
}

export type MissionProgressStatus = 'NOT_STARTED' | 'LOCKED'

export type MissionProgress = {
  status: MissionProgressStatus
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

export type ProgressPayload = {
  token?: string
  codename?: string
  missions: Record<MissionId, MissionProgress>
  introViewed?: boolean
  introViewedAt?: string | null
  introAccepted?: boolean
  introAcceptedAt?: string | null
  updatedAt?: string
  lastSeenAt?: string
}

const defaultStatus: MissionStatusMap = {
  m1: 'NOT STARTED',
  m2: 'NOT STARTED',
  m3: 'NOT STARTED',
}

const defaultStages: MissionStageMap = {
  m1: 'idle',
  m2: 'idle',
  m3: 'idle',
}

const defaultStrings: MissionStringMap = {
  m1: '',
  m2: '',
  m3: '',
}

const defaultTouched: MissionTouchedMap = {
  m1: false,
  m2: false,
  m3: false,
}

const isHttpUrl = (value: string) => value.startsWith('http')
const countWords = (value: string) => value.trim().split(/\s+/).filter(Boolean).length

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const deriveMissionStatus = (active: boolean, ready: boolean): MissionStatus => {
  if (!active) {
    return 'NOT STARTED'
  }
  return ready ? 'READY' : 'IN PROGRESS'
}

const getMissionSuccessMeta = (missionId: MissionId): MissionSuccessMeta => {
  if (missionId === 'm1') {
    return { missionNumber: 1, rank: 'FIELD TESTER' }
  }
  if (missionId === 'm2') {
    return { missionNumber: 2, rank: 'OPERATIVE' }
  }
  return { missionNumber: 3, rank: 'SHARPSHOOTER' }
}

function FeedbackForm({
  first,
  last,
  fullName,
  codename,
  token,
  handle,
  progress,
  onProgressUpdate,
  onStatusChange,
}: FeedbackFormProps) {
  const tokenValue = useMemo(() => token.trim(), [token])
  const shareHandle = useMemo(
    () => (handle || codename || tokenValue || 'tester').trim(),
    [handle, codename, tokenValue],
  )
  const profileToken = useMemo(
    () =>
      (tokenValue || handle || '')
        .trim()
        .toLowerCase()
        .replace(/^@/, '')
        .replace(/\s+/g, ''),
    [tokenValue, handle],
  )
  const feedbackUrl = useMemo(() => getApiUrl('/api/feedback'), [])
  const timeoutsRef = useRef<number[]>([])
  const [missionStatus, setMissionStatus] = useState<MissionStatusMap>(defaultStatus)
  const [missionStages, setMissionStages] = useState<MissionStageMap>(defaultStages)
  const [missionErrors, setMissionErrors] = useState<MissionStringMap>(defaultStrings)
  const [missionTouched, setMissionTouched] = useState<MissionTouchedMap>(defaultTouched)

  const [mission1Feel, setMission1Feel] = useState('')
  const [mission1FeelRating, setMission1FeelRating] = useState(3)
  const [mission1FeelNote, setMission1FeelNote] = useState('')
  const [mission2Flight, setMission2Flight] = useState('')
  const [mission2FlightRating, setMission2FlightRating] = useState(3)
  const [mission2FlightNote, setMission2FlightNote] = useState('')
  const [mission2VideoUrl, setMission2VideoUrl] = useState('')
  const [mission2ShirtSize, setMission2ShirtSize] = useState('')
  const [mission2ConfirmDistance, setMission2ConfirmDistance] = useState(false)
  const [mission2ConfirmRights, setMission2ConfirmRights] = useState(false)
  const [mission3AceUrl, setMission3AceUrl] = useState('')
  const [mission3HoodieSize, setMission3HoodieSize] = useState('')
  const [mission3ConfirmDistance, setMission3ConfirmDistance] = useState(false)
  const [mission3ConfirmRights, setMission3ConfirmRights] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [successMeta, setSuccessMeta] = useState<MissionSuccessMeta>(getMissionSuccessMeta('m1'))
  const [company, setCompany] = useState('')
  const [hasAttempted, setHasAttempted] = useState<MissionTouchedMap>(defaultTouched)
  const tokenMissing = !tokenValue

  useEffect(() => {
    onStatusChange?.(missionStatus)
  }, [missionStatus, onStatusChange])

  useEffect(() => {
    setMissionStages((prev) => {
      const next = { ...prev }
      let changed = false

      ;(['m1', 'm2', 'm3'] as MissionId[]).forEach((id) => {
        if (missionStatus[id] === 'LOCKED' && prev[id] !== 'sent') {
          next[id] = 'sent'
          changed = true
        }
        if (
          missionStatus[id] !== 'LOCKED' &&
          missionStatus[id] !== 'SENDING' &&
          prev[id] === 'sent'
        ) {
          next[id] = 'idle'
          changed = true
        }
      })

      return changed ? next : prev
    })
  }, [missionStatus])

  useEffect(() => {
    return () => {
      timeoutsRef.current.forEach((timer) => window.clearTimeout(timer))
      timeoutsRef.current = []
    }
  }, [])

  useEffect(() => {
    if (!progress?.missions) {
      return
    }

    setMissionStatus((prev) => {
      const next = { ...prev }
      let changed = false

      ;(['m1', 'm2', 'm3'] as MissionId[]).forEach((id) => {
        const progressStatus = progress.missions[id]?.status
        if (!progressStatus) {
          return
        }
        if (progressStatus === 'LOCKED' && prev[id] !== 'LOCKED') {
          next[id] = 'LOCKED'
          changed = true
          return
        }
        if (progressStatus === 'NOT_STARTED' && prev[id] === 'LOCKED') {
          next[id] = 'NOT STARTED'
          changed = true
        }
      })

      return changed ? next : prev
    })

    const m1Data = progress.missions.m1?.data
    if (m1Data?.feel && !missionTouched.m1 && !mission1Feel) {
      setMission1Feel(m1Data.feel)
    }
    if (typeof m1Data?.feelRating === 'number') {
      setMission1FeelRating(m1Data.feelRating)
    }
    if (typeof m1Data?.feelNote === 'string' && !missionTouched.m1 && !mission1FeelNote) {
      setMission1FeelNote(m1Data.feelNote)
    }

    const m2Data = progress.missions.m2?.data
    if (!missionTouched.m2 && m2Data) {
      if (m2Data.flight && !mission2Flight) {
        setMission2Flight(m2Data.flight)
      }
      if (typeof m2Data.flightRating === 'number') {
        setMission2FlightRating(m2Data.flightRating)
      }
      if (typeof m2Data.flightNote === 'string' && !mission2FlightNote) {
        setMission2FlightNote(m2Data.flightNote)
      }
      if (m2Data.videoUrl && !mission2VideoUrl) {
        setMission2VideoUrl(m2Data.videoUrl)
      }
      if (m2Data.shirtSize && !mission2ShirtSize) {
        setMission2ShirtSize(m2Data.shirtSize)
      }
      if (typeof m2Data.confirmDistance200 === 'boolean' && !mission2ConfirmDistance) {
        setMission2ConfirmDistance(m2Data.confirmDistance200)
      }
      if (typeof m2Data.confirmRights === 'boolean' && !mission2ConfirmRights) {
        setMission2ConfirmRights(m2Data.confirmRights)
      }
    }

    const m3Data = progress.missions.m3?.data
    if (!missionTouched.m3 && m3Data) {
      if (m3Data.aceUrl && !mission3AceUrl) {
        setMission3AceUrl(m3Data.aceUrl)
      }
      if (m3Data.hoodieSize && !mission3HoodieSize) {
        setMission3HoodieSize(m3Data.hoodieSize)
      }
      if (typeof m3Data.confirmDistance200 === 'boolean' && !mission3ConfirmDistance) {
        setMission3ConfirmDistance(m3Data.confirmDistance200)
      }
      if (typeof m3Data.confirmRights === 'boolean' && !mission3ConfirmRights) {
        setMission3ConfirmRights(m3Data.confirmRights)
      }
    }
  }, [
    progress,
    missionTouched.m1,
    missionTouched.m2,
    missionTouched.m3,
    mission1Feel,
    mission2Flight,
    mission2VideoUrl,
    mission2ShirtSize,
    mission2ConfirmDistance,
    mission2ConfirmRights,
    mission3AceUrl,
    mission3HoodieSize,
    mission3ConfirmDistance,
    mission3ConfirmRights,
  ])

  const mission1Active = mission1Feel.trim().length > 0
  const mission2Active =
    mission2Flight.trim().length > 0 ||
    mission2VideoUrl.trim().length > 0 ||
    mission2ShirtSize.trim().length > 0 ||
    mission2ConfirmDistance ||
    mission2ConfirmRights
  const mission3Active =
    mission3AceUrl.trim().length > 0 ||
    mission3HoodieSize.trim().length > 0 ||
    mission3ConfirmDistance ||
    mission3ConfirmRights

  const mission1WordCount = countWords(mission1Feel)
  const mission1Ready = mission1WordCount >= 25 && mission1Feel.trim().length <= 2000
  const mission1Locked = missionStatus.m1 === 'LOCKED'
  const mission2Locked = missionStatus.m2 === 'LOCKED'
  const mission2Ready =
    mission1Locked &&
    mission2Flight.trim().length >= 10 &&
    isHttpUrl(mission2VideoUrl.trim()) &&
    Boolean(mission2ShirtSize.trim()) &&
    mission2ConfirmDistance &&
    mission2ConfirmRights
  const mission3Ready =
    mission2Locked &&
    isHttpUrl(mission3AceUrl.trim()) &&
    Boolean(mission3HoodieSize.trim()) &&
    mission3ConfirmDistance &&
    mission3ConfirmRights

  useEffect(() => {
    setMissionStatus((prev) => {
      const next = { ...prev }
      let changed = false

      const update = (id: MissionId, derived: MissionStatus, touched: boolean) => {
        if (prev[id] === 'LOCKED' || prev[id] === 'SENDING') {
          return
        }
        if (prev[id] === 'ERROR' && !touched) {
          return
        }
        if (prev[id] !== derived) {
          next[id] = derived
          changed = true
        }
      }

      update('m1', deriveMissionStatus(mission1Active, mission1Ready), missionTouched.m1)
      update('m2', deriveMissionStatus(mission2Active, mission2Ready), missionTouched.m2)
      update('m3', deriveMissionStatus(mission3Active, mission3Ready), missionTouched.m3)

      return changed ? next : prev
    })
  }, [
    mission1Active,
    mission1Ready,
    mission2Active,
    mission2Ready,
    mission3Active,
    mission3Ready,
    missionTouched.m1,
    missionTouched.m2,
    missionTouched.m3,
  ])

  const updateMissionTouched = (missionId: MissionId) => {
    setMissionTouched((prev) => ({ ...prev, [missionId]: true }))
    if (missionErrors[missionId]) {
      setMissionErrors((prev) => ({ ...prev, [missionId]: '' }))
    }
  }

  const handleEdit = (missionId: MissionId) => {
    setMissionStatus((prev) => ({ ...prev, [missionId]: 'IN PROGRESS' }))
    setMissionStages((prev) => ({ ...prev, [missionId]: 'idle' }))
    setMissionErrors((prev) => ({ ...prev, [missionId]: '' }))
    setMissionTouched((prev) => ({ ...prev, [missionId]: true }))
  }

  const handleOpenShare = (missionId: MissionId) => {
    setSuccessMeta(getMissionSuccessMeta(missionId))
    setShowSuccessModal(true)
  }

  const validateMission = (missionId: MissionId) => {
    const nextErrors: ErrorMap = {}

    if (company.trim()) {
      nextErrors.company = 'Unable to submit. Please clear the hidden field.'
    }

    if (missionId === 'm1') {
      const length = mission1Feel.trim().length
      const words = countWords(mission1Feel)
      if (words < 25 || length > 2000) {
        nextErrors.m1 = 'Mission 1 notes must be at least 25 words (max 2000 characters).'
      }
      return nextErrors
    }

    if (missionId === 'm2') {
      if (!mission1Locked) {
        nextErrors.m2 = 'Complete Mission 1 before submitting Mission 2.'
        return nextErrors
      }
      if (!mission2Flight.trim()) {
        nextErrors.m2 = 'Provide flight details to complete Mission 2.'
      } else if (mission2Flight.trim().length < 10) {
        nextErrors.m2 = 'Mission 2 flight notes must be at least 10 characters.'
      }
      if (!mission2VideoUrl.trim()) {
        nextErrors.m2 = 'Add a public video URL for Mission 2.'
      } else if (!isHttpUrl(mission2VideoUrl.trim())) {
        nextErrors.m2 = 'Video URL must start with http.'
      }
      if (!mission2ShirtSize.trim()) {
        nextErrors.m2 = 'Select a T-shirt size.'
      }
      if (!mission2ConfirmDistance || !mission2ConfirmRights) {
        nextErrors.m2 = 'Confirm the authorization toggles for Mission 2.'
      }
      return nextErrors
    }

    if (missionId === 'm3') {
      if (!mission2Locked) {
        nextErrors.m3 = 'Complete Mission 2 before submitting Mission 3.'
        return nextErrors
      }
      if (!mission3AceUrl.trim()) {
        nextErrors.m3 = 'Add a public ace video URL.'
      } else if (!isHttpUrl(mission3AceUrl.trim())) {
        nextErrors.m3 = 'Ace URL must start with http.'
      } else if (mission2VideoUrl.trim() && mission3AceUrl.trim() === mission2VideoUrl.trim()) {
        nextErrors.m3 = 'Mission 3 video must be different from Mission 2.'
      }
      if (!mission3HoodieSize.trim()) {
        nextErrors.m3 = 'Select a hoodie size.'
      }
      if (!mission3ConfirmDistance || !mission3ConfirmRights) {
        nextErrors.m3 = 'Confirm the authorization toggles for Mission 3.'
      }
      return nextErrors
    }

    return nextErrors
  }

  const submitMission = async (missionId: MissionId) => {
    if (missionStatus[missionId] === 'SENDING') {
      return
    }

    if (tokenMissing) {
      return
    }

    setHasAttempted((prev) => ({ ...prev, [missionId]: true }))
    const nextErrors = validateMission(missionId)

    if (Object.keys(nextErrors).length > 0) {
      setMissionStatus((prev) => ({ ...prev, [missionId]: 'ERROR' }))
      setMissionErrors((prev) => ({ ...prev, [missionId]: nextErrors[missionId] || nextErrors.company }))
      return
    }

    setMissionStatus((prev) => ({ ...prev, [missionId]: 'SENDING' }))
    setMissionErrors((prev) => ({ ...prev, [missionId]: '' }))
    setMissionStages((prev) => ({ ...prev, [missionId]: 'encrypting' }))

    timeoutsRef.current.push(
      window.setTimeout(() => {
        setMissionStages((prev) => ({ ...prev, [missionId]: 'uploading' }))
      }, 450),
    )

    const missionPayload =
      missionId === 'm1'
        ? {
            feel: mission1Feel.trim(),
            feelRating: mission1FeelRating,
            feelNote: mission1FeelNote.trim(),
          }
        : missionId === 'm2'
          ? {
              flight: mission2Flight.trim(),
              flightRating: mission2FlightRating,
              flightNote: mission2FlightNote.trim(),
              videoUrl: mission2VideoUrl.trim(),
              shirtSize: mission2ShirtSize.trim(),
              confirmDistance200: mission2ConfirmDistance,
              confirmRights: mission2ConfirmRights,
            }
          : {
              aceUrl: mission3AceUrl.trim(),
              hoodieSize: mission3HoodieSize.trim(),
              confirmDistance200: mission3ConfirmDistance,
              confirmRights: mission3ConfirmRights,
            }

    const payload = {
      token: tokenValue,
      first,
      last,
      fullName,
      codename,
      userAgent: typeof navigator === 'undefined' ? 'unknown' : navigator.userAgent,
      timestampISO: new Date().toISOString(),
      pageUrl: typeof window === 'undefined' ? '' : window.location.href,
      missionMeta: { missionId },
      mission: missionPayload,
      honeypot: company.trim(),
    }

    const startTime = Date.now()

    try {
      const response = await fetch(feedbackUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Feedback-Token': tokenValue.padEnd(16, '0'),
        },
        body: JSON.stringify(payload),
      })

      const data = (await response.json().catch(() => null)) as
        | { ok: boolean; error?: string; progress?: ProgressPayload }
        | null

      const elapsed = Date.now() - startTime
      if (elapsed < 900) {
        await sleep(900 - elapsed)
      }

      if (!response.ok || !data?.ok) {
        setMissionStatus((prev) => ({ ...prev, [missionId]: 'ERROR' }))
        setMissionStages((prev) => ({ ...prev, [missionId]: 'idle' }))
        setMissionErrors((prev) => ({ ...prev, [missionId]: 'Transmission failed' }))
        return
      }

      setMissionStages((prev) => ({ ...prev, [missionId]: 'sent' }))
      setMissionStatus((prev) => ({ ...prev, [missionId]: 'LOCKED' }))
      handleOpenShare(missionId)

      if (data?.progress?.missions) {
        onProgressUpdate({
          ...data.progress,
          token: data.progress.token || tokenValue,
        })
      }
    } catch {
      setMissionStatus((prev) => ({ ...prev, [missionId]: 'ERROR' }))
      setMissionStages((prev) => ({ ...prev, [missionId]: 'idle' }))
      setMissionErrors((prev) => ({ ...prev, [missionId]: 'Transmission failed' }))
    }
  }

  const getSubmitLabel = (missionId: MissionId, label: string) => {
    const stage = missionStages[missionId]
    if (stage === 'encrypting') {
      return 'Encrypting…'
    }
    if (stage === 'uploading') {
      return 'Uploading…'
    }
    if (stage === 'sent') {
      return 'TRANSMISSION COMPLETE'
    }
    return label
  }

  const isMissionDisabled = (missionId: MissionId) =>
    missionStatus[missionId] === 'SENDING' || missionStatus[missionId] === 'LOCKED'

  const showMissionError = (missionId: MissionId) =>
    hasAttempted[missionId] && missionErrors[missionId]

  return (
    <>
      <form className='mission-form' onSubmit={(event: FormEvent<HTMLFormElement>) => event.preventDefault()}>
        <div className='mission-grid'>
        <MissionCard
          label='Mission 1'
          title='Shape Assessment'
          description='Your first impression matters.'
          requirements={
            <ul className='requirements-list'>
              <li>Submission required to maintain Agent status</li>
              <li>Minimum 25 words</li>
            </ul>
          }
          status={missionStatus.m1}
        >
          <div className='field'>
            <label htmlFor='mission1_feel'>
              Describe the Arachnid’s form, fit, and geometry, then assess expected pre-flight
              behavior—how you think it will fly. Text-only submission. Min 25 words.
            </label>
            <textarea
              id='mission1_feel'
              name='mission1_feel'
              placeholder='Grip, shape, feel...'
              value={mission1Feel}
              onChange={(event) => {
                setMission1Feel(event.target.value)
                updateMissionTouched('m1')
              }}
              disabled={isMissionDisabled('m1')}
              aria-invalid={hasAttempted.m1 && Boolean(missionErrors.m1)}
              className={hasAttempted.m1 && missionErrors.m1 ? 'field-error' : undefined}
            />
            {hasAttempted.m1 && missionErrors.m1 && (
              <span className='field-message'>{missionErrors.m1}</span>
            )}
          </div>
          <div className='field'>
            <div className='field-row'>
              <label htmlFor='mission1_feel_rating'>Feel rating</label>
              <span className='range-value'>{mission1FeelRating}</span>
            </div>
            <input
              id='mission1_feel_rating'
              name='mission1_feel_rating'
              type='range'
              min={1}
              max={5}
              step={1}
              value={mission1FeelRating}
              onChange={(event) => {
                setMission1FeelRating(Number(event.target.value))
                updateMissionTouched('m1')
              }}
              disabled={isMissionDisabled('m1')}
            />
            <span className='field-hint'>1 = poor fit, 5 = perfect fit.</span>
          </div>
          {mission1FeelRating <= 2 && (
            <div className='field'>
              <label htmlFor='mission1_feel_note'>Why is the feel poor? (optional)</label>
              <textarea
                id='mission1_feel_note'
                name='mission1_feel_note'
                placeholder='Share what felt off...'
                value={mission1FeelNote}
                onChange={(event) => {
                  setMission1FeelNote(event.target.value)
                  updateMissionTouched('m1')
                }}
                disabled={isMissionDisabled('m1')}
              />
            </div>
          )}
          <div className='mission-actions'>
            <button
              type='button'
              className={`submit${missionStatus.m1 === 'LOCKED' ? ' is-locked' : ''}`}
              disabled={!mission1Ready || isMissionDisabled('m1') || tokenMissing}
              onClick={() => submitMission('m1')}
            >
              {getSubmitLabel('m1', 'Submit Mission 1')}
            </button>
            {missionStatus.m1 === 'LOCKED' && (
              <button type='button' className='mission-edit' onClick={() => handleEdit('m1')}>
                Edit
              </button>
            )}
            {missionStatus.m1 === 'LOCKED' && (
              <button type='button' className='mission-share' onClick={() => handleOpenShare('m1')}>
                Get Share Image
              </button>
            )}
            {missionStatus.m1 === 'LOCKED' && (
              <span className='mission-status-message'>Locked. Transmission received, {codename}.</span>
            )}
            {showMissionError('m1') && missionStatus.m1 === 'ERROR' && (
              <span className='mission-status-message'>
                TRANSMISSION FAILED
                <span className='mission-status-hint'>
                  Retry in a moment. If it persists, refresh the page.
                </span>
              </span>
            )}
            {tokenMissing && (
              <span className='mission-status-message'>Add token to submit.</span>
            )}
          </div>
        </MissionCard>

        <MissionCard
          label='Mission 2'
          title='Flight Test'
          description='Show us how it flies in the wild.'
          award='Award: Maintain Tester Team Status and receive an Arachnid Tester T-shirt in your size.'
          requirements={
            <ul className='requirements-list'>
              <li>Must complete Mission 1 in advance</li>
              <li>Hole must be greater than 200ft</li>
              <li>Published video must be public</li>
              <li>Innova has rights to share on social platforms</li>
              <li>Collab with @innovadiscs, @innovawombat</li>
              <li>Tag all media #innovaarachnid</li>
            </ul>
          }
          status={missionStatus.m2}
        >
          <div className='field'>
            <label htmlFor='mission2_flight'>
              Flight Test Instructions
            </label>
            <ul className='requirements-list'>
              <li>Record a clear flight video</li>
              <li>Include talking head description or voiceover</li>
              <li>Publish to your social channel(s)</li>
              <li>Collab with @innovadiscs, @innovawombat</li>
              <li>Tag #innovaarachnid</li>
            </ul>
            <div className='field-subhead'>How did it fly?</div>
            <textarea
              id='mission2_flight'
              name='mission2_flight'
              placeholder='Expected? Unexpected? Share details.'
              value={mission2Flight}
              onChange={(event) => {
                setMission2Flight(event.target.value)
                updateMissionTouched('m2')
              }}
              disabled={isMissionDisabled('m2')}
              aria-invalid={hasAttempted.m2 && Boolean(missionErrors.m2)}
              className={hasAttempted.m2 && missionErrors.m2 ? 'field-error' : undefined}
            />
          </div>
          <div className='field'>
            <div className='field-row'>
              <label htmlFor='mission2_flight_rating'>Flight rating</label>
              <span className='range-value'>{mission2FlightRating}</span>
            </div>
            <input
              id='mission2_flight_rating'
              name='mission2_flight_rating'
              type='range'
              min={1}
              max={5}
              step={1}
              value={mission2FlightRating}
              onChange={(event) => {
                setMission2FlightRating(Number(event.target.value))
                updateMissionTouched('m2')
              }}
              disabled={isMissionDisabled('m2')}
            />
            <span className='field-hint'>1 = poor flight, 5 = ideal flight.</span>
          </div>
          {mission2FlightRating <= 2 && (
            <div className='field'>
              <label htmlFor='mission2_flight_note'>Why was the flight poor? (optional)</label>
              <textarea
                id='mission2_flight_note'
                name='mission2_flight_note'
                placeholder='Share what went wrong...'
                value={mission2FlightNote}
                onChange={(event) => {
                  setMission2FlightNote(event.target.value)
                  updateMissionTouched('m2')
                }}
                disabled={isMissionDisabled('m2')}
              />
            </div>
          )}
          <div className='field'>
            <label htmlFor='mission2_video_url'>Published video URL (public)</label>
            <input
              id='mission2_video_url'
              name='mission2_video_url'
              type='url'
              placeholder='https://'
              value={mission2VideoUrl}
              onChange={(event) => {
                setMission2VideoUrl(event.target.value)
                updateMissionTouched('m2')
              }}
              disabled={isMissionDisabled('m2')}
              aria-invalid={hasAttempted.m2 && Boolean(missionErrors.m2)}
              className={hasAttempted.m2 && missionErrors.m2 ? 'field-error' : undefined}
            />
          </div>
          <div className='field'>
            <label htmlFor='mission2_shirt_size'>T-shirt size</label>
            <select
              id='mission2_shirt_size'
              name='mission2_shirt_size'
              value={mission2ShirtSize}
              onChange={(event) => {
                setMission2ShirtSize(event.target.value)
                updateMissionTouched('m2')
              }}
              disabled={isMissionDisabled('m2')}
              aria-invalid={hasAttempted.m2 && Boolean(missionErrors.m2)}
              className={hasAttempted.m2 && missionErrors.m2 ? 'field-error' : undefined}
            >
              <option value=''>Select size</option>
              <option value='XS'>XS</option>
              <option value='S'>S</option>
              <option value='M'>M</option>
              <option value='L'>L</option>
              <option value='XL'>XL</option>
              <option value='2XL'>2XL</option>
            </select>
          </div>
          <div className='mission-toggles'>
            <div className='toggle-field'>
              <div className='toggle-title'>Hole distance was over 200ft</div>
              <div className='toggle-control'>
                <span className='toggle-state'>PENDING</span>
                <label className='toggle-switch'>
                  <input
                    id='mission2_confirm_distance'
                    type='checkbox'
                    checked={mission2ConfirmDistance}
                    onChange={(event) => {
                      setMission2ConfirmDistance(event.target.checked)
                      updateMissionTouched('m2')
                    }}
                    disabled={isMissionDisabled('m2')}
                    aria-label='Hole distance was over 200ft'
                  />
                  <span className='toggle-track'>
                    <span className='toggle-thumb' />
                  </span>
                </label>
                <span className={`toggle-state${mission2ConfirmDistance ? ' is-active' : ''}`}>
                  CLEARED
                </span>
              </div>
            </div>
            <div className='toggle-field'>
              <div className='toggle-title'>I confirm videos are public and Innova may reshare them</div>
              <div className='toggle-control'>
                <span className='toggle-state'>PENDING</span>
                <label className='toggle-switch'>
                  <input
                    id='mission2_confirm_rights'
                    type='checkbox'
                    checked={mission2ConfirmRights}
                    onChange={(event) => {
                      setMission2ConfirmRights(event.target.checked)
                      updateMissionTouched('m2')
                    }}
                    disabled={isMissionDisabled('m2')}
                    aria-label='I confirm videos are public and Innova may reshare them'
                  />
                  <span className='toggle-track'>
                    <span className='toggle-thumb' />
                  </span>
                </label>
                <span className={`toggle-state${mission2ConfirmRights ? ' is-active' : ''}`}>
                  CLEARED
                </span>
              </div>
            </div>
          </div>
          <div className='mission-actions'>
            <span className='submit-label mono'>UPLOAD EVIDENCE</span>
            <button
              type='button'
              className={`submit${missionStatus.m2 === 'LOCKED' ? ' is-locked' : ''}`}
              disabled={!mission2Ready || isMissionDisabled('m2') || tokenMissing}
              onClick={() => submitMission('m2')}
            >
              {getSubmitLabel('m2', 'Submit Mission 2')}
            </button>
            {missionStatus.m2 === 'LOCKED' && (
              <button type='button' className='mission-edit' onClick={() => handleEdit('m2')}>
                Edit
              </button>
            )}
            {missionStatus.m2 === 'LOCKED' && (
              <button type='button' className='mission-share' onClick={() => handleOpenShare('m2')}>
                Get Share Image
              </button>
            )}
            {missionStatus.m2 === 'LOCKED' && (
              <span className='mission-status-message'>Locked. Transmission received, {codename}.</span>
            )}
            {showMissionError('m2') && missionStatus.m2 === 'ERROR' && (
              <span className='mission-status-message'>
                TRANSMISSION FAILED
                <span className='mission-status-hint'>
                  Retry in a moment. If it persists, refresh the page.
                </span>
              </span>
            )}
            {tokenMissing && (
              <span className='mission-status-message'>Add token to submit.</span>
            )}
          </div>
        </MissionCard>

        <MissionCard
          label='Mission 3'
          title='Sharpshooter'
          description='For elite agents only. Score an ace over 200ft. Capture and publish video. Collab with @innovadiscs and @innovawombat. Award: Level 2 Agent uniform (hoodie) and two (2) first-run Arachnids.'
          award='Award: Limited Arachnid Tester Hoodie customized with your full name, plus two first-run Arachnids.'
          requirements={
            <ul className='requirements-list'>
              <li>Must complete Mission 2 in advance</li>
              <li>Hole must be over 200ft</li>
              <li>Published video must be public</li>
              <li>Innova has rights to share on social platforms</li>
              <li>Collab with @innovadiscs, @innovawombat</li>
              <li>Tag #innovaarachnid</li>
              <li>Cannot be same video as Mission 2</li>
            </ul>
          }
          status={missionStatus.m3}
        >
          <div className='field'>
            <label htmlFor='mission3_ace_url'>Ace video URL (public)</label>
            <input
              id='mission3_ace_url'
              name='mission3_ace_url'
              type='url'
              placeholder='https://'
              value={mission3AceUrl}
              onChange={(event) => {
                setMission3AceUrl(event.target.value)
                updateMissionTouched('m3')
              }}
              disabled={isMissionDisabled('m3')}
              aria-invalid={hasAttempted.m3 && Boolean(missionErrors.m3)}
              className={hasAttempted.m3 && missionErrors.m3 ? 'field-error' : undefined}
            />
          </div>
          <div className='field'>
            <label htmlFor='mission3_hoodie_size'>Hoodie size</label>
            <select
              id='mission3_hoodie_size'
              name='mission3_hoodie_size'
              value={mission3HoodieSize}
              onChange={(event) => {
                setMission3HoodieSize(event.target.value)
                updateMissionTouched('m3')
              }}
              disabled={isMissionDisabled('m3')}
              aria-invalid={hasAttempted.m3 && Boolean(missionErrors.m3)}
              className={hasAttempted.m3 && missionErrors.m3 ? 'field-error' : undefined}
            >
              <option value=''>Select size</option>
              <option value='XS'>XS</option>
              <option value='S'>S</option>
              <option value='M'>M</option>
              <option value='L'>L</option>
              <option value='XL'>XL</option>
              <option value='2XL'>2XL</option>
            </select>
          </div>
          <div className='mission-toggles'>
            <div className='toggle-field'>
              <div className='toggle-title'>Hole distance was over 200ft</div>
              <div className='toggle-control'>
                <span className='toggle-state'>PENDING</span>
                <label className='toggle-switch'>
                  <input
                    id='mission3_confirm_distance'
                    type='checkbox'
                    checked={mission3ConfirmDistance}
                    onChange={(event) => {
                      setMission3ConfirmDistance(event.target.checked)
                      updateMissionTouched('m3')
                    }}
                    disabled={isMissionDisabled('m3')}
                    aria-label='Hole distance was over 200ft'
                  />
                  <span className='toggle-track'>
                    <span className='toggle-thumb' />
                  </span>
                </label>
                <span className={`toggle-state${mission3ConfirmDistance ? ' is-active' : ''}`}>
                  CLEARED
                </span>
              </div>
            </div>
            <div className='toggle-field'>
              <div className='toggle-title'>I confirm videos are public and Innova may reshare them</div>
              <div className='toggle-control'>
                <span className='toggle-state'>PENDING</span>
                <label className='toggle-switch'>
                  <input
                    id='mission3_confirm_rights'
                    type='checkbox'
                    checked={mission3ConfirmRights}
                    onChange={(event) => {
                      setMission3ConfirmRights(event.target.checked)
                      updateMissionTouched('m3')
                    }}
                    disabled={isMissionDisabled('m3')}
                    aria-label='I confirm videos are public and Innova may reshare them'
                  />
                  <span className='toggle-track'>
                    <span className='toggle-thumb' />
                  </span>
                </label>
                <span className={`toggle-state${mission3ConfirmRights ? ' is-active' : ''}`}>
                  CLEARED
                </span>
              </div>
            </div>
          </div>
          <div className='mission-actions'>
            <span className='submit-label mono'>UPLOAD EVIDENCE</span>
            <button
              type='button'
              className={`submit${missionStatus.m3 === 'LOCKED' ? ' is-locked' : ''}`}
              disabled={!mission3Ready || isMissionDisabled('m3') || tokenMissing}
              onClick={() => submitMission('m3')}
            >
              {getSubmitLabel('m3', 'Submit Mission 3')}
            </button>
            {missionStatus.m3 === 'LOCKED' && (
              <button type='button' className='mission-edit' onClick={() => handleEdit('m3')}>
                Edit
              </button>
            )}
            {missionStatus.m3 === 'LOCKED' && (
              <button type='button' className='mission-share' onClick={() => handleOpenShare('m3')}>
                Get Share Image
              </button>
            )}
            {missionStatus.m3 === 'LOCKED' && (
              <span className='mission-status-message'>Locked. Transmission received, {codename}.</span>
            )}
            {showMissionError('m3') && missionStatus.m3 === 'ERROR' && (
              <span className='mission-status-message'>
                TRANSMISSION FAILED
                <span className='mission-status-hint'>
                  Retry in a moment. If it persists, refresh the page.
                </span>
              </span>
            )}
            {tokenMissing && (
              <span className='mission-status-message'>Add token to submit.</span>
            )}
          </div>
        </MissionCard>
        </div>

        <div className='honeypot' aria-hidden='true'>
          <label htmlFor='company'>Company</label>
          <input
            id='company'
            name='company'
            type='text'
            value={company}
            onChange={(event) => setCompany(event.target.value)}
            tabIndex={-1}
            autoComplete='off'
          />
        </div>
      </form>
      <MissionSuccessModal
        isOpen={showSuccessModal}
        token={profileToken}
        handle={shareHandle}
        missionNumber={successMeta.missionNumber}
        rank={successMeta.rank}
        onClose={() => setShowSuccessModal(false)}
      />
    </>
  )
}

export default FeedbackForm
