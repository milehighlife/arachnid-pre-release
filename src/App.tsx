import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import './styles.css'
import Hero from './components/Hero'
import Missions from './components/Missions'
import Footer from './components/Footer'
import useLocalStorageFlag from './hooks/useLocalStorageFlag'
import MissionHeader from './components/MissionHeader'
import useClock from './hooks/useClock'
import type { ProgressPayload } from './components/FeedbackForm'

type Personalization = {
  first: string
  last: string
  handle: string
  token: string
  firstName: string
  fullName: string
  codename: string
}

const sanitizeHandle = (value: string) => value.replace(/^@+/, '').trim()

const getPersonalization = (): Personalization => {
  if (typeof window === 'undefined') {
    return {
      first: '',
      last: '',
      handle: '',
      token: '',
      firstName: 'tester',
      fullName: 'tester',
      codename: '@tester',
    }
  }

  const params = new URLSearchParams(window.location.search)
  const first = (params.get('first') || '').trim()
  const last = (params.get('last') || '').trim()
  const handleRaw = sanitizeHandle(params.get('handle') || '')
  const handle = handleRaw
  const token = (params.get('token') || '').trim()
  const firstName = first || 'tester'
  const fullName = first && last ? `${first} ${last}` : firstName
  const codename = handle ? `@${handle}` : `@${firstName}`

  return { first, last, handle, token, firstName, fullName, codename }
}

function App() {
  const personalization = useMemo(getPersonalization, [])
  const [briefingSeen, setBriefingSeen] = useLocalStorageFlag('arachnid_briefing_seen')
  const [showBriefing, setShowBriefing] = useState(false)
  const [docked, setDocked] = useState(false)
  const [headerHeight, setHeaderHeight] = useState(0)
  const [progress, setProgress] = useState<ProgressPayload | null>(null)
  const headerRef = useRef<HTMLDivElement | null>(null)
  const sentinelRef = useRef<HTMLDivElement | null>(null)
  const timeLabel = useClock()

  useEffect(() => {
    if (briefingSeen) {
      setShowBriefing(false)
      return
    }

    setShowBriefing(true)
    const timer = window.setTimeout(() => {
      setBriefingSeen(true)
      setShowBriefing(false)
    }, 1200)

    return () => {
      window.clearTimeout(timer)
    }
  }, [briefingSeen, setBriefingSeen])

  useEffect(() => {
    const node = headerRef.current
    if (!node || typeof window === 'undefined') {
      return
    }

    const updateHeight = () => {
      setHeaderHeight(node.getBoundingClientRect().height)
    }

    updateHeight()

    if (!('ResizeObserver' in window)) {
      return
    }

    const observer = new ResizeObserver(() => updateHeight())
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const node = sentinelRef.current
    if (!node || typeof window === 'undefined' || !('IntersectionObserver' in window)) {
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        if (!entry) {
          return
        }
        setDocked(!entry.isIntersecting)
      },
      { threshold: 0 },
    )

    observer.observe(node)

    return () => {
      observer.disconnect()
    }
  }, [])

  useEffect(() => {
    const token = personalization.token
    if (!token) {
      setProgress(null)
      return
    }

    let active = true
    const params = new URLSearchParams()
    params.set('token', token)
    if (personalization.first) {
      params.set('first', personalization.first)
    }
    if (personalization.last) {
      params.set('last', personalization.last)
    }
    if (personalization.handle) {
      params.set('handle', personalization.handle)
    }

    fetch(`/api/status?${params.toString()}`)
      .then((response) => response.json())
      .then((data) => {
        if (!active) {
          return
        }
        if (data?.ok && data.progress) {
          setProgress({ ...data.progress, token })
        }
      })
      .catch(() => {
        if (active) {
          setProgress(null)
        }
      })

    return () => {
      active = false
    }
  }, [personalization.first, personalization.handle, personalization.last, personalization.token])

  const handleSkipBriefing = () => {
    setBriefingSeen(true)
    setShowBriefing(false)
  }

  return (
    <div className='page'>
      <AnimatePresence>
        {showBriefing && (
          <motion.div
            className='briefing-overlay'
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <button className='briefing-skip' type='button' onClick={handleSkipBriefing}>
              Skip
            </button>
            <div className='briefing-card'>
              <div className='briefing-label'>SECURE CHANNEL</div>
              <div className='briefing-title'>Initializing mission file…</div>
              <div className='briefing-sub'>Codename {personalization.codename}</div>
              <div className='briefing-progress'>
                <div className='briefing-progress-bar' />
              </div>
              <div className='briefing-final'>Access granted</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <Hero firstName={personalization.firstName} />
      <div ref={sentinelRef} className='mission-header-sentinel' aria-hidden='true' />
      <MissionHeader
        ref={headerRef}
        codename={personalization.codename}
        timeString={timeLabel}
        docked={docked}
      />
      {!personalization.token && (
        <div className='token-banner'>
          <div className='container'>Missing token. Progress won’t save.</div>
        </div>
      )}
      <main className='main' style={{ paddingTop: docked ? headerHeight : 0 }}>
        <Missions
          first={personalization.first}
          last={personalization.last}
          fullName={personalization.fullName}
          handle={personalization.handle}
          token={personalization.token}
          progress={progress}
          onProgressUpdate={setProgress}
          codename={personalization.codename}
        />
      </main>
      <Footer />
    </div>
  )
}

export default App
