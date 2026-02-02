import { motion } from 'framer-motion'
import arachnidLogo from '../assets/arachnid-logo.png'

type HeroProps = {
  firstName: string
  agentToken: string
  agentStatus: string
  showCta: boolean
}

function Hero({ firstName, agentToken, agentStatus, showCta }: HeroProps) {
  return (
    <section className='hero'>
      <motion.div
        className='confidential-banner'
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.24, ease: 'easeOut' }}
      >
        <div className='container confidential-banner-inner'>
          <span>CONFIDENTIAL • ENCRYPTED</span>
        </div>
      </motion.div>
      <div className='container hero-grid'>
        <div className='hero-visual'>
          <div className='disc-shell'>
            <motion.img
              src={arachnidLogo}
              alt='Arachnid pre-release disc'
              className='disc-image'
              animate={{ y: [0, -8, 0], scale: [1, 1.03, 1] }}
              transition={{
                y: { duration: 8, repeat: Infinity, repeatType: 'mirror', ease: 'easeInOut' },
                scale: { duration: 4, repeat: Infinity, ease: 'easeInOut' },
              }}
            />
            <span className='disc-scan' aria-hidden='true' />
          </div>
        </div>
        <div className='hero-copy'>
          <div className='hero-briefing-block'>
            <div className='hero-eyebrow'>Mission Briefing</div>
            <div className='hero-agent-stack'>
              <div className='hero-agent-chip'>
                <span className='hero-agent-chip-label'>Agent</span>
                <span className='hero-agent-chip-value'>{agentToken || firstName}</span>
              </div>
              <div className='hero-agent-chip'>
                <div className='hero-agent-chip-header'>
                  <span className='hero-agent-chip-label'>Current Rank</span>
                  <div className='hero-rank-track' aria-hidden='true'>
                    <span className='hero-rank-dot' />
                    <span className='hero-rank-dot' />
                    <span className='hero-rank-dot' />
                    <span className='hero-rank-track-text'>3-stage track</span>
                  </div>
                </div>
                <span className='hero-agent-chip-value'>{agentStatus}</span>
              </div>
            </div>
          </div>
          <h1 className='hero-title'>Pre-Release Arachnid</h1>
          <p className='hero-subheading'>MISSION INTEL:</p>
          <ul className='hero-bullets'>
            <li>Low-profile, high-glide, stable mid-range</li>
            <li>Flight Numbers: 5, 6, -1, 1</li>
            <li>Pre-release variant</li>
            <li>Production release this March/April</li>
            <li>Collab with @innovadiscs, @innovawombat</li>
            <li>Tag all media #innovaarachnid</li>
          </ul>
          <p className='hero-intro'>
            Mission Package: Use your skills for Arachnid field testing missions. Publish and
            collab your findings. Maintain agent status, level up with agent Arachnid gear. Your
            mission briefings are below.
          </p>
          <p className='hero-intro'>
            Cypher Access: Tap your mission patch to return to this page and submit intel.
          </p>
          <p className='hero-goodluck'>Good luck!</p>
          {showCta && (
            <div className='hero-actions'>
              <motion.a
                className='cta'
                href='#missions'
                whileHover={{ y: -2 }}
                whileTap={{ y: 0 }}
              >
                Start Missions
              </motion.a>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

export default Hero
