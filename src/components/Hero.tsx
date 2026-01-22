import { motion } from 'framer-motion'
import arachnidLogo from '../assets/arachnid-logo.png'

type HeroProps = {
  firstName: string
}

function Hero({ firstName }: HeroProps) {
  return (
    <section className='hero'>
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
          <div className='hero-eyebrow'>Mission Briefing</div>
          <p className='hero-greeting'>Hey, {firstName}</p>
          <h1 className='hero-title'>Pre-Release Arachnid</h1>
          <p className='hero-subhead'>
            Low-profile, high-glide, stable mid-range weapon. Secondary role: sidearm approach.
          </p>
          <div className='flight-row'>
            <span className='flight-label'>Flight Numbers</span>
            <span className='flight-values'>5 | 6 | -1 | 1</span>
          </div>
          <p className='hero-line'>Pre-release made for you, the tester.</p>
          <p className='hero-friendly'>Stay sharp, {firstName}. Log every flight detail.</p>
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
        </div>
      </div>
    </section>
  )
}

export default Hero
