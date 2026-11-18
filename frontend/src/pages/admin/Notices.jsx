import { useState } from 'react'
import { App as AntApp, Button, Card, Empty, Space, Switch, Tag, Typography } from 'antd'
import { PlusOutlined, EditOutlined, CalendarOutlined } from '@ant-design/icons'
import { useResource } from '../../hooks/useResource'
import { resourceApi } from '../../api/client'
import PageHeader from '../../components/PageHeader'
import EntityModal from '../../components/EntityModal'
import ConfirmDelete from '../../components/ConfirmDelete'

export default function Notices() {
  const { message } = AntApp.useApp()
  const { data, loading, reload } = useResource('/notices')

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)

  const openCreate = () => {
    setEditing(null)
    setModalOpen(true)
  }

  const openEdit = (record) => {
    setEditing(record)
    setModalOpen(true)
  }

  const handleSubmit = async (values) => {
    setSaving(true)
    try {
      if (editing) {
        await resourceApi.update('/notices', editing.id, values)
        message.success('Notice updated')
      } else {
        await resourceApi.post('/notices', values)
        message.success('Notice published')
      }
      setModalOpen(false)
      reload()
    } catch (error) {
      message.error(error.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (record) => {
    try {
      await resourceApi.remove('/notices', record.id)
      message.success('Notice deleted')
      reload()
    } catch (error) {
      message.error(error.message)
    }
  }

  const toggleActive = async (record, active) => {
    try {
      await resourceApi.update('/notices', record.id, { active })
      message.success(active ? 'Notice activated' : 'Notice deactivated')
      reload()
    } catch (error) {
      message.error(error.message)
    }
  }

  const fields = [
    { name: 'title', label: 'Title', rules: [{ required: true }] },
    { name: 'body', label: 'Details', input: 'textarea', rows: 4, rules: [{ required: true }] },
    {
      name: 'audience',
      label: 'Audience',
      input: 'select',
      options: [
        { label: 'Everyone', value: 'all' },
        { label: 'Students', value: 'students' },
        { label: 'Girls', value: 'girls' },
        { label: 'Boys', value: 'boys' },
        { label: 'Wardens', value: 'wardens' },
      ],
    },
    { name: 'active', label: 'Active', input: 'switch', initialValue: true },
  ]

  return (
    <>
      <PageHeader
        title="Notices"
        subtitle="Publish and manage notices for hostel residents."
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            Publish Notice
          </Button>
        }
      />

      <Card loading={loading}>
        {data.length === 0 ? (
          <Empty description="No notices yet" />
        ) : (
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            {data.map((notice) => (
              <Card key={notice.id} size="small">
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 12,
                    flexWrap: 'wrap',
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <Space wrap>
                      <Typography.Text strong>{notice.title}</Typography.Text>
                      <Tag color={notice.active ? 'green' : 'default'}>
                        {notice.active ? 'Active' : 'Inactive'}
                      </Tag>
                      <Tag>{notice.audience}</Tag>
                      <Typography.Text type="secondary">
                        <CalendarOutlined /> {notice.date}
                      </Typography.Text>
                    </Space>
                    <div>
                      <Typography.Paragraph type="secondary" style={{ margin: '8px 0 0' }}>
                        {notice.body}
                      </Typography.Paragraph>
                    </div>
                  </div>
                  <Space>
                    <Switch
                      checked={notice.active}
                      onChange={(checked) => toggleActive(notice, checked)}
                    />
                    <Button type="text" icon={<EditOutlined />} onClick={() => openEdit(notice)} />
                    <ConfirmDelete onConfirm={() => handleDelete(notice)} />
                  </Space>
                </div>
              </Card>
            ))}
          </Space>
        )}
      </Card>

      <EntityModal
        open={modalOpen}
        title={editing ? 'Edit Notice' : 'Publish Notice'}
        initialValues={editing}
        fields={fields}
        loading={saving}
        onCancel={() => setModalOpen(false)}
        onSubmit={handleSubmit}
      />
    </>
  )
}
