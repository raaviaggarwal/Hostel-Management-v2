/* oxlint-disable react/only-export-components */
import { lazy } from 'react'
import { Route } from 'react-router-dom'

const StudentDashboard = lazy(() => import('../pages/student/StudentDashboard'))
const StudentProfile = lazy(() => import('../pages/student/StudentProfile'))
const AllocationApply = lazy(() => import('../pages/student/AllocationApply'))
const MyAllocation = lazy(() => import('../pages/student/MyAllocation'))
const StudentLeave = lazy(() => import('../pages/student/StudentLeave'))
const StudentEntryExit = lazy(() => import('../pages/student/StudentEntryExit'))
const StudentComplaints = lazy(() => import('../pages/student/StudentComplaints'))
const StudentAttendance = lazy(() => import('../pages/student/StudentAttendance'))
const StudentNotices = lazy(() => import('../pages/student/StudentNotices'))
const StudentMessMenu = lazy(() => import('../pages/student/StudentMessMenu'))
const StudentMessFeedback = lazy(() => import('../pages/student/StudentMessFeedback'))
const NotificationsList = lazy(() => import('../components/NotificationsList'))

export default [
  <Route key="student-dashboard" path="dashboard" element={<StudentDashboard />} />,
  <Route key="student-profile" path="profile" element={<StudentProfile />} />,
  <Route key="student-apply" path="apply" element={<AllocationApply />} />,
  <Route key="student-allocation" path="allocation" element={<MyAllocation />} />,
  <Route key="student-leave" path="leave" element={<StudentLeave />} />,
  <Route key="student-entry-exit" path="entry-exit" element={<StudentEntryExit />} />,
  <Route key="student-complaints" path="complaints" element={<StudentComplaints />} />,
  <Route key="student-attendance" path="attendance" element={<StudentAttendance />} />,
  <Route key="student-notices" path="notices" element={<StudentNotices />} />,
  <Route key="student-mess-menu" path="mess-menu" element={<StudentMessMenu />} />,
  <Route key="student-mess-feedback" path="mess-feedback" element={<StudentMessFeedback />} />,
  <Route key="student-notifications" path="notifications" element={<NotificationsList />} />,
]