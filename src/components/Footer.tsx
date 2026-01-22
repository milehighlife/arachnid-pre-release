function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className='footer'>
      <div className='container footer-inner'>
        <span>© {year} Pre-Release Arachnid Mission Control.</span>
        <span>Transmission channel secured for testers.</span>
      </div>
    </footer>
  )
}

export default Footer
