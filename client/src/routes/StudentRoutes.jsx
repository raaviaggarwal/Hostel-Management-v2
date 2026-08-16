import { Route } from 'react-router-dom'
import StudentDashboard from '../pages/student/StudentDashboard'
import StudentProfile from '../pages/student/StudentProfile'
import AllocationApply from '../pages/student/AllocationApply'
import MyAllocation from '../pages/student/MyAllocation'
import StudentLeave from '../pages/student/StudentLeave'
import StudentOutPass from '../pages/student/StudentOutPass'
import StudentEntryExit from '../pages/student/StudentEntryExit'
import StudentComplaints from '../pages/student/StudentComplaints'
import StudentVisitors from '../pages/student/StudentVisitors'
import StudentAttendance from '../pages/student/StudentAttendance'
import StudentNotices from '../pages/student/StudentNotices'
import StudentMessMenu from '../pages/student/StudentMessMenu'
import StudentFees from '../pages/student/StudentFees'
import NotificationsList from '../components/NotificationsList'

export default [
  <Route key="student-dashboard" path="dashboard" element={<StudentDashboard />} />,
  <Route key="student-profile" path="profile" element={<StudentProfile />} />,
  <Route key="student-apply" path="apply" element={<AllocationApply />} />,
  <Route key="student-allocation" path="allocation" element={<MyAllocation />} />,
  <Route key="student-leave" path="leave" element={<StudentLeave />} />,
  <Route key="student-outpass" path="outpass" element={<StudentOutPass />} />,
  <Route key="student-entry-exit" path="entry-exit" element={<StudentEntryExit />} />,
  <Route key="student-complaints" path="complaints" element={<StudentComplaints />} />,
  <Route key="student-visitors" path="visitors" element={<StudentVisitors />} />,
  <Route key="student-attendance" path="attendance" element={<StudentAttendance />} />,
  <Route key="student-notices" path="notices" element={<StudentNotices />} />,
  <Route key="student-mess-menu" path="mess-menu" element={<StudentMessMenu />} />,
  <Route key="student-fees" path="fees" element={<StudentFees />} />,
  <Route key="student-notifications" path="notifications" element={<NotificationsList />} />,
]