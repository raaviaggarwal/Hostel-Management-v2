import { useState, useCallback, useEffect } from 'react'
import { resourceApi } from '../api/client'

export function useResource(path) {
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

  return {
    data: state.path === path ? state.data : [],
    setData,
    loading: state.path !== path || state.version !== requestVersion,
    error: state.path === path && state.version === requestVersion ? state.error : null,
    reload,
  }
}
