import { describe, it, expect } from 'vitest'
import { buildBreadcrumb } from '../utils/breadcrumb'
import { NAV } from '../routes/navigation'

describe('buildBreadcrumb', () => {
  it('returns role label for a root path', () => {
    expect(buildBreadcrumb('/admin', 'admin', NAV.admin)).toEqual([
      { title: 'Admin' },
    ])
  })

  it('builds [Role, Section] for a matched route', () => {
    expect(buildBreadcrumb('/admin/students', 'admin', NAV.admin)).toEqual([
      { title: 'Admin' },
      { title: 'Students' },
    ])
  })

  it('appends extra segments after the matched section', () => {
    expect(buildBreadcrumb('/warden/rooms/5', 'warden', NAV.warden)).toEqual([
      { title: 'Warden' },
      { title: 'Rooms' },
      { title: '5' },
    ])
  })

  it('humanizes dashed segment labels', () => {
    expect(buildBreadcrumb('/warden/mess-menu', 'warden', NAV.warden)).toEqual([
      { title: 'Warden' },
      { title: 'Mess Menu' },
    ])
  })

  it('falls back to raw segments for unknown paths', () => {
    expect(buildBreadcrumb('/admin/unknown/thing', 'admin', NAV.admin)).toEqual([
      { title: 'Admin' },
      { title: 'Unknown' },
      { title: 'Thing' },
    ])
  })
})
