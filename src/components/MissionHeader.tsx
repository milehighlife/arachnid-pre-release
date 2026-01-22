import { forwardRef } from 'react'
import arachnidLogo from '../assets/arachnid-logo.png'

type MissionHeaderProps = {
  codename: string
  timeString: string
  docked: boolean
}

const MissionHeader = forwardRef<HTMLDivElement, MissionHeaderProps>(
  ({ codename, timeString, docked }, ref) => {
    return (
      <div ref={ref} className={`mission-header${docked ? ' is-docked' : ''}`}>
        <div className='container mission-header-inner'>
          <div className='mission-header-logo-wrap' aria-hidden='true'>
            <img src={arachnidLogo} alt='' className='mission-header-logo' />
          </div>
          <div className='mission-header-left'>Mission Log — {codename}</div>
          <div className='mission-header-time mono'>{timeString}</div>
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
