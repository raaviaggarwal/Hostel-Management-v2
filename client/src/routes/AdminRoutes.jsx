/* oxlint-disable react/only-export-components */
import { lazy } from 'react'
import { Route } from 'react-router-dom'

const Dashboard = lazy(() => import('../pages/admin/Dashboard'))
const Students = lazy(() => import('../pages/admin/Students'))
const Wardens = lazy(() => import('../pages/admin/Wardens'))
const Hostels = lazy(() => import('../pages/admin/Hostels'))
const HostelDetail = lazy(() => import('../pages/admin/HostelDetail'))
const Rooms = lazy(() => import('../pages/admin/Rooms'))
const RoomDetail = lazy(() => import('../pages/admin/RoomDetail'))
const Allocations = lazy(() => import('../pages/admin/Allocations'))
const WaitingList = lazy(() => import('../pages/admin/WaitingList'))
const AllocationHistory = lazy(() => import('../pages/admin/AllocationHistory'))
const Reports = lazy(() => import('../pages/admin/Reports'))
const Settings = lazy(() => import('../pages/admin/Settings'))
const EntryExit = lazy(() => import('../pages/admin/EntryExit'))
const Complaints = lazy(() => import('../pages/admin/Complaints'))
const Inventory = lazy(() => import('../pages/admin/Inventory'))
const Housekeeping = lazy(() => import('../pages/admin/Housekeeping'))
const Mess = lazy(() => import('../pages/admin/Mess'))
const Wifi = lazy(() => import('../pages/admin/Wifi'))
const Medical = lazy(() => import('../pages/admin/Medical'))
const Committee = lazy(() => import('../pages/admin/Committee'))
const AuditLogs = lazy(() => import('../pages/admin/AuditLogs'))
const NotificationsList = lazy(() => import('../components/NotificationsList'))

export default [
  <Route key="admin-dashboard" path="dashboard" element={<Dashboard />} />,
  <Route key="admin-hostels" path="hostels" element={<Hostels />} />,
  <Route key="admin-hostel-detail" path="hostels/:id" element={<HostelDetail />} />,
  <Route key="admin-rooms" path="rooms" element={<Rooms />} />,
  <Route key="admin-room-detail" path="rooms/:id" element={<RoomDetail />} />,
  <Route key="admin-allocation" path="allocation" element={<Allocations />} />,
  <Route key="admin-allocation-waitlist" path="allocation/waitlist" element={<WaitingList />} />,
  <Route key="admin-allocation-history" path="allocation/history" element={<AllocationHistory />} />,
  <Route key="admin-students" path="students" element={<Students />} />,
  <Route key="admin-wardens" path="wardens" element={<Wardens />} />,
  <Route key="admin-entry-exit" path="entry-exit" element={<EntryExit />} />,
  <Route key="admin-complaints" path="complaints" element={<Complaints />} />,
  <Route key="admin-inventory" path="inventory" element={<Inventory />} />,
  <Route key="admin-housekeeping" path="housekeeping" element={<Housekeeping />} />,
  <Route key="admin-mess" path="mess" element={<Mess />} />,
  <Route key="admin-wifi" path="wifi" element={<Wifi />} />,
  <Route key="admin-medical" path="medical" element={<Medical />} />,
  <Route key="admin-committee" path="committee" element={<Committee />} />,
  <Route key="admin-reports" path="reports" element={<Reports />} />,
  <Route key="admin-audit-logs" path="audit-logs" element={<AuditLogs />} />,
  <Route key="admin-settings" path="settings" element={<Settings />} />,
  <Route key="admin-notifications" path="notifications" element={<NotificationsList />} />,
]