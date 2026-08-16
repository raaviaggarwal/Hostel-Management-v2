import { Card, Typography, Tag, Skeleton, Space } from 'antd'
import { navForRole } from '../routes/navigation'
import { useAuth } from '../context/auth'
import { ROLE_COLOR } from '../utils/roles'

export default function PagePlaceholder({ role, path }) {
  const { user } = useAuth()
  const label = navForRole(role).find((link) => link.key === path)?.label || 'Page'

  return (
    <Card>
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <Typography.Title level={4} style={{ margin: 0 }}>
          {label}
        </Typography.Title>
        <Typography.Paragraph type="secondary" style={{ margin: 0 }}>
          This module is part of the P0 scaffold and will be fully implemented in the
          next phase. The layout, navigation and auth are already wired up.
        </Typography.Paragraph>
        <Tag color={ROLE_COLOR[role]}>
          Signed in as {user?.name} ({user?.role})
        </Tag>
        <Skeleton active paragraph={{ rows: 6 }} />
      </Space>
    </Card>
  )
}
