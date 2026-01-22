import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import './styles.css'
import Hero from './components/Hero'
import Missions from './components/Missions'
import Footer from './components/Footer'
import useLocalStorageFlag from './hooks/useLocalStorageFlag'

type Personalization = {
  first: string
  last: string
  handle: string
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
  const firstName = first || 'tester'
  const fullName = first && last ? `${first} ${last}` : firstName
  const codename = handle ? `@${handle}` : `@${firstName}`

  return { first, last, handle, firstName, fullName, codename }
}

function App() {
  const personalization = useMemo(getPersonalization, [])
  const [briefingSeen, setBriefingSeen] = useLocalStorageFlag('arachnid_briefing_seen')
  const [showBriefing, setShowBriefing] = useState(false)

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
      <Missions
        first={personalization.first}
        last={personalization.last}
        fullName={personalization.fullName}
        handle={personalization.handle}
        codename={personalization.codename}
      />
      <Footer />
    </div>
  )
}

export default App
