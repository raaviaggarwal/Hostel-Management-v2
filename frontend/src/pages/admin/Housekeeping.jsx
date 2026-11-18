import { useState } from 'react'
import { App as AntApp, Button, Card, Space } from 'antd'
import { PlusOutlined, EditOutlined } from '@ant-design/icons'
import { useResource } from '../../hooks/useResource'
import { resourceApi } from '../../api/client'
import PageHeader from '../../components/PageHeader'
import DataTable from '../../components/DataTable'
import EntityModal from '../../components/EntityModal'
import StatusTag from '../../components/StatusTag'
import TableSearchBar from '../../components/TableSearchBar'
import { useTableFilter } from '../../hooks/useTableFilter'

const TASK_TYPES = ['Room cleaning', 'Corridor cleaning', 'Bathroom cleaning', 'Common room cleaning', 'Linen service']
const STATUS_OPTIONS = [
  { label: 'Pending', value: 'pending' },
  { label: 'In Progress', value: 'in_progress' },
  { label: 'Completed', value: 'completed' },
]

export default function Housekeeping() {
  const { message } = AntApp.useApp()
  const [editing, setEditing] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const { data, loading, reload } = useResource('/housekeeping')
  const { data: hostels } = useResource('/hostels')
  const { query, setQuery, filterValue, setFilterValue, filtered } = useTableFilter(
    data,
    ['taskType', 'area', 'assignedTo'],
    'status'
  )
  const statusOptions = [...new Set(data.map((r) => r.status).filter(Boolean))].map((v) => ({
    label: v,
    value: v,
  }))

  const hostelOptions = hostels.map((h) => ({ label: h.name, value: h.id }))

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
        await resourceApi.update('/housekeeping', editing.id, values)
        message.success('Task updated')
      } else {
        await resourceApi.post('/housekeeping', values)
        message.success('Task scheduled')
      }
      setModalOpen(false)
      reload()
    } catch (error) {
      message.error(error.message)
    } finally {
      setSaving(false)
    }
  }

  const columns = [
    { title: 'Hostel', dataIndex: 'hostelId', render: (v) => hostels.find((h) => h.id === v)?.name || v },
    { title: 'Task', dataIndex: 'taskType' },
    { title: 'Area', dataIndex: 'area', ellipsis: true },
    { title: 'Assigned To', dataIndex: 'assignedTo', render: (v) => v || '-' },
    { title: 'Schedule', dataIndex: 'schedule', render: (v) => v || '-' },
    { title: 'Status', dataIndex: 'status', render: (v) => <StatusTag status={v} /> },
    {
      title: 'Inspected',
      dataIndex: 'inspected',
      render: (v) => (v ? 'Yes' : 'No'),
    },
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

  const fields = [
    {
      name: 'hostelId',
      label: 'Hostel',
      input: 'select',
      options: hostelOptions,
      rules: [{ required: true }],
    },
    {
      name: 'taskType',
      label: 'Task Type',
      input: 'select',
      options: TASK_TYPES.map((t) => ({ label: t, value: t })),
      rules: [{ required: true }],
    },
    { name: 'area', label: 'Area', rules: [{ required: true }] },
    { name: 'assignedTo', label: 'Assigned To' },
    { name: 'schedule', label: 'Schedule (YYYY-MM-DD)' },
    {
      name: 'status',
      label: 'Status',
      input: 'select',
      options: STATUS_OPTIONS,
      rules: [{ required: true }],
    },
    { name: 'inspected', label: 'Inspected', input: 'switch' },
  ]

  return (
    <>
      <PageHeader
        title="Housekeeping"
        subtitle="Cleaning tasks across all hostels."
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            Schedule Task
          </Button>
        }
      />

      <Card>
        <TableSearchBar
          query={query}
          onQuery={setQuery}
          placeholder="Search..."
          filterOptions={statusOptions}
          filterValue={filterValue}
          onFilter={setFilterValue}
        />
        <DataTable rowKey="id" loading={loading} dataSource={filtered} columns={columns} />
      </Card>

      <EntityModal
        open={modalOpen}
        title={editing ? 'Edit Task' : 'Schedule Task'}
        initialValues={editing}
        fields={fields}
        loading={saving}
        onCancel={() => setModalOpen(false)}
        onSubmit={handleSubmit}
      />
    </>
  )
}