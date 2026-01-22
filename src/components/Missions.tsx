import FeedbackForm from './FeedbackForm'
import useClock from '../hooks/useClock'

type MissionsProps = {
  first: string
  last: string
  fullName: string
  handle: string
  codename: string
}

function Missions({ first, last, fullName, handle, codename }: MissionsProps) {
  const timeLabel = useClock()

  return (
    <section id='missions' className='missions'>
      <div className='mission-log-bar'>
        <div className='container mission-log-inner'>
          <div className='mission-log-left mono'>
            <span>Mission Log — {codename}</span>
            <span className='clearance-tag'>CLEARANCE: TESTER</span>
          </div>
          <div className='mission-log-center mono'>ARACHNID FILE</div>
          <div className='mission-log-right mono'>{timeLabel}</div>
        </div>
      </div>
      <div className='container'>
        <div className='missions-header'>
          <div className='section-label'>Mission Log — {codename}</div>
          <h2>Your Missions</h2>
          <p className='missions-intro'>Codename {codename}, your missions are live.</p>
          <p className='missions-copy'>
            Codename {codename}, complete missions to maintain Tester Team Status and unlock
            rewards.
          </p>
          <p className='missions-awards'>Awards will be issued to {fullName} after verification.</p>
        </div>
        <FeedbackForm
          first={first}
          last={last}
          fullName={fullName}
          handle={handle}
          codename={codename}
        />
      </div>
    </section>
  )
}

export default Missions
