import { useState } from 'react'
import { App as AntApp, Button, Card, Input, Space, Tag, Alert } from 'antd'
import { PlusOutlined, EditOutlined, CopyOutlined } from '@ant-design/icons'
import { useResource } from '../../hooks/useResource'
import { resourceApi } from '../../api/client'
import PageHeader from '../../components/PageHeader'
import DataTable from '../../components/DataTable'
import EntityModal from '../../components/EntityModal'
import ConfirmDelete from '../../components/ConfirmDelete'

export default function Wardens() {
  const { message } = AntApp.useApp()
  const { data, loading, reload, error } = useResource('/wardens')
  const { data: hostels } = useResource('/hostels')
  const { data: blocks } = useResource('/blocks')

  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [selectedHostel, setSelectedHostel] = useState(null)
  const [saving, setSaving] = useState(false)
  const [credentials, setCredentials] = useState(null)

  const hostelName = (id) => hostels.find((h) => h.id === id)?.name || '-'
  const blockName = (id) => blocks.find((b) => b.id === id)?.name || '-'

  const filtered = data.filter(
    (w) =>
      w.name.toLowerCase().includes(search.toLowerCase()) ||
      w.email.toLowerCase().includes(search.toLowerCase())
  )

  const openCreate = () => {
    setEditing(null)
    setSelectedHostel(null)
    setCredentials(null)
    setModalOpen(true)
  }

  const openEdit = (record) => {
    setEditing(record)
    setSelectedHostel(record.hostelId)
    setCredentials(null)
    setModalOpen(true)
  }

  const handleSubmit = async (values) => {
    setSaving(true)
    try {
      if (editing) {
        await resourceApi.update('/wardens', editing.id, values)
        message.success('Warden updated')
      } else {
        const result = await resourceApi.post('/wardens', values)
        message.success('Warden created successfully')
        setCredentials({
          username: result.username,
          tempPassword: result.tempPassword,
        })
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
      await resourceApi.remove('/wardens', record.id)
      message.success('Warden deleted')
      reload()
    } catch (error) {
      message.error(error.message)
    }
  }

  const fields = [
    { name: 'name', label: 'Full Name', rules: [{ required: true }] },
    { name: 'email', label: 'Email', rules: [{ required: true, type: 'email' }] },
    {
      name: 'hostelId',
      label: 'Hostel',
      input: 'select',
      rules: [{ required: true }],
      options: hostels.map((h) => ({ label: h.name, value: h.id })),
    },
    {
      name: 'blockId',
      label: 'Block',
      input: 'select',
      options: blocks
        .filter((b) => !selectedHostel || b.hostelId === selectedHostel)
        .map((b) => ({ label: b.name, value: b.id })),
    },
  ]

  const columns = [
    { title: 'Name', dataIndex: 'name' },
    { title: 'Email', dataIndex: 'email' },
    { title: 'Hostel', render: (_, r) => hostelName(r.hostelId) },
    { title: 'Block', render: (_, r) => blockName(r.blockId) || '-' },
    {
      title: 'Password Setup',
      dataIndex: 'mustChangePassword',
      render: (required) => (
        <Tag color={required ? 'gold' : 'green'}>
          {required ? 'Change required' : 'Complete'}
        </Tag>
      ),
    },
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
        title="Wardens"
        subtitle="Manage hostel wardens and their assigned hostel/block."
        extra={
          <Space>
            <Input.Search
              placeholder="Search by name or email"
              allowClear
              style={{ width: 240 }}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
              Add Warden
            </Button>
          </Space>
        }
      />

      {credentials && (
        <Alert
          message="Warden onboarding credentials (shown once — copy now)"
          type="success"
          closable
          showIcon
          style={{ marginBottom: 16 }}
        >
          <div>
            <strong>Username:</strong>
            <span style={{ marginLeft: 8, fontFamily: 'monospace' }}>{credentials.username}</span>
            <br />
            <strong>Temporary Password:</strong>
            <span style={{ marginLeft: 8, fontFamily: 'monospace' }}>{credentials.tempPassword}</span>
            <br />
            <Button
              type="text"
              icon={<CopyOutlined />}
              size="small"
              onClick={() => {
                navigator.clipboard.writeText(`Username: ${credentials.username}\nTemporary Password: ${credentials.tempPassword}`)
                message.success('Credentials copied to clipboard')
              }}
            >
              Copy Credentials
            </Button>
          </div>
        </Alert>
      )}

      <Card>
        {error && (
          <Alert
            type="error"
            showIcon
            message="Unable to load wardens"
            description={error.message}
            style={{ marginBottom: 16 }}
          />
        )}
        <DataTable rowKey="id" loading={loading} dataSource={filtered} columns={columns} />
      </Card>

      <EntityModal
        open={modalOpen}
        title={editing ? 'Edit Warden' : 'Add Warden'}
        initialValues={editing}
        fields={fields}
        loading={saving}
        onCancel={() => setModalOpen(false)}
        onSubmit={handleSubmit}
        formProps={{
          onValuesChange: (changed) => {
            if (changed.hostelId) setSelectedHostel(changed.hostelId)
          },
        }}
      />
    </>
  )
}