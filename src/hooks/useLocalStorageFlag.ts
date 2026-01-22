import { useCallback, useState } from 'react'

export default function useLocalStorageFlag(key: string, defaultValue = false) {
  const [value, setValue] = useState(() => {
    if (typeof window === 'undefined') {
      return defaultValue
    }
    return window.localStorage.getItem(key) === '1'
  })

  const setFlag = useCallback(
    (nextValue: boolean) => {
      setValue(nextValue)
      if (typeof window === 'undefined') {
        return
      }
      if (nextValue) {
        window.localStorage.setItem(key, '1')
      } else {
        window.localStorage.removeItem(key)
      }
    },
    [key],
  )

  return [value, setFlag] as const
}
