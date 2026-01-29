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
                d='M7.5 14a4.5 4.5 0 1 1 4.24-6H21v3h-2v2h-2v2h-2v2h-3.26A4.5 4.5 0 0 1 7.5 14Z'
                fill='none'
                stroke='currentColor'
                strokeWidth='1.6'
                strokeLinecap='round'
                strokeLinejoin='round'
              />
            </svg>
          </button>
        </div>
      </div>
    </footer>
  )
}

export default Footer
