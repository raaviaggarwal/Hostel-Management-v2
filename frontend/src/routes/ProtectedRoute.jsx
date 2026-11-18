import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/auth'
import { HOME_FOR_ROLE } from './navigation'

export default function ProtectedRoute({ roles }) {
  const { isAuthenticated, user } = useAuth()

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to={HOME_FOR_ROLE[user.role] || '/login'} replace />
  }

  return <Outlet />
}