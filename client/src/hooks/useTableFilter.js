import { useMemo, useState } from 'react'

export function useTableFilter(data = [], searchKeys = [], filterKey) {
  const [query, setQuery] = useState('')
  const [filterValue, setFilterValue] = useState()

  const filtered = useMemo(() => {
    const keys = Array.isArray(searchKeys) ? searchKeys : [searchKeys]
    const q = query.trim().toLowerCase()
    let rows = data
    if (q && keys.length) {
      rows = rows.filter((row) =>
        keys.some((key) => String(row[key] ?? '').toLowerCase().includes(q))
      )
    }
    if (filterKey && filterValue !== undefined && filterValue !== null) {
      rows = rows.filter((row) => String(row[filterKey]) === String(filterValue))
    }
    return rows
  }, [data, query, filterValue, filterKey, searchKeys])

  return { query, setQuery, filterValue, setFilterValue, filtered }
}