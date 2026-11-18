/* oxlint-disable react/only-export-components */
import { lazy } from 'react'
import { Route } from 'react-router-dom'

const SecurityDashboard = lazy(() => import('../pages/security/SecurityDashboard'))
const SecurityEntryExit = lazy(() => import('../pages/security/SecurityEntryExit'))
const MessDashboard = lazy(() => import('../pages/mess/MessDashboard'))
const MessMenuEdit = lazy(() => import('../pages/mess/MessMenuEdit'))
const MessFeedback = lazy(() => import('../pages/mess/MessFeedback'))
const MessComplaints = lazy(() => import('../pages/mess/MessComplaints'))
const MessInspections = lazy(() => import('../pages/mess/MessInspections'))
const HousekeepingDashboard = lazy(() => import('../pages/housekeeping/HousekeepingDashboard'))
const HousekeepingTasks = lazy(() => import('../pages/housekeeping/HousekeepingTasks'))
const CaretakerDashboard = lazy(() => import('../pages/caretaker/CaretakerDashboard'))
const ParentDashboard = lazy(() => import('../pages/parent/ParentDashboard'))

export const portalRoutes = {
  security: [
    <Route key="security-dashboard" path="dashboard" element={<SecurityDashboard />} />,
    <Route key="security-entry-exit" path="entry-exit" element={<SecurityEntryExit />} />,
  ],
  mess: [
    <Route key="mess-dashboard" path="dashboard" element={<MessDashboard />} />,
    <Route key="mess-menu" path="menu" element={<MessMenuEdit />} />,
    <Route key="mess-feedback" path="feedback" element={<MessFeedback />} />,
    <Route key="mess-complaints" path="complaints" element={<MessComplaints />} />,
    <Route key="mess-inspections" path="inspections" element={<MessInspections />} />,
  ],
  housekeeping: [
    <Route key="housekeeping-dashboard" path="dashboard" element={<HousekeepingDashboard />} />,
    <Route key="housekeeping-tasks" path="tasks" element={<HousekeepingTasks />} />,
  ],
  caretaker: [
    <Route key="caretaker-dashboard" path="dashboard" element={<CaretakerDashboard />} />,
  ],
  parent: [
    <Route key="parent-dashboard" path="dashboard" element={<ParentDashboard />} />,
  ],
}