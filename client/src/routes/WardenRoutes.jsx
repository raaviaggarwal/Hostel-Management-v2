import { Route } from 'react-router-dom'
import WardenDashboard from '../pages/warden/WardenDashboard'
import WardenStudents from '../pages/warden/WardenStudents'
import WardenAllocations from '../pages/warden/WardenAllocations'
import WardenRooms from '../pages/warden/WardenRooms'
import Leaves from '../pages/warden/Leaves'
import WardenOutPass from '../pages/warden/WardenOutPass'
import WardenEntryExit from '../pages/warden/WardenEntryExit'
import WardenAttendance from '../pages/warden/WardenAttendance'
import WardenComplaints from '../pages/warden/WardenComplaints'
import Visitors from '../pages/warden/Visitors'
import MessMenu from '../pages/warden/MessMenu'
import Notices from '../pages/admin/Notices'
import NotificationsList from '../components/NotificationsList'

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
  <Route key="warden-visitors" path="visitors" element={<Visitors />} />,
  <Route key="warden-mess-menu" path="mess-menu" element={<MessMenu />} />,
  <Route key="warden-notices" path="notices" element={<Notices />} />,
  <Route key="warden-notifications" path="notifications" element={<NotificationsList />} />,
]