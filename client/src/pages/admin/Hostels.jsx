import { useState } from 'react'
import { App as AntApp, Button, Card, Space, Tag } from 'antd'
import { PlusOutlined, EditOutlined } from '@ant-design/icons'
import { useResource } from '../../hooks/useResource'
import { resourceApi } from '../../api/client'
import PageHeader from '../../components/PageHeader'
import DataTable from '../../components/DataTable'
import EntityModal from '../../components/EntityModal'
import ConfirmDelete from '../../components/ConfirmDelete'

export default function Hostels() {
  const { message } = AntApp.useApp()
  const { data, loading, reload } = useResource('/hostels')
  const { data: blocks } = useResource('/blocks')

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)

  const blockCount = (id) => blocks.filter((b) => b.hostelId === id).length

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
        await resourceApi.update('/hostels', editing.id, values)
        message.success('Hostel updated')
      } else {
        await resourceApi.post('/hostels', values)
        message.success('Hostel added')
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
      await resourceApi.remove('/hostels', record.id)
      message.success('Hostel deleted')
      reload()
    } catch (error) {
      message.error(error.message)
    }
  }

  const fields = [
    { name: 'name', label: 'Hostel Name', rules: [{ required: true }] },
    {
      name: 'gender',
      label: 'Type',
      input: 'radio',
      rules: [{ required: true }],
      options: [
        { label: 'Boys', value: 'male' },
        { label: 'Girls', value: 'female' },
      ],
    },
    { name: 'address', label: 'Address', input: 'textarea', rows: 3 },
  ]

  const columns = [
    { title: 'Hostel Name', dataIndex: 'name' },
    { title: 'Type', dataIndex: 'gender', render: (v) => <Tag color={v === 'male' ? 'blue' : 'magenta'}>{v === 'male' ? 'Boys' : 'Girls'}</Tag> },
    { title: 'Address', dataIndex: 'address' },
    { title: 'Blocks', render: (_, r) => blockCount(r.id) },
    {
      title: 'Actions',
      fixed: 'right',
      render: (_, record) => (
        <Space>
          <Button type="text" icon={<EditOutlined />} onClick={() => openEdit(record)} />
          <ConfirmDelete onConfirm={() => handleDelete(record)} />
        </Space>
      ),
    },
  ]

  return (
    <>
      <PageHeader
        title="Hostels"
        subtitle="Manage hostels and their type (boys / girls)."
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            Add Hostel
          </Button>
        }
      />

      <Card>
        <DataTable rowKey="id" loading={loading} dataSource={data} columns={columns} />
      </Card>

      <EntityModal
        open={modalOpen}
        title={editing ? 'Edit Hostel' : 'Add Hostel'}
        initialValues={editing}
        fields={fields}
        loading={saving}
        onCancel={() => setModalOpen(false)}
        onSubmit={handleSubmit}
      />
    </>
  )
}
