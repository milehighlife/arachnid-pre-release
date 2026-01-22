import { useMemo } from 'react'
import './styles.css'
import Hero from './components/Hero'
import FeedbackSection from './components/Section'
import Footer from './components/Footer'

type Personalization = {
  first: string
  last: string
  firstName: string
  fullName: string
}

const getPersonalization = (): Personalization => {
  if (typeof window === 'undefined') {
    return {
      first: '',
      last: '',
      firstName: 'tester',
      fullName: 'tester',
    }
  }

  const params = new URLSearchParams(window.location.search)
  const first = (params.get('first') || '').trim()
  const last = (params.get('last') || '').trim()
  const firstName = first || 'tester'
  const fullName = first && last ? `${first} ${last}` : firstName

  return { first, last, firstName, fullName }
}

function App() {
  const personalization = useMemo(getPersonalization, [])

  return (
    <div className='page'>
      <Hero firstName={personalization.firstName} />
      <FeedbackSection
        first={personalization.first}
        last={personalization.last}
        firstName={personalization.firstName}
        fullName={personalization.fullName}
      />
      <Footer />
    </div>
  )
}

export default App
