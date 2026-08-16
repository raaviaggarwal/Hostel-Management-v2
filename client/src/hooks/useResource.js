import { useState, useCallback, useEffect } from 'react'
import { resourceApi } from '../api/client'

export function useResource(path) {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const reload = useCallback(() => {
    setLoading(true)
    setError(null)
    resourceApi
      .get(path)
      .then((result) => setData(Array.isArray(result) ? result : []))
      .catch((err) => setError(err))
      .finally(() => setLoading(false))
  }, [path])

  useEffect(() => {
    reload()
  }, [reload])

  return { data, setData, loading, error, reload }
}
