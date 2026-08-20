import { describe, it, expect } from 'vitest'
import { NAV, HOME_FOR_ROLE, navForRole, portalForRole, PORTAL_FOR_ROLE } from '../routes/navigation'

describe('role navigation config', () => {
  it('admin has 20 links', () => {
    expect(NAV.admin).toHaveLength(20)
  })

  it('warden has 12 links', () => {
    expect(NAV.warden).toHaveLength(12)
  })

  it('student has 12 links', () => {
    expect(NAV.student).toHaveLength(12)
  })

  it('staff portals have their module links', () => {
    expect(NAV.security).toHaveLength(2)
    expect(NAV.mess).toHaveLength(5)
    expect(NAV.housekeeping).toHaveLength(2)
    expect(NAV.caretaker).toHaveLength(1)
    expect(NAV.parent).toHaveLength(1)
  })

  it('every link has a unique key, label and icon', () => {
    for (const role of Object.keys(NAV)) {
      const keys = NAV[role].map((link) => link.key)
      expect(new Set(keys).size).toBe(keys.length)
      for (const link of NAV[role]) {
        expect(link.label).toBeTruthy()
        expect(link.icon).toBeTruthy()
      }
    }
  })

  it('navForRole returns fallback for unknown roles', () => {
    expect(navForRole('unknown')).toEqual([])
  })

  it('maps every role to a portal', () => {
    expect(portalForRole('admin')).toBe('admin')
    expect(portalForRole('warden')).toBe('warden')
    expect(portalForRole('chief_warden')).toBe('warden')
    expect(portalForRole('deputy_warden')).toBe('warden')
    expect(portalForRole('assistant_warden')).toBe('warden')
    expect(portalForRole('caretaker')).toBe('caretaker')
    expect(portalForRole('mess_manager')).toBe('mess')
    expect(portalForRole('security')).toBe('security')
    expect(portalForRole('housekeeping')).toBe('housekeeping')
    expect(portalForRole('student')).toBe('student')
    expect(portalForRole('parent')).toBe('parent')
    expect(portalForRole('unknown')).toBe('admin')
  })

  it('provides a home route for every portal role', () => {
    expect(HOME_FOR_ROLE.admin).toBe('/admin/dashboard')
    expect(HOME_FOR_ROLE.warden).toBe('/warden/dashboard')
    expect(HOME_FOR_ROLE.chief_warden).toBe('/warden/dashboard')
    expect(HOME_FOR_ROLE.caretaker).toBe('/caretaker/dashboard')
    expect(HOME_FOR_ROLE.mess_manager).toBe('/mess/dashboard')
    expect(HOME_FOR_ROLE.security).toBe('/security/dashboard')
    expect(HOME_FOR_ROLE.housekeeping).toBe('/housekeeping/dashboard')
    expect(HOME_FOR_ROLE.student).toBe('/student/dashboard')
    expect(HOME_FOR_ROLE.parent).toBe('/parent/dashboard')
  })

  it('every role in PORTAL_FOR_ROLE has a home route', () => {
    for (const role of Object.keys(PORTAL_FOR_ROLE)) {
      expect(HOME_FOR_ROLE[role]).toBeTruthy()
    }
  })
})