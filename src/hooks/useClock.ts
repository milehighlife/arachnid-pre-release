import { useEffect, useState } from 'react'

const formatTime = (date: Date) =>
  `Local ${date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })}`

export default function useClock() {
  const [timeLabel, setTimeLabel] = useState(() => formatTime(new Date()))

  useEffect(() => {
    const tick = () => {
      setTimeLabel(formatTime(new Date()))
    }

    tick()
    const interval = window.setInterval(tick, 60000)

    return () => {
      window.clearInterval(interval)
    }
  }, [])

  return timeLabel
}
