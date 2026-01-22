import { useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import MissionCard, { type MissionStatus } from './MissionCard'

type FeedbackFormProps = {
  first: string
  last: string
  fullName: string
  handle: string
  codename: string
}

type Status = 'idle' | 'sending' | 'sent' | 'error'

type SubmitStage = 'idle' | 'encrypting' | 'uploading' | 'sent'

type ErrorMap = Record<string, string>

const createToken = () => {
  if (typeof crypto !== 'undefined' && 'getRandomValues' in crypto) {
    const bytes = new Uint8Array(16)
    crypto.getRandomValues(bytes)
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
  }

  return `${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`
}

const isHttpUrl = (value: string) => value.startsWith('http')

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

function FeedbackForm({ first, last, fullName, handle, codename }: FeedbackFormProps) {
  const token = useMemo(() => createToken().slice(0, 32), [])
  const timeoutsRef = useRef<number[]>([])
  const [mission1Feel, setMission1Feel] = useState('')
  const [mission2Flight, setMission2Flight] = useState('')
  const [mission2VideoUrl, setMission2VideoUrl] = useState('')
  const [mission2ShirtSize, setMission2ShirtSize] = useState('')
  const [mission3AceUrl, setMission3AceUrl] = useState('')
  const [mission3HoodieSize, setMission3HoodieSize] = useState('')
  const [confirmDistance200, setConfirmDistance200] = useState(false)
  const [confirmRights, setConfirmRights] = useState(false)
  const [company, setCompany] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [submitStage, setSubmitStage] = useState<SubmitStage>('idle')
  const [errors, setErrors] = useState<ErrorMap>({})
  const [hasSubmitted, setHasSubmitted] = useState(false)
  const [serverError, setServerError] = useState('')

  const isDisabled = status === 'sending' || status === 'sent'

  const mission1Active = mission1Feel.trim().length > 0
  const mission2Active =
    mission2Flight.trim().length > 0 ||
    mission2VideoUrl.trim().length > 0 ||
    mission2ShirtSize.trim().length > 0
  const mission3Active = mission3AceUrl.trim().length > 0 || mission3HoodieSize.trim().length > 0
  const confirmationsRequired = mission2Active || mission3Active

  const mission1Ready = mission1Feel.trim().length >= 10
  const mission2Ready =
    mission2Flight.trim().length >= 10 &&
    isHttpUrl(mission2VideoUrl.trim()) &&
    Boolean(mission2ShirtSize.trim()) &&
    confirmDistance200 &&
    confirmRights
  const mission3Ready =
    isHttpUrl(mission3AceUrl.trim()) &&
    Boolean(mission3HoodieSize.trim()) &&
    confirmDistance200 &&
    confirmRights

  const submissionSuccess = status === 'sent'

  const mission1Status: MissionStatus = submissionSuccess && mission1Active
    ? 'LOCKED'
    : mission1Ready
      ? 'READY'
      : mission1Active
        ? 'IN PROGRESS'
        : 'NOT STARTED'

  const mission2Status: MissionStatus = submissionSuccess && mission2Active
    ? 'LOCKED'
    : mission2Ready
      ? 'READY'
      : mission2Active
        ? 'IN PROGRESS'
        : 'NOT STARTED'

  const mission3Status: MissionStatus = submissionSuccess && mission3Active
    ? 'LOCKED'
    : mission3Ready
      ? 'READY'
      : mission3Active
        ? 'IN PROGRESS'
        : 'NOT STARTED'

  const missionSteps = [
    { label: 'Mission 1', status: mission1Status },
    { label: 'Mission 2', status: mission2Status },
    { label: 'Mission 3', status: mission3Status },
  ]

  const handleSubmitStage = (stage: SubmitStage) => {
    setSubmitStage(stage)
  }

  const clearStageTimers = () => {
    timeoutsRef.current.forEach((timer) => window.clearTimeout(timer))
    timeoutsRef.current = []
  }

  useEffect(() => {
    return () => {
      clearStageTimers()
    }
  }, [])

  const validate = () => {
    const nextErrors: ErrorMap = {}

    if (mission1Active) {
      const length = mission1Feel.trim().length
      if (length < 10 || length > 2000) {
        nextErrors.mission1_feel = 'Mission 1 notes must be 10-2000 characters.'
      }
    }

    if (mission2Active) {
      const flightLength = mission2Flight.trim().length
      if (!mission2Flight.trim()) {
        nextErrors.mission2_flight = 'Provide flight details to complete Mission 2.'
      } else if (flightLength < 10) {
        nextErrors.mission2_flight = 'Mission 2 flight notes must be at least 10 characters.'
      }
      if (!mission2VideoUrl.trim()) {
        nextErrors.mission2_video_url = 'Add a public video URL for Mission 2.'
      } else if (!isHttpUrl(mission2VideoUrl.trim())) {
        nextErrors.mission2_video_url = 'Video URL must start with http.'
      }
      if (!mission2ShirtSize.trim()) {
        nextErrors.mission2_shirt_size = 'Select a T-shirt size.'
      }
    }

    if (mission3Active) {
      if (!mission3AceUrl.trim()) {
        nextErrors.mission3_ace_url = 'Add a public ace video URL.'
      } else if (!isHttpUrl(mission3AceUrl.trim())) {
        nextErrors.mission3_ace_url = 'Ace URL must start with http.'
      }
      if (!mission3HoodieSize.trim()) {
        nextErrors.mission3_hoodie_size = 'Select a hoodie size.'
      }
    }

    if (confirmationsRequired) {
      if (!confirmDistance200) {
        nextErrors.confirm_distance = 'Confirm the hole distance.'
      }
      if (!confirmRights) {
        nextErrors.confirm_rights = 'Confirm video permissions.'
      }
    }

    if (company.trim()) {
      nextErrors.company = 'Unable to submit. Please clear the hidden field.'
    }

    return nextErrors
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (status === 'sending') {
      return
    }

    setHasSubmitted(true)
    setServerError('')

    const nextErrors = validate()
    setErrors(nextErrors)

    if (Object.keys(nextErrors).length > 0) {
      setStatus('error')
      handleSubmitStage('idle')
      return
    }

    setStatus('sending')
    handleSubmitStage('encrypting')
    clearStageTimers()
    timeoutsRef.current.push(
      window.setTimeout(() => {
        handleSubmitStage('uploading')
      }, 450),
    )

    const payload = {
      first,
      last,
      fullName,
      handle,
      codename,
      userAgent: typeof navigator === 'undefined' ? 'unknown' : navigator.userAgent,
      timestampISO: new Date().toISOString(),
      pageUrl: typeof window === 'undefined' ? '' : window.location.href,
      mission1: {
        completed: mission1Active,
        feel: mission1Feel.trim(),
      },
      mission2: {
        completed: mission2Active,
        flight: mission2Flight.trim(),
        videoUrl: mission2VideoUrl.trim(),
        shirtSize: mission2ShirtSize.trim(),
        confirmDistance200,
        confirmRights,
      },
      mission3: {
        completed: mission3Active,
        aceUrl: mission3AceUrl.trim(),
        hoodieSize: mission3HoodieSize.trim(),
        confirmDistance200,
        confirmRights,
      },
      honeypot: company.trim(),
    }

    const startTime = Date.now()

    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Feedback-Token': token.padEnd(16, '0'),
        },
        body: JSON.stringify(payload),
      })

      const data = (await response.json().catch(() => null)) as
        | { ok: boolean; error?: string }
        | null

      const elapsed = Date.now() - startTime
      if (elapsed < 900) {
        await sleep(900 - elapsed)
      }

      if (!response.ok || !data?.ok) {
        setStatus('error')
        handleSubmitStage('idle')
        setServerError('Transmission failed')
        return
      }

      handleSubmitStage('sent')
      clearStageTimers()
      timeoutsRef.current.push(
        window.setTimeout(() => {
          setStatus('sent')
        }, 250),
      )
    } catch {
      setStatus('error')
      handleSubmitStage('idle')
      setServerError('Transmission failed')
    }
  }

  const submitLabel =
    submitStage === 'encrypting'
      ? 'Encrypting…'
      : submitStage === 'uploading'
        ? 'Uploading…'
        : submitStage === 'sent'
          ? 'Sent'
          : 'Submit Mission Log'

  return (
    <form className='mission-form' onSubmit={handleSubmit}>
      <div className='mission-layout'>
        <div className='mission-tracker'>
          {missionSteps.map((step, index) => {
            const isComplete = step.status === 'READY' || step.status === 'LOCKED'
            return (
              <div className='mission-step' key={step.label}>
                <div className={`mission-step-dot${isComplete ? ' is-complete' : ''}`} />
                <div className='mission-step-text'>
                  <span className='mission-step-label'>{step.label}</span>
                </div>
                {index < missionSteps.length - 1 && <div className='mission-step-line' />}
              </div>
            )
          })}
        </div>

        <div className='mission-grid'>
          <MissionCard
            label='Mission 1'
            title='Tell Us How the Disc Feels'
            description='Your first impression matters.'
            award='Optional mission to help refine the final feel.'
            requirements='Optional, but encouraged. 10-2000 characters if provided.'
            status={mission1Status}
          >
            <div className='field'>
              <label htmlFor='mission1_feel'>Describe the shape and feel of the disc in hand.</label>
              <textarea
                id='mission1_feel'
                name='mission1_feel'
                placeholder='Grip, dome, and plastic feel...'
                value={mission1Feel}
                onChange={(event) => setMission1Feel(event.target.value)}
                disabled={isDisabled}
                aria-invalid={hasSubmitted && Boolean(errors.mission1_feel)}
                className={hasSubmitted && errors.mission1_feel ? 'field-error' : undefined}
              />
              {hasSubmitted && errors.mission1_feel && (
                <span className='field-message'>{errors.mission1_feel}</span>
              )}
            </div>
          </MissionCard>

          <MissionCard
            label='Mission 2'
            title='Share How the Arachnid Flew'
            description='Show us how it flies in the wild.'
            award='Award: Maintain Tester Team Status and receive an Arachnid Tester T-shirt in your size.'
            requirements='Requirements: Hole must be over 200ft. Video must be public. Innova has rights to reshare video on social platforms.'
            status={mission2Status}
          >
            <div className='field'>
              <label htmlFor='mission2_flight'>Describe how it flew.</label>
              <textarea
                id='mission2_flight'
                name='mission2_flight'
                placeholder='Expected? Unexpected? Share details.'
                value={mission2Flight}
                onChange={(event) => setMission2Flight(event.target.value)}
                disabled={isDisabled}
                aria-invalid={hasSubmitted && Boolean(errors.mission2_flight)}
                className={hasSubmitted && errors.mission2_flight ? 'field-error' : undefined}
              />
              {hasSubmitted && errors.mission2_flight && (
                <span className='field-message'>{errors.mission2_flight}</span>
              )}
            </div>
            <div className='field'>
              <label htmlFor='mission2_video_url'>Published video URL (public)</label>
              <input
                id='mission2_video_url'
                name='mission2_video_url'
                type='url'
                placeholder='https://'
                value={mission2VideoUrl}
                onChange={(event) => setMission2VideoUrl(event.target.value)}
                disabled={isDisabled}
                aria-invalid={hasSubmitted && Boolean(errors.mission2_video_url)}
                className={hasSubmitted && errors.mission2_video_url ? 'field-error' : undefined}
              />
              {hasSubmitted && errors.mission2_video_url && (
                <span className='field-message'>{errors.mission2_video_url}</span>
              )}
            </div>
            <div className='field'>
              <label htmlFor='mission2_shirt_size'>T-shirt size</label>
              <select
                id='mission2_shirt_size'
                name='mission2_shirt_size'
                value={mission2ShirtSize}
                onChange={(event) => setMission2ShirtSize(event.target.value)}
                disabled={isDisabled}
                aria-invalid={hasSubmitted && Boolean(errors.mission2_shirt_size)}
                className={hasSubmitted && errors.mission2_shirt_size ? 'field-error' : undefined}
              >
                <option value=''>Select size</option>
                <option value='XS'>XS</option>
                <option value='S'>S</option>
                <option value='M'>M</option>
                <option value='L'>L</option>
                <option value='XL'>XL</option>
                <option value='2XL'>2XL</option>
              </select>
              {hasSubmitted && errors.mission2_shirt_size && (
                <span className='field-message'>{errors.mission2_shirt_size}</span>
              )}
            </div>
          </MissionCard>

          <MissionCard
            label='Mission 3'
            title='Sharpshooter: Get an Arachnid Ace on Video'
            description='Elite accomplishment.'
            award='Award: Limited Arachnid Tester Hoodie customized with your full name, plus two first-run Arachnids.'
            requirements='Requirements: Hole must be over 200ft. Video must be public. Innova has the rights to share video on social platforms.'
            status={mission3Status}
          >
            <div className='field'>
              <label htmlFor='mission3_ace_url'>Ace video URL (public)</label>
              <input
                id='mission3_ace_url'
                name='mission3_ace_url'
                type='url'
                placeholder='https://'
                value={mission3AceUrl}
                onChange={(event) => setMission3AceUrl(event.target.value)}
                disabled={isDisabled}
                aria-invalid={hasSubmitted && Boolean(errors.mission3_ace_url)}
                className={hasSubmitted && errors.mission3_ace_url ? 'field-error' : undefined}
              />
              {hasSubmitted && errors.mission3_ace_url && (
                <span className='field-message'>{errors.mission3_ace_url}</span>
              )}
            </div>
            <div className='field'>
              <label htmlFor='mission3_hoodie_size'>Hoodie size</label>
              <select
                id='mission3_hoodie_size'
                name='mission3_hoodie_size'
                value={mission3HoodieSize}
                onChange={(event) => setMission3HoodieSize(event.target.value)}
                disabled={isDisabled}
                aria-invalid={hasSubmitted && Boolean(errors.mission3_hoodie_size)}
                className={hasSubmitted && errors.mission3_hoodie_size ? 'field-error' : undefined}
              >
                <option value=''>Select size</option>
                <option value='XS'>XS</option>
                <option value='S'>S</option>
                <option value='M'>M</option>
                <option value='L'>L</option>
                <option value='XL'>XL</option>
                <option value='2XL'>2XL</option>
              </select>
              {hasSubmitted && errors.mission3_hoodie_size && (
                <span className='field-message'>{errors.mission3_hoodie_size}</span>
              )}
            </div>
          </MissionCard>
        </div>
      </div>

      {confirmationsRequired && (
        <div className='mission-confirmations'>
          <div className='mission-confirmations-title'>Authorization toggles</div>
          <div className='toggle-field'>
            <div className='toggle-title'>Hole distance was over 200ft</div>
            <div className='toggle-control'>
              <span className='toggle-state'>PENDING</span>
              <label className='toggle-switch'>
                <input
                  id='confirm_distance'
                  type='checkbox'
                  checked={confirmDistance200}
                  onChange={(event) => setConfirmDistance200(event.target.checked)}
                  disabled={isDisabled}
                  aria-label='Hole distance was over 200ft'
                />
                <span className='toggle-track'>
                  <span className='toggle-thumb' />
                </span>
              </label>
              <span className={`toggle-state${confirmDistance200 ? ' is-active' : ''}`}>
                CLEARED
              </span>
            </div>
            {hasSubmitted && errors.confirm_distance && (
              <span className='field-message'>{errors.confirm_distance}</span>
            )}
          </div>
          <div className='toggle-field'>
            <div className='toggle-title'>I confirm videos are public and Innova may reshare them</div>
            <div className='toggle-control'>
              <span className='toggle-state'>PENDING</span>
              <label className='toggle-switch'>
                <input
                  id='confirm_rights'
                  type='checkbox'
                  checked={confirmRights}
                  onChange={(event) => setConfirmRights(event.target.checked)}
                  disabled={isDisabled}
                  aria-label='I confirm videos are public and Innova may reshare them'
                />
                <span className='toggle-track'>
                  <span className='toggle-thumb' />
                </span>
              </label>
              <span className={`toggle-state${confirmRights ? ' is-active' : ''}`}>CLEARED</span>
            </div>
            {hasSubmitted && errors.confirm_rights && (
              <span className='field-message'>{errors.confirm_rights}</span>
            )}
          </div>
        </div>
      )}

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

      <AnimatePresence>
        {submissionSuccess && (
          <div className='mission-stamp-wrap'>
            <motion.div
              className='mission-stamp'
              initial={{ opacity: 0, scale: 1.25, rotate: -8 }}
              animate={{ opacity: 1, scale: 1, rotate: -12 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
            >
              <span className='mission-stamp-title'>LOCKED</span>
              <span className='mission-stamp-sub'>Mission data secured</span>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className='submit-area' role='status' aria-live='polite'>
        {status === 'sent' ? (
          <div className='submit-success'>
            <strong>Transmission received, {codename}.</strong>
            <span>Thanks, {fullName}. Your mission data is locked in.</span>
          </div>
        ) : (
          <>
            <button type='submit' className='submit' disabled={isDisabled}>
              {submitLabel}
            </button>
            {serverError && <span className='field-message'>{serverError}</span>}
          </>
        )}
      </div>
    </form>
  )
}

export default FeedbackForm
