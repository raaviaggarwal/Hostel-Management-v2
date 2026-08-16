import { Navigate, Route, Routes } from 'react-router-dom'
import { App as AntApp, ConfigProvider, theme as antdTheme } from 'antd'
import { useTheme } from './context/theme'
import { useAuth } from './context/auth'
import { HOME_FOR_ROLE } from './routes/navigation'
import ProtectedRoute from './routes/ProtectedRoute'
import AdminRoutes from './routes/AdminRoutes'
import WardenRoutes from './routes/WardenRoutes'
import StudentRoutes from './routes/StudentRoutes'
import AdminLayout from './layout/AdminLayout'
import WardenLayout from './layout/WardenLayout'
import StudentLayout from './layout/StudentLayout'
import PortalLayout from './layout/PortalLayout'
import Login from './pages/auth/Login'
import { portalRoutes } from './routes/PortalRoutes'

const WARDEN_ROLES = ['warden', 'chief_warden', 'deputy_warden', 'assistant_warden']

const PORTALS = {
  caretaker: {
    roles: ['caretaker'],
    title: 'Caretaker',
    subtitle: 'Inventory, housekeeping and room upkeep overview.',
  },
  mess: {
    roles: ['mess_manager'],
    title: 'Mess Manager',
    subtitle: 'Mess menu, meal records and mess fee management.',
  },
  security: {
    roles: ['security'],
    title: 'Security',
    subtitle: 'Entry-exit, visitors and out-pass control.',
  },
  housekeeping: {
    roles: ['housekeeping'],
    title: 'Housekeeping',
    subtitle: 'Cleaning schedules and housekeeping duties.',
  },
  maintenance: {
    roles: ['maintenance_staff'],
    title: 'Maintenance Staff',
    subtitle: 'Maintenance tickets and repair jobs.',
  },
  parent: {
    roles: ['parent'],
    title: 'Parent Portal',
    subtitle: 'Leave approvals, ward updates and hostels.',
  },
}

function HomeRedirect() {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  return <Navigate to={HOME_FOR_ROLE[user.role] || '/login'} replace />
}

export default function App() {
  const { mode } = useTheme()

  return (
    <ConfigProvider
      theme={{
        algorithm:
          mode === 'dark' ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
        token: {
          colorPrimary: '#04335C',
          borderRadius: 6,
        },
      }}
    >
      <AntApp>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<HomeRedirect />} />

          <Route path="/admin" element={<ProtectedRoute roles={['admin']} />}>
            <Route element={<AdminLayout />}>{AdminRoutes}</Route>
          </Route>

          <Route path="/warden" element={<ProtectedRoute roles={WARDEN_ROLES} />}>
            <Route element={<WardenLayout />}>{WardenRoutes}</Route>
          </Route>

          <Route path="/student" element={<ProtectedRoute roles={['student']} />}>
            <Route element={<StudentLayout />}>{StudentRoutes}</Route>
          </Route>

          {Object.entries(PORTALS).map(([portal, def]) => (
            <Route
              key={portal}
              path={`/${portal}`}
              element={<ProtectedRoute roles={def.roles} />}
            >
              <Route element={<PortalLayout portal={portal} />}>
                {portalRoutes[portal]}
                <Route path="*" element={<Navigate to={`/${portal}/dashboard`} replace />} />
              </Route>
            </Route>
          ))}

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AntApp>
    </ConfigProvider>
  )
}