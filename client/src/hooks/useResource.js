import { useState, useCallback, useEffect } from 'react'
import { resourceApi } from '../api/client'

export function useResource(path, { refreshIntervalMs = 0, refreshOnFocus = false } = {}) {
  const [requestVersion, setRequestVersion] = useState(0)
  const [state, setState] = useState({
    path: null,
    version: -1,
    data: [],
    error: null,
  })

  const reload = useCallback(() => setRequestVersion((version) => version + 1), [])

  const setData = useCallback((nextData) => {
    setState((previous) => {
      const currentData = previous.path === path ? previous.data : []
      const data = typeof nextData === 'function' ? nextData(currentData) : nextData
      return {
        path,
        version: requestVersion,
        data: Array.isArray(data) ? data : [],
        error: previous.path === path ? previous.error : null,
      }
    })
  }, [path, requestVersion])

  useEffect(() => {
    let active = true
    resourceApi
      .get(path)
      .then((result) => {
        if (active) {
          setState({
            path,
            version: requestVersion,
            data: Array.isArray(result) ? result : [],
            error: null,
          })
        }
      })
      .catch((error) => {
        if (active) {
          setState((previous) => ({
            path,
            version: requestVersion,
            data: previous.path === path ? previous.data : [],
            error,
          }))
        }
      })

    return () => {
      active = false
    }
  }, [path, requestVersion])

  useEffect(() => {
    if (!refreshIntervalMs && !refreshOnFocus) return undefined

    const refresh = () => {
      if (document.visibilityState === 'visible') reload()
    }

    if (refreshOnFocus) {
      window.addEventListener('focus', refresh)
      document.addEventListener('visibilitychange', refresh)
    }
    const intervalId = refreshIntervalMs > 0
      ? window.setInterval(refresh, refreshIntervalMs)
      : null

    return () => {
      if (refreshOnFocus) {
        window.removeEventListener('focus', refresh)
        document.removeEventListener('visibilitychange', refresh)
      }
      if (intervalId !== null) window.clearInterval(intervalId)
    }
  }, [refreshIntervalMs, refreshOnFocus, reload])

  return {
    data: state.path === path ? state.data : [],
    setData,
    loading: state.path !== path || state.version !== requestVersion,
    error: state.path === path && state.version === requestVersion ? state.error : null,
    reload,
  }
}
