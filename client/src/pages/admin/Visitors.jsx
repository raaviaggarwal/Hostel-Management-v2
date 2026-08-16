import { useState } from 'react'
import { App as AntApp, Button, Card, Space } from 'antd'
import { EditOutlined } from '@ant-design/icons'
import { useResource } from '../../hooks/useResource'
import { useTableFilter } from '../../hooks/useTableFilter'
import { resourceApi } from '../../api/client'
import PageHeader from '../../components/PageHeader'
import DataTable from '../../components/DataTable'
import EntityModal from '../../components/EntityModal'
import StatusTag from '../../components/StatusTag'
import TableSearchBar from '../../components/TableSearchBar'

export default function Visitors() {
  const { message } = AntApp.useApp()
  const [editing, setEditing] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const { data, loading, reload } = useResource('/visitors')
  const { query, setQuery, filterValue, setFilterValue, filtered } = useTableFilter(
    data,
    ['studentName', 'visitorName', 'relation', 'purpose'],
    'status'
  )
  const statusOptions = [...new Set(data.map((r) => r.status).filter(Boolean))].map((v) => ({
    label: v,
    value: v,
  }))

  const openEdit = (record) => {
    setEditing(record)
    setModalOpen(true)
  }

  const handleSubmit = async (values) => {
    setSaving(true)
    try {
      await resourceApi.update('/visitors', editing.id, values)
      message.success('Visitor updated')
      setModalOpen(false)
      reload()
    } catch (error) {
      message.error(error.message)
    } finally {
      setSaving(false)
    }
  }

  const columns = [
    { title: 'Student', dataIndex: 'studentName' },
    { title: 'Visitor', dataIndex: 'visitorName' },
    { title: 'Relation', dataIndex: 'relation' },
    { title: 'Date', dataIndex: 'date' },
    { title: 'In Time', dataIndex: 'inTime', render: (v) => v || '-' },
    { title: 'Out Time', dataIndex: 'outTime', render: (v) => v || '-' },
    { title: 'Purpose', dataIndex: 'purpose' },
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

  const fields = [
    {
      name: 'status',
      label: 'Status',
      input: 'select',
      rules: [{ required: true }],
      options: [
        { label: 'Pending', value: 'pending' },
        { label: 'Checked-in', value: 'checked-in' },
        { label: 'Checked-out', value: 'checked-out' },
      ],
    },
    { name: 'inTime', label: 'In Time (HH:MM)' },
    { name: 'outTime', label: 'Out Time (HH:MM)' },
    { name: 'purpose', label: 'Purpose' },
  ]

  return (
    <>
      <PageHeader title="Visitors" subtitle="Visitor entries across all hostels." />
      <Card
        extra={
          <TableSearchBar
            query={query}
            onQuery={setQuery}
            placeholder="Search..."
            filterOptions={statusOptions}
            filterValue={filterValue}
            onFilter={setFilterValue}
          />
        }
      >
        <DataTable rowKey="id" loading={loading} dataSource={filtered} columns={columns} />
      </Card>

      <EntityModal
        open={modalOpen}
        title={`Visitor ${editing?.visitorName || ''}`}
        initialValues={editing}
        fields={fields}
        loading={saving}
        onCancel={() => setModalOpen(false)}
        onSubmit={handleSubmit}
      />
    </>
  )
}