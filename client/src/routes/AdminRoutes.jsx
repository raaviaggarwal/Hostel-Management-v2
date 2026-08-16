import { Route } from 'react-router-dom'
import Dashboard from '../pages/admin/Dashboard'
import Students from '../pages/admin/Students'
import Wardens from '../pages/admin/Wardens'
import Hostels from '../pages/admin/Hostels'
import HostelDetail from '../pages/admin/HostelDetail'
import Rooms from '../pages/admin/Rooms'
import RoomDetail from '../pages/admin/RoomDetail'
import Allocations from '../pages/admin/Allocations'
import WaitingList from '../pages/admin/WaitingList'
import AllocationHistory from '../pages/admin/AllocationHistory'
import Fees from '../pages/admin/Fees'
import Reports from '../pages/admin/Reports'
import Settings from '../pages/admin/Settings'
import EntryExit from '../pages/admin/EntryExit'
import NotificationsList from '../components/NotificationsList'

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
  <Route key="admin-fees" path="fees" element={<Fees />} />,
  <Route key="admin-entry-exit" path="entry-exit" element={<EntryExit />} />,
  <Route key="admin-reports" path="reports" element={<Reports />} />,
  <Route key="admin-settings" path="settings" element={<Settings />} />,
  <Route key="admin-notifications" path="notifications" element={<NotificationsList />} />,
]