import { motion } from 'framer-motion'

type HeroProps = {
  firstName: string
}

const pngAssets = import.meta.glob('../assets/arachnid-logo.png', { eager: true, as: 'url' })
const svgAssets = import.meta.glob('../assets/arachnid.svg', { eager: true, as: 'url' })

const arachnidPng = Object.values(pngAssets)[0] as string | undefined
const arachnidSvg = Object.values(svgAssets)[0] as string | undefined

function Hero({ firstName }: HeroProps) {
  return (
    <section className='hero'>
      <div className='container hero-grid'>
        <div className='hero-copy'>
          <div className='hero-eyebrow'>Hey, {firstName}</div>
          <h1 className='hero-title'>Pre-Release Arachnid</h1>
          <p className='hero-subhead'>Fast, stable mid-range. Built for real-world testing.</p>
          <div className='flight-row'>
            <span className='flight-label'>Flight</span>
            <span className='flight-values'>5 | 6 | -1 | 1</span>
          </div>
          <p className='hero-line'>Pre-release made for you, the tester.</p>
          <p className='hero-personal'>{firstName}, you're the tester.</p>
          <div className='hero-actions'>
            <motion.a
              className='cta'
              href='#feedback'
              whileHover={{ y: -2 }}
              whileTap={{ y: 0 }}
            >
              Share flight feedback
            </motion.a>
            <a className='cta-secondary' href='#feedback'>
              Jump to the form
            </a>
          </div>
        </div>
        <div className='hero-media'>
          <div className='disc-wrap'>
            {arachnidPng ? (
              <motion.img
                src={arachnidPng}
                alt='Arachnid pre-release disc'
                className='disc-image'
                animate={{ rotate: 360, y: [0, -10, 0] }}
                transition={{
                  rotate: { duration: 36, repeat: Infinity, ease: 'linear' },
                  y: { duration: 7, repeat: Infinity, repeatType: 'mirror', ease: 'easeInOut' },
                }}
              />
            ) : (
              <div className='asset-placeholder disc-placeholder' role='img' aria-label='Disc placeholder'>
                {/* TODO: Add src/assets/arachnid-logo.png */}
                <span>Disc image placeholder</span>
              </div>
            )}
          </div>
          <div className='accent-wrap'>
            {arachnidSvg ? (
              <motion.img
                src={arachnidSvg}
                alt='Arachnid accent graphic'
                className='accent-image'
                animate={{ y: [0, 6, 0], rotate: [0, 1.5, 0] }}
                transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
              />
            ) : (
              <div className='asset-placeholder accent-placeholder' role='img' aria-label='Accent placeholder'>
                {/* TODO: Add src/assets/arachnid.svg */}
                <span>Accent placeholder</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

export default Hero
