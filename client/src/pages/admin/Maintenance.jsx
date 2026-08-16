import { useMemo, useState } from 'react'
import { App as AntApp, Button, Card, Space, Tabs } from 'antd'
import { EditOutlined } from '@ant-design/icons'
import { useResource } from '../../hooks/useResource'
import { resourceApi } from '../../api/client'
import PageHeader from '../../components/PageHeader'
import DataTable from '../../components/DataTable'
import EntityModal from '../../components/EntityModal'
import StatusTag from '../../components/StatusTag'
import TableSearchBar from '../../components/TableSearchBar'
import { useTableFilter } from '../../hooks/useTableFilter'

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'reported', label: 'Reported' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'resolved', label: 'Resolved' },
]

const STATUS_OPTIONS = [
  { label: 'Reported', value: 'reported' },
  { label: 'In Progress', value: 'in_progress' },
  { label: 'Resolved', value: 'resolved' },
]

export default function Maintenance() {
  const { message } = AntApp.useApp()
  const [tab, setTab] = useState('all')
  const [editing, setEditing] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const { data, loading, reload } = useResource('/maintenance')

  const filtered = useMemo(
    () => (tab === 'all' ? data : data.filter((t) => t.status === tab)),
    [data, tab]
  )

  const { query, setQuery, filtered: searchFiltered } = useTableFilter(filtered, [
    'studentName',
    'roomNo',
    'category',
    'subcategory',
    'assignedTo',
  ])

  const openEdit = (record) => {
    setEditing(record)
    setModalOpen(true)
  }

  const handleSubmit = async (values) => {
    setSaving(true)
    try {
      await resourceApi.update('/maintenance', editing.id, values)
      message.success('Ticket updated')
      setModalOpen(false)
      reload()
    } catch (error) {
      message.error(error.message)
    } finally {
      setSaving(false)
    }
  }

  const columns = [
    { title: 'Ticket', dataIndex: 'id', width: 64 },
    { title: 'Student', dataIndex: 'studentName' },
    { title: 'Room', dataIndex: 'roomNo' },
    { title: 'Category', dataIndex: 'category' },
    { title: 'Issue', dataIndex: 'subcategory', ellipsis: true },
    { title: 'Priority', dataIndex: 'priority', render: (v) => <StatusTag status={v} /> },
    { title: 'Assigned To', dataIndex: 'assignedTo', render: (v) => v || '-' },
    { title: 'Status', dataIndex: 'status', render: (v) => <StatusTag status={v} /> },
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
      <PageHeader title="Maintenance" subtitle="Maintenance tickets across all hostels." />
      <Card>
        <Space style={{ marginBottom: 16 }} wrap>
          <Tabs items={TABS} activeKey={tab} onChange={setTab} />
          <TableSearchBar query={query} onQuery={setQuery} placeholder="Search..." />
        </Space>
        <DataTable rowKey="id" loading={loading} dataSource={searchFiltered} columns={columns} />
      </Card>

      <EntityModal
        open={modalOpen}
        title={`Ticket #${editing?.id || ''}`}
        initialValues={editing}
        fields={[
          {
            name: 'status',
            label: 'Status',
            input: 'select',
            options: STATUS_OPTIONS,
            rules: [{ required: true }],
          },
          {
            name: 'priority',
            label: 'Priority',
            input: 'select',
            options: [
              { label: 'Low', value: 'low' },
              { label: 'Medium', value: 'medium' },
              { label: 'High', value: 'high' },
            ],
          },
          { name: 'assignedTo', label: 'Assigned To' },
        ]}
        loading={saving}
        onCancel={() => setModalOpen(false)}
        onSubmit={handleSubmit}
      />
    </>
  )
}