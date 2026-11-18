import { describe, it, expect } from 'vitest'
import { buildCsv } from '../utils/format'

describe('buildCsv', () => {
  it('uses first-row keys as headers when no columns given', () => {
    const csv = buildCsv([{ name: 'Aarav', room: 'SH-01-001' }, { name: 'Meera', room: 'SH-01-002' }])
    expect(csv).toBe('\uFEFFname,room\nAarav,SH-01-001\nMeera,SH-01-002')
  })

  it('honors explicit columns with labels and ordering', () => {
    const columns = [
      { key: 'room', label: 'Room No' },
      { key: 'name', label: 'Student Name' },
    ]
    const csv = buildCsv([{ name: 'Aarav', room: 'SH-01-001' }], columns)
    expect(csv).toBe('\uFEFFRoom No,Student Name\nSH-01-001,Aarav')
  })

  it('quotes cells containing commas, quotes or newlines', () => {
    const csv = buildCsv([{ note: 'hello, world "x"\nline2' }])
    expect(csv).toBe('\uFEFFnote\n"hello, world ""x""\nline2"')
  })

  it('renders missing cells as empty', () => {
    const csv = buildCsv([{ a: 1, b: 2 }, { a: 3 }])
    expect(csv).toBe('\uFEFFa,b\n1,2\n3,')
  })

  it('returns only the header row for an empty body', () => {
    const csv = buildCsv([], [{ key: 'x', label: 'X' }])
    expect(csv).toBe('\uFEFFX')
  })

  it('returns an empty string when there are no rows and no columns', () => {
    expect(buildCsv([])).toBe('\uFEFF')
  })
})
