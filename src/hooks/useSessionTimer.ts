import { useEffect, useState } from 'react'

const formatTime = (totalSeconds: number) => {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

export default function useSessionTimer() {
  const [seconds, setSeconds] = useState(0)

  useEffect(() => {
    const interval = window.setInterval(() => {
      setSeconds((prev) => Math.min(prev + 1, 3599))
    }, 1000)

    return () => {
      window.clearInterval(interval)
    }
  }, [])

  return formatTime(seconds)
}
