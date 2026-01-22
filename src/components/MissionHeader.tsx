import { forwardRef } from 'react'
import arachnidLogo from '../assets/arachnid-logo.png'
import useSessionTimer from '../hooks/useSessionTimer'

type MissionHeaderProps = {
  codename: string
  timeString: string
  docked: boolean
}

const MissionHeader = forwardRef<HTMLDivElement, MissionHeaderProps>(
  ({ codename, timeString, docked }, ref) => {
    const sessionTime = useSessionTimer()
    return (
      <div ref={ref} className={`mission-header${docked ? ' is-docked' : ''}`}>
        <div className='container mission-header-inner'>
          <div className='mission-header-logo-wrap' aria-hidden='true'>
            <img src={arachnidLogo} alt='' className='mission-header-logo' />
          </div>
          <div className='mission-header-left'>
            <span className='mission-header-title'>Mission Log — {codename}</span>
            <span className='mission-header-clearance mono'>CLEARANCE VERIFIED</span>
          </div>
          <div className='mission-header-time mono'>
            <span>{timeString}</span>
            <span className='session-indicator'>
              <span className='session-dot' aria-hidden='true' />
              <span className='mono'>SESSION ACTIVE</span>
              <span className='session-time mono'>{sessionTime}</span>
            </span>
          </div>
          <div className='mission-header-center'>
            <span className='clearance-tag'>CLEARANCE: TESTER</span>
            <span className='mission-header-file mono'>ARACHNID FILE</span>
          </div>
        </div>
      </div>
    )
  },
)

MissionHeader.displayName = 'MissionHeader'

export default MissionHeader
