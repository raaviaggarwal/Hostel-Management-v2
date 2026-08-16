import { useState } from 'react'
import { App as AntApp, Button, Card, Space, Table, Tag } from 'antd'
import { EditOutlined } from '@ant-design/icons'
import { useResource } from '../../hooks/useResource'
import { resourceApi } from '../../api/client'
import PageHeader from '../../components/PageHeader'
import EntityModal from '../../components/EntityModal'

const MEALS = ['breakfast', 'lunch', 'dinner']

export default function MessMenu() {
  const { message } = AntApp.useApp()
  const { data, loading, reload } = useResource('/mess-menu')

  const [editing, setEditing] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  const openEdit = (day) => {
    setEditing(day)
    setModalOpen(true)
  }

  const handleSubmit = async (values) => {
    setSaving(true)
    try {
      await resourceApi.update('/mess-menu', editing.id, values)
      message.success(`${editing.day}'s menu updated`)
      setModalOpen(false)
      reload()
    } catch (error) {
      message.error(error.message)
    } finally {
      setSaving(false)
    }
  }

  const columns = [
    {
      title: 'Day',
      dataIndex: 'day',
      fixed: 'left',
      render: (v) => <strong>{v}</strong>,
    },
    {
      title: 'Breakfast',
      dataIndex: 'breakfast',
      render: (v) => <Tag color="blue">{v}</Tag>,
    },
    { title: 'Lunch', dataIndex: 'lunch', render: (v) => <Tag color="green">{v}</Tag> },
    { title: 'Dinner', dataIndex: 'dinner', render: (v) => <Tag color="purple">{v}</Tag> },
    {
      title: 'Actions',
      fixed: 'right',
      render: (_, record) => (
        <Space>
          <Button type="text" icon={<EditOutlined />} onClick={() => openEdit(record)} />
        </Space>
      ),
    },
  ]

  return (
    <>
      <PageHeader
        title="Mess Menu"
        subtitle="Weekly mess menu for the hostel."
      />

      <Card>
        <Table
          rowKey="id"
          loading={loading}
          dataSource={data}
          columns={columns}
          pagination={false}
          size="middle"
          bordered
          scroll={{ x: 'max-content' }}
        />
      </Card>

      <EntityModal
        open={modalOpen}
        title={`Edit ${editing?.day || ''} menu`}
        initialValues={editing}
        fields={MEALS.map((meal) => ({
          name: meal,
          label: meal[0].toUpperCase() + meal.slice(1),
          rules: [{ required: true }],
        }))}
        loading={saving}
        onCancel={() => setModalOpen(false)}
        onSubmit={handleSubmit}
      />
    </>
  )
}
