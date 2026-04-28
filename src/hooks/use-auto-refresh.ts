'use client'

import { useEffect, useRef } from 'react'

interface UseAutoRefreshOptions {
  enabled?: boolean
  intervalMs?: number
}

export function useAutoRefresh(
  refresh: () => void | Promise<void>,
  options: UseAutoRefreshOptions = {}
) {
  const { enabled = true, intervalMs = 15000 } = options
  const refreshRef = useRef(refresh)

  useEffect(() => {
    refreshRef.current = refresh
  }, [refresh])

  useEffect(() => {
    if (!enabled) return

    const runRefresh = () => {
      if (document.visibilityState === 'visible') {
        void refreshRef.current()
      }
    }

    const intervalId = window.setInterval(runRefresh, intervalMs)
    window.addEventListener('focus', runRefresh)
    document.addEventListener('visibilitychange', runRefresh)

    return () => {
      window.clearInterval(intervalId)
      window.removeEventListener('focus', runRefresh)
      document.removeEventListener('visibilitychange', runRefresh)
    }
  }, [enabled, intervalMs])
}
