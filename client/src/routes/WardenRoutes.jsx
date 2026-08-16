/* oxlint-disable react/only-export-components */
import { lazy } from 'react'
import { Route } from 'react-router-dom'

const WardenDashboard = lazy(() => import('../pages/warden/WardenDashboard'))
const WardenStudents = lazy(() => import('../pages/warden/WardenStudents'))
const WardenAllocations = lazy(() => import('../pages/warden/WardenAllocations'))
const WardenRooms = lazy(() => import('../pages/warden/WardenRooms'))
const Leaves = lazy(() => import('../pages/warden/Leaves'))
const WardenOutPass = lazy(() => import('../pages/warden/WardenOutPass'))
const WardenEntryExit = lazy(() => import('../pages/warden/WardenEntryExit'))
const WardenAttendance = lazy(() => import('../pages/warden/WardenAttendance'))
const WardenComplaints = lazy(() => import('../pages/warden/WardenComplaints'))
const Visitors = lazy(() => import('../pages/warden/Visitors'))
const MessMenu = lazy(() => import('../pages/warden/MessMenu'))
const Notices = lazy(() => import('../pages/admin/Notices'))
const Maintenance = lazy(() => import('../pages/admin/Maintenance'))
const Mess = lazy(() => import('../pages/admin/Mess'))
const NotificationsList = lazy(() => import('../components/NotificationsList'))

export default [
  <Route key="warden-dashboard" path="dashboard" element={<WardenDashboard />} />,
  <Route key="warden-allocations" path="allocations" element={<WardenAllocations />} />,
  <Route key="warden-rooms" path="rooms" element={<WardenRooms />} />,
  <Route key="warden-students" path="students" element={<WardenStudents />} />,
  <Route key="warden-leaves" path="leaves" element={<Leaves />} />,
  <Route key="warden-outpass" path="outpass" element={<WardenOutPass />} />,
  <Route key="warden-entry-exit" path="entry-exit" element={<WardenEntryExit />} />,
  <Route key="warden-attendance" path="attendance" element={<WardenAttendance />} />,
  <Route key="warden-complaints" path="complaints" element={<WardenComplaints />} />,
  <Route key="warden-maintenance" path="maintenance" element={<Maintenance />} />,
  <Route key="warden-visitors" path="visitors" element={<Visitors />} />,
  <Route key="warden-mess-menu" path="mess-menu" element={<MessMenu />} />,
  <Route key="warden-mess" path="mess" element={<Mess />} />,
  <Route key="warden-notices" path="notices" element={<Notices />} />,
  <Route key="warden-notifications" path="notifications" element={<NotificationsList />} />,
]