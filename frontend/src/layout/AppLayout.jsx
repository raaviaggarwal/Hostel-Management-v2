import { Suspense } from 'react'
import { Layout, Drawer, Grid, Skeleton, theme } from 'antd'
import { Outlet } from 'react-router-dom'
import { useAuth } from '../context/auth'
import Navbar from '../components/Navbar'
import SidebarMenu from '../components/SidebarMenu'
import Brand from '../components/Brand'

const { Header, Content, Sider } = Layout

const SIDEBAR_WIDTH = 256

export default function AppLayout({ role }) {
  const { sidebarOpen, toggleSidebar } = useAuth()
  const screens = Grid.useBreakpoint()
  const { token } = theme.useToken()

  const isMobile = screens.lg === false

  const menu = <SidebarMenu role={role} onNavigate={isMobile ? toggleSidebar : undefined} />

  return (
    <Layout style={{ height: '100vh', overflow: 'hidden' }}>
      {isMobile ? (
        <Drawer
          placement="left"
          open={sidebarOpen}
          onClose={toggleSidebar}
          width={SIDEBAR_WIDTH}
          closable={false}
          styles={{ body: { padding: 0, display: 'flex', flexDirection: 'column' } }}
        >
          <Brand />
          <div className="layout-sidebar-scroll">{menu}</div>
        </Drawer>
      ) : (
        <Sider
          width={SIDEBAR_WIDTH}
          collapsed={!sidebarOpen}
          collapsedWidth={0}
          trigger={null}
          collapsible
          style={{ height: '100vh', position: 'sticky', top: 0, left: 0, overflow: 'hidden' }}
        >
          <Brand collapsed={!sidebarOpen} />
          <div className="layout-sidebar-scroll">{menu}</div>
        </Sider>
      )}

      <Layout style={{ height: '100vh', overflow: 'hidden' }}>
        <Header
          style={{
            padding: 0,
            height: 64,
            flex: '0 0 64px',
            lineHeight: '64px',
            background: token.colorBgContainer,
            borderBottom: `1px solid ${token.colorBorderSecondary}`,
            zIndex: 10,
          }}
        >
          <Navbar />
        </Header>
        <Content className="layout-content">
          <Suspense fallback={<Skeleton active paragraph={{ rows: 12 }} />}>
            <Outlet />
          </Suspense>
        </Content>
      </Layout>
    </Layout>
  )
}
