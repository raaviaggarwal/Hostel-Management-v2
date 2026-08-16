import { Button, Breadcrumb, Dropdown, Avatar, Badge, Popover, List, Tag, Space, Empty, App as AntApp } from 'antd'
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  SunOutlined,
  MoonOutlined,
  BellOutlined,
  UserOutlined,
  LogoutOutlined,
  ProfileOutlined,
} from '@ant-design/icons'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { useNotifications } from '../context/NotificationsContext'
import { navForRole, HOME_FOR_ROLE } from '../routes/navigation'
import { buildBreadcrumb } from '../utils/breadcrumb'
import { ROLE_COLOR } from '../utils/roles'

export default function Navbar() {
  const { user, sidebarOpen, toggleSidebar, logout } = useAuth()
  const { mode, toggleTheme } = useTheme()
  const { items, unreadCount, markAllRead } = useNotifications()
  const navigate = useNavigate()
  const location = useLocation()
  const { message } = AntApp.useApp()

  const breadcrumbItems = buildBreadcrumb(location.pathname, user?.role, navForRole(user?.role))

  const handleLogout = () => {
    logout()
    message.success('Logged out')
    navigate('/login', { replace: true })
  }

  const handleProfile = () => {
    if (!user) return
    if (user.role === 'admin') navigate('/admin/settings')
    else if (user.role === 'student') navigate('/student/profile')
    else navigate(HOME_FOR_ROLE[user.role])
  }

  const profileMenu = {
    items: [
      { key: 'profile', icon: <ProfileOutlined />, label: 'My Account' },
      { type: 'divider' },
      { key: 'logout', icon: <LogoutOutlined />, label: 'Logout', danger: true },
    ],
    onClick: ({ key }) => {
      if (key === 'logout') handleLogout()
      else handleProfile()
    },
  }

  const notificationContent = (
    <div style={{ width: 320 }}>
      <List
        size="small"
        dataSource={items}
        locale={{ emptyText: <Empty description="No notifications" /> }}
        renderItem={(item) => (
          <List.Item>
            <List.Item.Meta
              title={
                <Space>
                  {item.title}
                  {!item.read && <Badge status="processing" />}
                </Space>
              }
              description={item.description}
            />
          </List.Item>
        )}
      />
      {items.length > 0 && (
        <Button type="link" block onClick={markAllRead}>
          Mark all as read
        </Button>
      )}
    </div>
  )

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: 64,
        padding: '0 16px',
        gap: 12,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
        <Button
          type="text"
          icon={sidebarOpen ? <MenuFoldOutlined /> : <MenuUnfoldOutlined />}
          onClick={toggleSidebar}
          aria-label="Toggle sidebar"
        />
        <Breadcrumb items={breadcrumbItems} />
      </div>

      <Space size="middle">
        <Button
          type="text"
          icon={mode === 'light' ? <MoonOutlined /> : <SunOutlined />}
          onClick={toggleTheme}
          aria-label="Toggle theme"
        />
        <Popover
          content={notificationContent}
          title="Notifications"
          trigger="click"
          placement="bottomRight"
        >
          <Badge count={unreadCount} size="small">
            <Button type="text" icon={<BellOutlined />} aria-label="Notifications" />
          </Badge>
        </Popover>
        <Dropdown menu={profileMenu} placement="bottomRight">
          <Space style={{ cursor: 'pointer' }}>
            <Avatar size="small" icon={<UserOutlined />} />
            <span>{user?.name}</span>
            <Tag color={ROLE_COLOR[user?.role]} style={{ marginInlineEnd: 0 }}>
              {user?.role}
            </Tag>
          </Space>
        </Dropdown>
      </Space>
    </div>
  )
}
