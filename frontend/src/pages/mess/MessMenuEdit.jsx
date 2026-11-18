import { useState } from 'react'
import { App as AntApp, Button, Card, Popconfirm } from 'antd'
import { EditOutlined } from '@ant-design/icons'
import { useResource } from '../../hooks/useResource'
import { resourceApi } from '../../api/client'
import PageHeader from '../../components/PageHeader'
import DataTable from '../../components/DataTable'
import EntityModal from '../../components/EntityModal'

export default function MessMenuEdit() {
  const { message } = AntApp.useApp()
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const { data, loading, reload } = useResource('/mess-menu')

  const handleSubmit = async (values) => {
    setSaving(true)
    try {
      await resourceApi.update('/mess-menu', editing.id, values)
      message.success(`${editing.day}'s menu updated`)
      setEditing(null)
      reload()
    } catch (error) {
      message.error(error.message)
    } finally {
      setSaving(false)
    }
  }

  const columns = [
    { title: 'Day', dataIndex: 'day' },
    { title: 'Breakfast', dataIndex: 'breakfast' },
    { title: 'Lunch', dataIndex: 'lunch' },
    { title: 'Snacks', dataIndex: 'snacks' },
    { title: 'Dinner', dataIndex: 'dinner' },
    {
      title: 'Actions',
      fixed: 'right',
      render: (_, record) => (
        <Popconfirm title={`Edit ${record.day}'s menu?`} onConfirm={() => setEditing(record)}>
          <Button type="text" icon={<EditOutlined />} />
        </Popconfirm>
      ),
    },
  ]

  return (
    <>
      <PageHeader title="Mess Menu" subtitle="Weekly menu for the mess." />
      <Card>
        <DataTable rowKey="id" loading={loading} dataSource={data} columns={columns} pagination={false} />
      </Card>

      <EntityModal
        open={!!editing}
        title={`Edit ${editing?.day || ''} Menu`}
        initialValues={editing}
        fields={[
          { name: 'breakfast', label: 'Breakfast' },
          { name: 'lunch', label: 'Lunch' },
          { name: 'snacks', label: 'Snacks' },
          { name: 'dinner', label: 'Dinner' },
          { name: 'milk', label: 'Milk' },
        ]}
        loading={saving}
        onCancel={() => setEditing(null)}
        onSubmit={handleSubmit}
      />
    </>
  )
}