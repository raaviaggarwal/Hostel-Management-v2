/* oxlint-disable react/only-export-components */
import { lazy } from 'react'
import { Route } from 'react-router-dom'

const SecurityDashboard = lazy(() => import('../pages/security/SecurityDashboard'))
const SecurityEntryExit = lazy(() => import('../pages/security/SecurityEntryExit'))
const SecurityVisitors = lazy(() => import('../pages/security/SecurityVisitors'))
const SecurityOutPasses = lazy(() => import('../pages/security/SecurityOutPasses'))
const MessDashboard = lazy(() => import('../pages/mess/MessDashboard'))
const MessMenuEdit = lazy(() => import('../pages/mess/MessMenuEdit'))
const MessFeedback = lazy(() => import('../pages/mess/MessFeedback'))
const MessComplaints = lazy(() => import('../pages/mess/MessComplaints'))
const MessInspections = lazy(() => import('../pages/mess/MessInspections'))
const HousekeepingDashboard = lazy(() => import('../pages/housekeeping/HousekeepingDashboard'))
const HousekeepingTasks = lazy(() => import('../pages/housekeeping/HousekeepingTasks'))
const MaintenanceDashboard = lazy(() => import('../pages/maintenance/MaintenanceDashboard'))
const MaintenanceTickets = lazy(() => import('../pages/maintenance/MaintenanceTickets'))
const CaretakerDashboard = lazy(() => import('../pages/caretaker/CaretakerDashboard'))
const ParentDashboard = lazy(() => import('../pages/parent/ParentDashboard'))

export const portalRoutes = {
  security: [
    <Route key="security-dashboard" path="dashboard" element={<SecurityDashboard />} />,
    <Route key="security-entry-exit" path="entry-exit" element={<SecurityEntryExit />} />,
    <Route key="security-visitors" path="visitors" element={<SecurityVisitors />} />,
    <Route key="security-outpasses" path="outpasses" element={<SecurityOutPasses />} />,
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
  maintenance: [
    <Route key="maintenance-dashboard" path="dashboard" element={<MaintenanceDashboard />} />,
    <Route key="maintenance-tickets" path="tickets" element={<MaintenanceTickets />} />,
  ],
  caretaker: [
    <Route key="caretaker-dashboard" path="dashboard" element={<CaretakerDashboard />} />,
  ],
  parent: [
    <Route key="parent-dashboard" path="dashboard" element={<ParentDashboard />} />,
  ],
}