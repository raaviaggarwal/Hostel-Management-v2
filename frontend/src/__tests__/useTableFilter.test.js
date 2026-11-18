import { describe, it, expect } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useTableFilter } from '../hooks/useTableFilter'

const rows = [
  { id: 1, name: 'Raavi Aggarwal', status: 'active' },
  { id: 2, name: 'Aarav Sharma', status: 'active' },
  { id: 3, name: 'Ananya Rao', status: 'closed' },
]

describe('useTableFilter', () => {
  it('returns all rows when no query is set', () => {
    const { result } = renderHook(() => useTableFilter(rows, ['name']))
    expect(result.current.filtered).toHaveLength(3)
  })

  it('filters by substring across the given keys', () => {
    const { result } = renderHook(() => useTableFilter(rows, ['name']))
    act(() => result.current.setQuery('aar'))
    expect(result.current.filtered).toEqual([rows[1]])
  })

  it('matches against any of the search keys', () => {
    const { result } = renderHook(() => useTableFilter(rows, ['name', 'id']))
    act(() => result.current.setQuery('3'))
    expect(result.current.filtered).toEqual([rows[2]])
  })

  it('is case-insensitive', () => {
    const { result } = renderHook(() => useTableFilter(rows, ['name']))
    act(() => result.current.setQuery('RAAVI'))
    expect(result.current.filtered).toEqual([rows[0]])
  })

  it('filters by an exact status value', () => {
    const { result } = renderHook(() => useTableFilter(rows, ['name'], 'status'))
    act(() => result.current.setFilterValue('closed'))
    expect(result.current.filtered).toEqual([rows[2]])
  })

  it('combines text search and status filter', () => {
    const { result } = renderHook(() => useTableFilter(rows, ['name'], 'status'))
    act(() => result.current.setQuery('aar'))
    act(() => result.current.setFilterValue('active'))
    expect(result.current.filtered).toEqual([rows[1]])
  })

  it('clears the query to restore all rows', () => {
    const { result } = renderHook(() => useTableFilter(rows, ['name']))
    act(() => result.current.setQuery('raavi'))
    act(() => result.current.setQuery(''))
    expect(result.current.filtered).toHaveLength(3)
  })

  it('accepts a single string search key', () => {
    const { result } = renderHook(() => useTableFilter(rows, 'name'))
    act(() => result.current.setQuery('rao'))
    expect(result.current.filtered).toEqual([rows[2]])
  })
})