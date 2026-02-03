import { useEffect, useState } from 'react'
import { buildMissionSuccessCardPng } from '../utils/missionShareCard'

type MissionSuccessModalProps = {
  isOpen: boolean
  handle: string
  missionNumber: 1 | 2 | 3
  rank: string
  onClose: () => void
}

type ModalStatus = 'idle' | 'loading' | 'ready' | 'error'

function MissionSuccessModal({ isOpen, handle, missionNumber, rank, onClose }: MissionSuccessModalProps) {
  const [status, setStatus] = useState<ModalStatus>('idle')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [filename, setFilename] = useState<string>('')

  useEffect(() => {
    if (!isOpen) {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
      }
      setPreviewUrl(null)
      setFilename('')
      setStatus('idle')
      return
    }

    let active = true
    setStatus('loading')

    buildMissionSuccessCardPng({ handle, timestamp: new Date(), missionNumber, rank })
      .then(({ blob, filename: nextFilename }) => {
        if (!active) {
          return
        }
        const url = URL.createObjectURL(blob)
        setPreviewUrl((current) => {
          if (current) {
            URL.revokeObjectURL(current)
          }
          return url
        })
        setFilename(nextFilename)
        setStatus('ready')
      })
      .catch(() => {
        if (!active) {
          return
        }
        setStatus('error')
      })

    return () => {
      active = false
    }
  }, [isOpen, handle, missionNumber, rank])

  useEffect(() => {
    if (!isOpen) {
      return
    }
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [isOpen])

  if (!isOpen) {
    return null
  }

  const downloadReady = status === 'ready' && Boolean(previewUrl)

  return (
    <div className='mission-success-overlay' role='dialog' aria-modal='true'>
      <div className='mission-success-modal'>
        <div className='mission-success-confidential mono'>CONFIDENTIAL</div>
        {status === 'loading' && (
          <div className='mission-success-loading'>Generating mission file…</div>
        )}
        {status === 'error' && (
          <div className='mission-success-loading'>Unable to generate mission file.</div>
        )}
        {previewUrl && (
          <img
            className='mission-success-preview'
            src={previewUrl}
            alt='Mission complete share card preview'
          />
        )}
        <div className='mission-success-actions'>
          <a
            className={`mission-success-button primary${downloadReady ? '' : ' is-disabled'}`}
            href={previewUrl || '#'}
            download={filename}
            target='_blank'
            rel='noreferrer'
            aria-disabled={!downloadReady}
            onClick={(event) => {
              if (!downloadReady) {
                event.preventDefault()
              }
            }}
          >
            Download Image
          </a>
          <button type='button' className='mission-success-button secondary' onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

export default MissionSuccessModal
