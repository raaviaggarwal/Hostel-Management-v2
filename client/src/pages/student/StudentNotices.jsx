import { Card, Empty, Space, Tag, Typography } from 'antd'
import { CalendarOutlined } from '@ant-design/icons'
import { useResource } from '../../hooks/useResource'
import PageHeader from '../../components/PageHeader'

export default function StudentNotices() {
  const { data, loading } = useResource('/notices')
  const active = data.filter((n) => n.active)

  return (
    <>
      <PageHeader title="Notices" subtitle="Latest notices from the hostel administration." />
      <Card loading={loading}>
        {active.length === 0 ? (
          <Empty description="No active notices" />
        ) : (
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            {active.map((notice) => (
              <Card key={notice.id} size="small">
                <Space wrap>
                  <Typography.Text strong>{notice.title}</Typography.Text>
                  <Tag>{notice.audience}</Tag>
                  <Typography.Text type="secondary">
                    <CalendarOutlined /> {notice.date}
                  </Typography.Text>
                </Space>
                <Typography.Paragraph type="secondary" style={{ margin: '8px 0 0' }}>
                  {notice.body}
                </Typography.Paragraph>
              </Card>
            ))}
          </Space>
        )}
      </Card>
    </>
  )
}
