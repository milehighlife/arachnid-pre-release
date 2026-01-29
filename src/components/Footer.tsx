type FooterProps = {
  introAccepted: boolean
  canReset: boolean
  onResetIntro: () => void
}

function Footer({ introAccepted, canReset, onResetIntro }: FooterProps) {
  const year = new Date().getFullYear()
  const keyClass = introAccepted ? 'footer-key is-red' : 'footer-key is-green'

  return (
    <footer className='footer'>
      <div className='container footer-inner'>
        <span>© {year} Pre-Release Arachnid Mission Control.</span>
        <div className='footer-channel'>
          <span>Transmission channel secured for testers.</span>
          <button
            type='button'
            className={keyClass}
            onClick={onResetIntro}
            disabled={!canReset}
            aria-label='Reset intro video'
          >
            <svg viewBox='0 0 24 24' aria-hidden='true'>
              <path
                d='M6 11a6 6 0 0 1 12 0'
                fill='none'
                stroke='currentColor'
                strokeWidth='1.6'
                strokeLinecap='round'
              />
              <path
                d='M9 11a3 3 0 0 1 6 0'
                fill='none'
                stroke='currentColor'
                strokeWidth='1.6'
                strokeLinecap='round'
              />
              <path
                d='M6 14v2a4 4 0 0 0 8 0v-2'
                fill='none'
                stroke='currentColor'
                strokeWidth='1.6'
                strokeLinecap='round'
              />
              <path
                d='M14 14v1a2 2 0 0 0 4 0v-1'
                fill='none'
                stroke='currentColor'
                strokeWidth='1.6'
                strokeLinecap='round'
              />
            </svg>
          </button>
        </div>
      </div>
    </footer>
  )
}

export default Footer
