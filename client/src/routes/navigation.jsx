import {
  DashboardOutlined,
  TeamOutlined,
  SafetyCertificateOutlined,
  HomeOutlined,
  AppstoreOutlined,
  FileDoneOutlined,
  ClockCircleOutlined,
  HistoryOutlined,
  BugOutlined,
  WalletOutlined,
  CalendarOutlined,
  BarChartOutlined,
  NotificationOutlined,
  SettingOutlined,
  UserOutlined,
  FormOutlined,
  CheckSquareOutlined,
  RollbackOutlined,
  CarOutlined,
  ReadOutlined,
  BellOutlined,
  LogoutOutlined,
  SwapOutlined,
} from '@ant-design/icons'

export const ROLE_LABEL = {
  admin: 'Admin',
  warden: 'Warden',
  chief_warden: 'Chief Warden',
  deputy_warden: 'Deputy Warden',
  assistant_warden: 'Assistant Warden',
  caretaker: 'Caretaker',
  mess_manager: 'Mess Manager',
  security: 'Security',
  housekeeping: 'Housekeeping',
  maintenance_staff: 'Maintenance Staff',
  student: 'Student',
  parent: 'Parent',
}

export const PORTAL_FOR_ROLE = {
  admin: 'admin',
  warden: 'warden',
  chief_warden: 'warden',
  deputy_warden: 'warden',
  assistant_warden: 'warden',
  caretaker: 'caretaker',
  mess_manager: 'mess',
  security: 'security',
  housekeeping: 'housekeeping',
  maintenance_staff: 'maintenance',
  student: 'student',
  parent: 'parent',
}

export const HOME_FOR_ROLE = {
  admin: '/admin/dashboard',
  warden: '/warden/dashboard',
  chief_warden: '/warden/dashboard',
  deputy_warden: '/warden/dashboard',
  assistant_warden: '/warden/dashboard',
  caretaker: '/caretaker/dashboard',
  mess_manager: '/mess/dashboard',
  security: '/security/dashboard',
  housekeeping: '/housekeeping/dashboard',
  maintenance_staff: '/maintenance/dashboard',
  student: '/student/dashboard',
  parent: '/parent/dashboard',
}

export function portalForRole(role) {
  return PORTAL_FOR_ROLE[role] || 'admin'
}

export const NAV = {
  admin: [
    { key: '/admin/dashboard', label: 'Dashboard', icon: <DashboardOutlined /> },
    { key: '/admin/hostels', label: 'Hostel Mgmt', icon: <HomeOutlined /> },
    { key: '/admin/rooms', label: 'Room Mgmt', icon: <AppstoreOutlined /> },
    { key: '/admin/allocation', label: 'Allocation', icon: <FileDoneOutlined /> },
    { key: '/admin/allocation/waitlist', label: 'Waiting List', icon: <ClockCircleOutlined /> },
    { key: '/admin/allocation/history', label: 'Allocation History', icon: <HistoryOutlined /> },
    { key: '/admin/students', label: 'Students', icon: <TeamOutlined /> },
    { key: '/admin/wardens', label: 'Wardens', icon: <SafetyCertificateOutlined /> },
    { key: '/admin/fees', label: 'Fees', icon: <WalletOutlined /> },
    { key: '/admin/entry-exit', label: 'Entry / Exit', icon: <SwapOutlined /> },
    { key: '/admin/reports', label: 'Reports', icon: <BarChartOutlined /> },
    { key: '/admin/settings', label: 'Settings', icon: <SettingOutlined /> },
    { key: '/admin/notifications', label: 'Notifications', icon: <BellOutlined /> },
  ],
  warden: [
    { key: '/warden/dashboard', label: 'Dashboard', icon: <DashboardOutlined /> },
    { key: '/warden/allocations', label: 'Allocations', icon: <FileDoneOutlined /> },
    { key: '/warden/rooms', label: 'Rooms', icon: <AppstoreOutlined /> },
    { key: '/warden/students', label: 'Students', icon: <TeamOutlined /> },
    { key: '/warden/leaves', label: 'Leaves', icon: <RollbackOutlined /> },
    { key: '/warden/outpass', label: 'Out-Pass', icon: <LogoutOutlined /> },
    { key: '/warden/entry-exit', label: 'Entry / Exit', icon: <SwapOutlined /> },
    { key: '/warden/attendance', label: 'Attendance', icon: <CalendarOutlined /> },
    { key: '/warden/complaints', label: 'Complaints', icon: <BugOutlined /> },
    { key: '/warden/visitors', label: 'Visitors', icon: <CarOutlined /> },
    { key: '/warden/mess-menu', label: 'Mess Menu', icon: <ReadOutlined /> },
    { key: '/warden/notices', label: 'Notices', icon: <NotificationOutlined /> },
    { key: '/warden/notifications', label: 'Notifications', icon: <BellOutlined /> },
  ],
  student: [
    { key: '/student/dashboard', label: 'Dashboard', icon: <DashboardOutlined /> },
    { key: '/student/profile', label: 'Profile', icon: <UserOutlined /> },
    { key: '/student/apply', label: 'Apply', icon: <FormOutlined /> },
    { key: '/student/allocation', label: 'Allocation', icon: <CheckSquareOutlined /> },
    { key: '/student/leave', label: 'Leave', icon: <RollbackOutlined /> },
    { key: '/student/outpass', label: 'Out-Pass', icon: <LogoutOutlined /> },
    { key: '/student/entry-exit', label: 'Entry / Exit', icon: <SwapOutlined /> },
    { key: '/student/complaints', label: 'Complaints', icon: <BugOutlined /> },
    { key: '/student/visitors', label: 'Visitors', icon: <CarOutlined /> },
    { key: '/student/attendance', label: 'Attendance', icon: <CalendarOutlined /> },
    { key: '/student/notices', label: 'Notices', icon: <NotificationOutlined /> },
    { key: '/student/mess-menu', label: 'Mess Menu', icon: <ReadOutlined /> },
    { key: '/student/fees', label: 'Fees', icon: <WalletOutlined /> },
    { key: '/student/notifications', label: 'Notifications', icon: <BellOutlined /> },
  ],
  caretaker: [
    { key: '/caretaker/dashboard', label: 'Dashboard', icon: <DashboardOutlined /> },
  ],
  mess: [
    { key: '/mess/dashboard', label: 'Dashboard', icon: <DashboardOutlined /> },
  ],
  security: [
    { key: '/security/dashboard', label: 'Dashboard', icon: <DashboardOutlined /> },
  ],
  housekeeping: [
    { key: '/housekeeping/dashboard', label: 'Dashboard', icon: <DashboardOutlined /> },
  ],
  maintenance: [
    { key: '/maintenance/dashboard', label: 'Dashboard', icon: <DashboardOutlined /> },
  ],
  parent: [
    { key: '/parent/dashboard', label: 'Dashboard', icon: <DashboardOutlined /> },
  ],
}

export function navForRole(role) {
  return NAV[role] || []
}