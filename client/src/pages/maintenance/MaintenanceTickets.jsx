import { useMemo, useState } from 'react'
import { App as AntApp, Button, Card, Space, Tabs } from 'antd'
import { SyncOutlined } from '@ant-design/icons'
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

export default function MaintenanceTickets() {
  const { message } = AntApp.useApp()
  const [tab, setTab] = useState('all')
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const { data, loading, reload } = useResource('/maintenance')

  const filtered = useMemo(
    () => (tab === 'all' ? data : data.filter((t) => t.status === tab)),
    [data, tab]
  )
  const { query, setQuery, filtered: searchFiltered } = useTableFilter(filtered, [
    'subcategory',
    'studentName',
    'roomNo',
    'priority',
  ])

  const start = async (record) => {
    try {
      await resourceApi.update('/maintenance', record.id, { status: 'in_progress' })
      message.success('Work started')
      reload()
    } catch (error) {
      message.error(error.message)
    }
  }

  const handleSubmit = async (values) => {
    setSaving(true)
    try {
      await resourceApi.update('/maintenance', editing.id, {
        status: values.status,
        remarks: values.remarks,
        expectedDate: values.expectedDate || undefined,
      })
      message.success('Ticket updated')
      setEditing(null)
      reload()
    } catch (error) {
      message.error(error.message)
    } finally {
      setSaving(false)
    }
  }

  const columns = [
    { title: 'Issue', dataIndex: 'subcategory', ellipsis: true },
    { title: 'Room', dataIndex: 'roomNo' },
    { title: 'Student', dataIndex: 'studentName' },
    { title: 'Category', dataIndex: 'category' },
    { title: 'Priority', dataIndex: 'priority', render: (v) => <StatusTag status={v} /> },
    { title: 'Remarks', dataIndex: 'remarks', render: (v) => v || '-' },
    { title: 'Status', dataIndex: 'status', render: (v) => <StatusTag status={v} /> },
    {
      title: 'Actions',
      fixed: 'right',
      render: (_, record) => (
        <Space>
          {record.status === 'reported' && (
            <Button size="small" icon={<SyncOutlined />} onClick={() => start(record)}>
              Start
            </Button>
          )}
          {record.status !== 'resolved' && (
            <Button size="small" onClick={() => setEditing(record)}>
              Update
            </Button>
          )}
          {record.status === 'resolved' && <span>-</span>}
        </Space>
      ),
    },
  ]

  return (
    <>
      <PageHeader title="Tickets" subtitle="Maintenance tickets assigned to your hostel." />
      <Card>
        <Tabs items={TABS} activeKey={tab} onChange={setTab} />
        <div style={{ marginBottom: 16 }}>
          <TableSearchBar query={query} onQuery={setQuery} placeholder="Search issue, student, or room..." />
        </div>
        <DataTable rowKey="id" loading={loading} dataSource={searchFiltered} columns={columns} />
      </Card>

      <EntityModal
        open={!!editing}
        title={`Update #${editing?.id || ''} — ${editing?.subcategory || ''}`}
        initialValues={editing}
        fields={[
          {
            name: 'status',
            label: 'Status',
            input: 'select',
            rules: [{ required: true }],
            options: [
              { label: 'Reported', value: 'reported' },
              { label: 'In Progress', value: 'in_progress' },
              { label: 'Resolved', value: 'resolved' },
            ],
          },
          { name: 'expectedDate', label: 'Expected Date' },
          { name: 'remarks', label: 'Remarks', input: 'textarea', rows: 3 },
        ]}
        loading={saving}
        onCancel={() => setEditing(null)}
        onSubmit={handleSubmit}
      />
    </>
  )
}