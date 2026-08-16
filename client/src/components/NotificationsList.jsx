import { App as AntApp, Button, Card, Empty, List, Space, Tag, Typography } from 'antd'
import { CheckOutlined } from '@ant-design/icons'
import { useResource } from '../hooks/useResource'
import { resourceApi } from '../api/client'
import { useNotifications } from '../context/notifications'
import PageHeader from './PageHeader'

export default function NotificationsList() {
  const { message } = AntApp.useApp()
  const { data, loading, reload } = useResource('/notifications')
  const { refresh } = useNotifications()
  const unread = data.filter((n) => !n.read).length

  const markRead = async (id) => {
    try {
      await resourceApi.post(`/notifications/${id}/read`, {})
      reload()
      refresh()
    } catch (error) {
      message.error(error.message)
    }
  }

  const markAllRead = async () => {
    try {
      await resourceApi.post('/notifications/read-all', {})
      reload()
      refresh()
    } catch (error) {
      message.error(error.message)
    }
  }

  return (
    <>
      <PageHeader
        title="Notifications"
        subtitle="Alerts and updates for your account."
        extra={
          <Button icon={<CheckOutlined />} disabled={unread === 0} onClick={markAllRead}>
            Mark all as read
          </Button>
        }
      />

      <Card loading={loading}>
        {data.length === 0 ? (
          <Empty description="No notifications" />
        ) : (
          <List
            itemLayout="horizontal"
            dataSource={data}
            pagination={{ pageSize: 10 }}
            renderItem={(item) => (
              <List.Item
                onClick={() => !item.read && markRead(item.id)}
                style={{ cursor: item.read ? 'default' : 'pointer' }}
                actions={
                  item.read
                    ? []
                    : [
                        <Button key="read" size="small" onClick={() => markRead(item.id)}>
                          Mark read
                        </Button>,
                      ]
                }
              >
                <List.Item.Meta
                  avatar={<Tag color={item.read ? 'default' : 'blue'}>{item.read ? 'Read' : 'New'}</Tag>}
                  title={
                    <Space wrap>
                      <Typography.Text strong={!item.read}>{item.title}</Typography.Text>
                      {!item.read && <Tag color="red">Unread</Tag>}
                    </Space>
                  }
                  description={
                    <Space direction="vertical" size={0}>
                      <span>{item.description}</span>
                      <Typography.Text type="secondary">{item.date}</Typography.Text>
                    </Space>
                  }
                />
              </List.Item>
            )}
          />
        )}
      </Card>
    </>
  )
}