import { useEffect, useState } from 'react'
import { buildMissionSuccessCardPng } from '../utils/missionShareCard'

type MissionSuccessModalProps = {
  isOpen: boolean
  token: string
  handle: string
  missionNumber: 1 | 2 | 3
  rank: string
  onClose: () => void
}

type ModalStatus = 'idle' | 'loading' | 'ready' | 'error'

function MissionSuccessModal({ isOpen, token, handle, missionNumber, rank, onClose }: MissionSuccessModalProps) {
  const [status, setStatus] = useState<ModalStatus>('idle')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [filename, setFilename] = useState<string>('')
  const [imageBlob, setImageBlob] = useState<Blob | null>(null)

  useEffect(() => {
    if (!isOpen) {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
      }
      setPreviewUrl(null)
      setFilename('')
      setImageBlob(null)
      setStatus('idle')
      return
    }

    let active = true
    setStatus('loading')

    const normalizedToken = (token || handle || '')
      .trim()
      .toLowerCase()
      .replace(/^@+/, '')
      .replace(/\s+/g, '')

    buildMissionSuccessCardPng({ token: normalizedToken, handle, timestamp: new Date(), missionNumber, rank })
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
        setImageBlob(blob)
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
  }, [isOpen, token, handle, missionNumber, rank])

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
  const canShare = downloadReady && Boolean(imageBlob) && typeof navigator !== 'undefined' && 'share' in navigator

  const handleShare = async () => {
    if (!downloadReady || !previewUrl || !imageBlob) {
      return
    }
    const file = new File([imageBlob], filename || 'mission-success.png', { type: 'image/png' })
    const shareData: ShareData = { files: [file] }
    const navigatorAny = navigator as Navigator & { canShare?: (data: ShareData) => boolean }
    if (navigatorAny.share && (!navigatorAny.canShare || navigatorAny.canShare(shareData))) {
      try {
        await navigatorAny.share(shareData)
        return
      } catch (error) {
        console.warn('Share canceled or failed', error)
      }
    }
    window.open(previewUrl, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className='mission-success-overlay' role='dialog' aria-modal='true'>
      <div className='mission-success-modal'>
        <div className='mission-success-confidential mono'>PROMOTION BADGE • SOCIAL SHARE</div>
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
          <button
            type='button'
            className={`mission-success-button primary${downloadReady ? '' : ' is-disabled'}`}
            aria-disabled={!downloadReady}
            onClick={handleShare}
          >
            {canShare ? 'Share/Save Image' : 'Open Image'}
          </button>
          <button type='button' className='mission-success-button secondary' onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

export default MissionSuccessModal
