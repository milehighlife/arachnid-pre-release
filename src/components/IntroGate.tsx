import { useEffect, useRef, useState } from 'react'
import { getApiUrl } from '../utils/api'

type IntroGateProps = {
  token?: string | null
  codename: string
  onAccepted: () => void
}

type PlayerInstance = {
  playVideo?: () => void
  mute?: () => void
  unMute?: () => void
  isMuted?: () => boolean
  destroy?: () => void
}

declare global {
  interface Window {
    YT?: {
      Player: new (id: string, options: Record<string, unknown>) => PlayerInstance
      PlayerState?: {
        ENDED: number
        PLAYING: number
      }
    }
    onYouTubeIframeAPIReady?: () => void
  }
}

const VIDEO_ID = 'ZrBpV_Jlhg4'

let youTubeApiPromise: Promise<void> | null = null

const loadYouTubeApi = () => {
  if (typeof window === 'undefined') {
    return Promise.resolve()
  }

  if (window.YT?.Player) {
    return Promise.resolve()
  }

  if (youTubeApiPromise) {
    return youTubeApiPromise
  }

  youTubeApiPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-youtube-iframe]')
    const previousReady = window.onYouTubeIframeAPIReady

    window.onYouTubeIframeAPIReady = () => {
      if (typeof previousReady === 'function') {
        previousReady()
      }
      resolve()
    }

    if (existing) {
      return
    }

    const script = document.createElement('script')
    script.src = 'https://www.youtube.com/iframe_api'
    script.async = true
    script.dataset.youtubeIframe = 'true'
    script.onerror = () => reject(new Error('Failed to load YouTube API'))
    document.head.appendChild(script)
  })

  return youTubeApiPromise
}

function IntroGate({ token, codename, onAccepted }: IntroGateProps) {
  const playerRef = useRef<PlayerInstance | null>(null)
  const [videoEnded, setVideoEnded] = useState(false)
  const [accepting, setAccepting] = useState(false)
  const [acceptError, setAcceptError] = useState('')
  const [soundEnabled, setSoundEnabled] = useState(false)

  useEffect(() => {
    let active = true

    loadYouTubeApi()
      .then(() => {
        if (!active || !window.YT?.Player) {
          return
        }

        playerRef.current = new window.YT.Player('introPlayer', {
          videoId: VIDEO_ID,
          playerVars: {
            autoplay: 1,
            mute: 1,
            playsinline: 1,
            controls: 0,
            rel: 0,
            modestbranding: 1,
            fs: 0,
          },
          events: {
            onStateChange: (event: { data: number }) => {
              if (event.data === window.YT?.PlayerState?.ENDED) {
                setVideoEnded(true)
              }
            },
          },
        })
      })
      .catch(() => {
        setVideoEnded(true)
      })

    return () => {
      active = false
      playerRef.current?.destroy?.()
      playerRef.current = null
    }
  }, [])

  const handleStart = () => {
    playerRef.current?.unMute?.()
    setSoundEnabled(true)
    playerRef.current?.playVideo?.()
  }

  const handleAccept = async () => {
    if (accepting) {
      return
    }

    setAccepting(true)
    setAcceptError('')

    if (token) {
      try {
        const response = await fetch(getApiUrl('/api/intro-accept'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        })
        const data = (await response.json()) as { ok?: boolean; error?: string }
        if (!response.ok || !data?.ok) {
          setAcceptError(data?.error || 'Unable to confirm access.')
          setAccepting(false)
          return
        }
      } catch {
        setAcceptError('Unable to confirm access.')
        setAccepting(false)
        return
      }
    }

    onAccepted()
  }

  return (
    <div className='intro-gate'>
      <div className={`intro-video${videoEnded ? ' is-ended' : ''}`}>
        <div id='introPlayer' className='intro-player' />
      </div>
      <div className='intro-overlay'>
        <div className='intro-chip intro-chip-top'>SECURE BRIEFING</div>
        <div className='intro-chip intro-chip-bottom'>Codename {codename}</div>
        <div className='intro-live'>
          <span className='intro-live-dot' aria-hidden='true' />
          <span className='mono'>LIVE</span>
        </div>
      </div>
      {!videoEnded && !soundEnabled && (
        <button className='intro-start' type='button' onClick={handleStart}>
          Open Message
        </button>
      )}
      <div className={`intro-accept${videoEnded ? ' is-visible' : ''}`}>
        <button
          className='intro-accept-button'
          type='button'
          onClick={handleAccept}
          disabled={accepting}
        >
          {accepting ? 'Confirming…' : 'Accept Mission'}
        </button>
        {acceptError && <div className='intro-error'>{acceptError}</div>}
      </div>
    </div>
  )
}

export default IntroGate
