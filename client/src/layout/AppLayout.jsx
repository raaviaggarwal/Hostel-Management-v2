import { useEffect } from 'react'
import { Layout, Drawer, Grid, theme } from 'antd'
import { Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useNotifications } from '../context/NotificationsContext'
import { resourceApi } from '../api/client'
import Navbar from '../components/Navbar'
import SidebarMenu from '../components/SidebarMenu'
import Brand from '../components/Brand'

const { Header, Content, Sider } = Layout

const SIDEBAR_WIDTH = 256

export default function AppLayout({ role }) {
  const { sidebarOpen, toggleSidebar } = useAuth()
  const { setNotifications } = useNotifications()
  const screens = Grid.useBreakpoint()
  const { token } = theme.useToken()

  const isMobile = screens.lg === false

  useEffect(() => {
    resourceApi
      .get('/notifications')
      .then((data) => setNotifications(data))
      .catch(() => {
        // notifications are optional during the mock phase
      })
  }, [setNotifications])

  const menu = <SidebarMenu role={role} onNavigate={isMobile ? toggleSidebar : undefined} />

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {isMobile ? (
        <Drawer
          placement="left"
          open={sidebarOpen}
          onClose={toggleSidebar}
          width={SIDEBAR_WIDTH}
          closable={false}
          styles={{ body: { padding: 0 } }}
        >
          <Brand />
          {menu}
        </Drawer>
      ) : (
        <Sider
          width={SIDEBAR_WIDTH}
          collapsed={!sidebarOpen}
          collapsedWidth={0}
          trigger={null}
          collapsible
          style={{ height: '100vh', position: 'sticky', top: 0, left: 0 }}
        >
          <Brand collapsed={!sidebarOpen} />
          {menu}
        </Sider>
      )}

      <Layout>
        <Header
          style={{
            padding: 0,
            height: 64,
            lineHeight: '64px',
            background: token.colorBgContainer,
            borderBottom: `1px solid ${token.colorBorderSecondary}`,
          }}
        >
          <Navbar />
        </Header>
        <Content style={{ margin: 24 }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  )
}
