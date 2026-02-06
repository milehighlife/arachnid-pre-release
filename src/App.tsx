import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import './styles.css'
import Hero from './components/Hero'
import Missions from './components/Missions'
import Footer from './components/Footer'
import useLocalStorageFlag from './hooks/useLocalStorageFlag'
import MissionHeader from './components/MissionHeader'
import useClock from './hooks/useClock'
import IntroGate from './components/IntroGate'
import type { ProgressPayload } from './components/FeedbackForm'
import { getApiUrl } from './utils/api'

type Personalization = {
  first: string
  last: string
  token: string
  handle: string
  firstName: string
  fullName: string
  codename: string
}

const sanitizeToken = (value: string) => value.replace(/^@+/, '').trim()

const getPersonalization = (): Personalization => {
  if (typeof window === 'undefined') {
    return {
      first: '',
      last: '',
      token: '',
      handle: '',
      firstName: 'tester',
      fullName: 'tester',
      codename: '@tester',
    }
  }

  const params = new URLSearchParams(window.location.search)
  const first = (params.get('first') || '').trim()
  const last = (params.get('last') || '').trim()
  const token = (params.get('token') || '').trim()
  const handle = (params.get('handle') || '').trim()
  const tokenTag = sanitizeToken(token)
  const handleTag = sanitizeToken(handle)
  const firstName = first || 'tester'
  const fullName = first && last ? `${first} ${last}` : firstName
  const codename = handleTag
    ? `@${handleTag}`
    : tokenTag
      ? `@${tokenTag}`
      : `@${firstName}`

  return { first, last, token, handle, firstName, fullName, codename }
}

const getAgentStatus = (progress: ProgressPayload | null) => {
  const m1Locked = progress?.missions?.m1?.status === 'LOCKED'
  const m2Locked = progress?.missions?.m2?.status === 'LOCKED'
  const m3Locked = progress?.missions?.m3?.status === 'LOCKED'

  if (m3Locked) {
    return 'Tier One'
  }
  if (m2Locked) {
    return 'Operator'
  }
  if (m1Locked) {
    return 'Qualified'
  }
  return 'Candidate'
}

function App() {
  const personalization = useMemo(getPersonalization, [])
  const [briefingSeen, setBriefingSeen] = useLocalStorageFlag('arachnid_briefing_seen')
  const [showBriefing, setShowBriefing] = useState(false)
  const [showHeader, setShowHeader] = useState(false)
  const [headerHeight, setHeaderHeight] = useState(0)
  const [progress, setProgress] = useState<ProgressPayload | null>(null)
  const [introAccepted, setIntroAccepted] = useState(false)
  const [statusLoaded, setStatusLoaded] = useState(!personalization.token)
  const [introDismissed, setIntroDismissed] = useState(!personalization.token)
  const headerRef = useRef<HTMLDivElement | null>(null)
  const missionEndRef = useRef<HTMLDivElement | null>(null)
  const timeLabel = useClock()
  const agentToken = sanitizeToken(personalization.token) || personalization.firstName
  const agentStatus = getAgentStatus(progress)
  const mission1Locked = progress?.missions?.m1?.status === 'LOCKED'
  const missionCount = ['m1', 'm2', 'm3'].filter(
    (key) => progress?.missions?.[key as keyof ProgressPayload['missions']]?.status === 'LOCKED',
  ).length

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
    document.title = 'Confidential: Arachnid Agents Only'
  }, [])

  useEffect(() => {
    if (!showHeader) {
      setHeaderHeight(0)
      return
    }

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
  }, [showHeader])

  useEffect(() => {
    const node = missionEndRef.current
    if (!node || typeof window === 'undefined' || !('IntersectionObserver' in window)) {
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        if (!entry) {
          return
        }
        const isPastMissions = entry.boundingClientRect.top < 0 && !entry.isIntersecting
        setShowHeader(isPastMissions)
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
      const visitToken = sanitizeToken(personalization.handle) || 'tester'
      if (visitToken) {
        const params = new URLSearchParams()
        params.set('token', visitToken)
        if (personalization.first) {
          params.set('first', personalization.first)
        }
        if (personalization.last) {
          params.set('last', personalization.last)
        }
        if (personalization.handle) {
          params.set('handle', personalization.handle)
        }
        fetch(`${getApiUrl('/api/status')}?${params.toString()}`).catch(() => {})
      }
      setProgress(null)
      setIntroAccepted(false)
      setIntroDismissed(false)
      setStatusLoaded(true)
      return
    }

    let active = true
    setStatusLoaded(false)
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
    fetch(`${getApiUrl('/api/status')}?${params.toString()}`)
      .then((response) => response.json())
      .then((data) => {
        if (!active) {
          return
        }
        if (data?.ok && data.progress) {
          setProgress({ ...data.progress, token })
          setIntroAccepted(Boolean(data.progress.introAccepted))
          if (data.progress.introAccepted) {
            setIntroDismissed(true)
          }
          setStatusLoaded(true)
          return
        }
        setIntroAccepted(false)
        setIntroDismissed(false)
        setStatusLoaded(true)
      })
      .catch(() => {
        if (active) {
          setProgress(null)
          setIntroAccepted(false)
          setIntroDismissed(false)
          setStatusLoaded(true)
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

  const handleIntroAccepted = () => {
    setIntroAccepted(true)
    setIntroDismissed(true)
    setProgress((current) =>
      current
        ? { ...current, introAccepted: true, introAcceptedAt: new Date().toISOString() }
        : current,
    )
  }

  const handleIntroReset = async () => {
    if (!personalization.token) {
      return
    }
    try {
      const response = await fetch(getApiUrl('/api/intro-reset'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: personalization.token }),
      })
      const data = (await response.json()) as { ok?: boolean }
      if (!response.ok || !data?.ok) {
        return
      }
      setIntroAccepted(false)
      setProgress((current) =>
        current ? { ...current, introAccepted: false, introAcceptedAt: null } : current,
      )
    } catch {
      return
    }
  }

  if (personalization.token && !statusLoaded) {
    return (
      <div className='intro-loading'>
        <div className='intro-loading-text'>Establishing secure channel…</div>
      </div>
    )
  }

  const showIntro = !introDismissed && (!personalization.token || !introAccepted)

  if (showIntro) {
    return (
      <IntroGate
        token={personalization.token || undefined}
        codename={personalization.codename}
        onAccepted={handleIntroAccepted}
      />
    )
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
      <Hero
        firstName={personalization.firstName}
        agentToken={agentToken}
        agentStatus={agentStatus}
        missionCount={missionCount}
        showCta={!mission1Locked}
      />
      <section className='hatch-band' aria-hidden='true'>
        <div className='hatch-text'>
          {Array.from({ length: 8 }).map((_, index) => (
            <span key={index}>THROW YOUR BEST</span>
          ))}
        </div>
      </section>
      <AnimatePresence>
        {showHeader && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
          >
            <MissionHeader
              ref={headerRef}
              codename={personalization.codename}
              timeString={timeLabel}
              docked
            />
          </motion.div>
        )}
      </AnimatePresence>
      {!personalization.token && (
        <div className='token-banner'>
          <div className='container'>Missing token. Progress won’t save.</div>
        </div>
      )}
      <main className='main' style={{ paddingTop: showHeader ? headerHeight : 0 }}>
        <Missions
          first={personalization.first}
          last={personalization.last}
          fullName={personalization.fullName}
          token={personalization.token}
          handle={personalization.handle}
          progress={progress}
          onProgressUpdate={setProgress}
          codename={personalization.codename}
        />
        <div ref={missionEndRef} className='mission-header-sentinel' aria-hidden='true' />
      </main>
      <section className='hatch-band' aria-hidden='true'>
        <div className='hatch-text'>
          {Array.from({ length: 8 }).map((_, index) => (
            <span key={index}>THROW YOUR BEST</span>
          ))}
        </div>
      </section>
      <Footer
        introAccepted={introAccepted}
        canReset={Boolean(personalization.token)}
        onResetIntro={handleIntroReset}
      />
    </div>
  )
}

export default App
