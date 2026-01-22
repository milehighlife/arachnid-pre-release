import type { ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import useInView from '../hooks/useInView'

export type MissionStatus =
  | 'NOT STARTED'
  | 'IN PROGRESS'
  | 'READY'
  | 'SENDING'
  | 'LOCKED'
  | 'ERROR'

type MissionCardProps = {
  label: string
  title: string
  description: string
  award: string
  requirements: string
  status: MissionStatus
  children: ReactNode
}

const statusTone = (status: MissionStatus) => {
  if (status === 'READY') {
    return 'ready'
  }
  if (status === 'LOCKED') {
    return 'locked'
  }
  if (status === 'SENDING') {
    return 'sending'
  }
  if (status === 'ERROR') {
    return 'error'
  }
  if (status === 'IN PROGRESS') {
    return 'progress'
  }
  return 'idle'
}

function MissionCard({
  label,
  title,
  description,
  award,
  requirements,
  status,
  children,
}: MissionCardProps) {
  const { ref, inView } = useInView<HTMLElement>({ threshold: 0.2 })
  const tone = statusTone(status)

  return (
    <motion.article
      ref={ref}
      className='mission-card'
      initial={{ opacity: 0, y: 20 }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
    >
      <div className='mission-card-header'>
        <div className='mission-label'>{label}</div>
        <AnimatePresence mode='wait'>
          <motion.div
            key={status}
            className={`mission-chip mission-chip--${tone}`}
            initial={{ opacity: 0, scale: 1 }}
            animate={{ opacity: 1, scale: [1, 1.03, 1] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
          >
            <motion.span
              key={status}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.18 }}
            >
              {status}
            </motion.span>
          </motion.div>
        </AnimatePresence>
      </div>
      <h3 className='mission-title'>{title}</h3>
      <p className='mission-description'>{description}</p>
      <div className='mission-fields'>{children}</div>
      <div className='mission-award'>
        <span className='mission-award-label'>Award</span>
        <p>{award}</p>
      </div>
      <div className='mission-requirements'>
        <span className='mission-req-label'>Requirements</span>
        <p className='requirementsText'>{requirements}</p>
      </div>
    </motion.article>
  )
}

export default MissionCard
