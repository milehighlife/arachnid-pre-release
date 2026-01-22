import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { motion } from 'framer-motion'
import useInView from '../hooks/useInView'

type FeedbackSectionProps = {
  first: string
  last: string
  firstName: string
  fullName: string
}

type Status = 'idle' | 'sending' | 'sent' | 'error'

const WORKER_URL = import.meta.env.VITE_WORKER_URL as string | undefined

const createToken = () => {
  if (typeof crypto !== 'undefined' && 'getRandomValues' in crypto) {
    const bytes = new Uint8Array(16)
    crypto.getRandomValues(bytes)
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
  }

  return `${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`
}

function FeedbackSection({ first, last, firstName, fullName }: FeedbackSectionProps) {
  const { ref, inView } = useInView<HTMLElement>({ threshold: 0.2 })
  const token = useMemo(() => createToken().slice(0, 32), [])
  const [message, setMessage] = useState('')
  const [company, setCompany] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState('')

  const isDisabled = status === 'sending' || status === 'sent'

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (status === 'sending') {
      return
    }

    setError('')
    const trimmedMessage = message.trim()
    const trimmedCompany = company.trim()

    if (!WORKER_URL) {
      setStatus('error')
      setError('Missing VITE_WORKER_URL configuration.')
      return
    }

    if (trimmedMessage.length < 10 || trimmedMessage.length > 2000) {
      setStatus('error')
      setError('Message must be between 10 and 2000 characters.')
      return
    }

    if (trimmedCompany) {
      setStatus('error')
      setError('Unable to send feedback. Please try again.')
      return
    }

    setStatus('sending')

    const payload = {
      message: trimmedMessage,
      first,
      last,
      userAgent: typeof navigator === 'undefined' ? 'unknown' : navigator.userAgent,
      timestampISO: new Date().toISOString(),
      company: trimmedCompany,
    }

    try {
      const response = await fetch(WORKER_URL, {
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

      if (!response.ok || !data?.ok) {
        setStatus('error')
        setError(data?.error || 'Unable to send feedback. Please try again.')
        return
      }

      setStatus('sent')
    } catch {
      setStatus('error')
      setError('Network error. Please try again.')
    }
  }

  return (
    <motion.section
      id='feedback'
      ref={ref}
      className='feedback'
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
      transition={{ duration: 0.7, ease: 'easeOut' }}
    >
      <div className='container'>
        <div className='feedback-header'>
          <h2>Tell us how the Arachnid flew.</h2>
          <p>
            {firstName}, we want your most honest notes before final release. Keep it concise or go
            deep.
          </p>
        </div>
        <form className='feedback-form' onSubmit={handleSubmit}>
          <label htmlFor='feedback-message'>How did the Arachnid fly for you?</label>
          <textarea
            id='feedback-message'
            name='message'
            placeholder='Share flight notes, wind reads, and plastic feel...'
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            minLength={10}
            maxLength={2000}
            disabled={isDisabled}
            required
          />
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
          <button type='submit' className='submit' disabled={isDisabled}>
            {status === 'sending' ? 'Sending...' : status === 'sent' ? 'Sent' : 'Send feedback'}
          </button>
          <div className='form-status' role='status' aria-live='polite'>
            {status === 'sent' && <span>Thanks, {fullName}. Feedback sent.</span>}
            {status === 'error' && <span>{error}</span>}
          </div>
        </form>
      </div>
    </motion.section>
  )
}

export default FeedbackSection
