function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className='footer'>
      <div className='container footer-inner'>
        <span>© {year} Pre-Release Arachnid. All rights reserved.</span>
        <span>Crafted for confident field testing.</span>
      </div>
    </footer>
  )
}

export default Footer
