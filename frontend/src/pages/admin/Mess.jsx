import { useState } from 'react'
import { App as AntApp, Button, Card, Popconfirm, Space, Table, Tabs, Tag } from 'antd'
import { EditOutlined, PlusOutlined, ToolOutlined } from '@ant-design/icons'
import { useResource } from '../../hooks/useResource'
import { resourceApi } from '../../api/client'
import PageHeader from '../../components/PageHeader'
import DataTable from '../../components/DataTable'
import EntityModal from '../../components/EntityModal'
import StatusTag from '../../components/StatusTag'
import TableSearchBar from '../../components/TableSearchBar'
import { useTableFilter } from '../../hooks/useTableFilter'

const MEALS = ['breakfast', 'lunch', 'snacks', 'dinner']

export default function Mess() {
  const { data: students } = useResource('/students')

  const nameOf = (id) => students.find((s) => s.id === id)?.name || `#${id}`

  return (
    <>
      <PageHeader title="Mess" subtitle="Menu, feedback, complaints and kitchen inspections." />
      <Tabs
        items={[
          { key: 'menu', label: 'Menu', children: <MenuTab /> },
          { key: 'feedback', label: 'Feedback', children: <FeedbackTab nameOf={nameOf} /> },
          { key: 'complaints', label: 'Complaints', children: <ComplaintsTab nameOf={nameOf} /> },
          { key: 'inspections', label: 'Inspections', children: <InspectionsTab /> },
        ]}
      />
    </>
  )
}

function MenuTab() {
  const { message } = AntApp.useApp()
  const { data, loading, reload } = useResource('/mess-menu')
  const [editing, setEditing] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)

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

  const openEdit = (record) => {
    setEditing(record)
    setModalOpen(true)
  }

  const columns = [
    { title: 'Day', dataIndex: 'day', fixed: 'left', render: (v) => <strong>{v}</strong> },
    { title: 'Breakfast', dataIndex: 'breakfast', render: (v) => <Tag color="blue">{v}</Tag> },
    { title: 'Lunch', dataIndex: 'lunch', render: (v) => <Tag color="green">{v}</Tag> },
    { title: 'Snacks', dataIndex: 'snacks', render: (v) => <Tag color="orange">{v}</Tag> },
    { title: 'Dinner', dataIndex: 'dinner', render: (v) => <Tag color="purple">{v}</Tag> },
    {
      title: 'Actions',
      fixed: 'right',
      render: (_, record) => (
        <Button type="text" icon={<EditOutlined />} onClick={() => openEdit(record)} />
      ),
    },
  ]

  return (
    <Card>
      <Table rowKey="id" loading={loading} dataSource={data} columns={columns} pagination={false} size="middle" bordered scroll={{ x: 'max-content' }} />
      <EntityModal
        open={modalOpen}
        title={`Edit ${editing?.day || ''} menu`}
        initialValues={editing}
        fields={MEALS.map((meal) => ({ name: meal, label: meal[0].toUpperCase() + meal.slice(1), rules: [{ required: true }] }))}
        loading={saving}
        onCancel={() => setModalOpen(false)}
        onSubmit={handleSubmit}
      />
    </Card>
  )
}

function FeedbackTab({ nameOf }) {
  const { data, loading } = useResource('/mess/feedback')
  const { query, setQuery, filtered } = useTableFilter(data, ['studentId', 'comment'])
  const columns = [
    { title: 'Student', dataIndex: 'studentId', render: (v) => nameOf(v) },
    { title: 'Date', dataIndex: 'date' },
    { title: 'Taste', dataIndex: 'taste', width: 70 },
    { title: 'Qty', dataIndex: 'quantity', width: 70 },
    { title: 'Hygiene', dataIndex: 'hygiene', width: 70 },
    { title: 'Variety', dataIndex: 'variety', width: 70 },
    { title: 'Temp', dataIndex: 'temperature', width: 70 },
    { title: 'Overall', dataIndex: 'overall', width: 70 },
    { title: 'Comment', dataIndex: 'comment', ellipsis: true, render: (v) => v || '-' },
  ]
  return (
    <Card extra={<TableSearchBar query={query} onQuery={setQuery} placeholder="Search..." />}>
      <DataTable rowKey="id" loading={loading} dataSource={filtered} columns={columns} />
    </Card>
  )
}

function ComplaintsTab({ nameOf }) {
  const { message } = AntApp.useApp()
  const { data, loading, reload } = useResource('/mess/complaints')
  const { query, setQuery, filtered } = useTableFilter(data, ['studentId', 'subject'])

  const resolve = async (record) => {
    try {
      await resourceApi.update('/mess/complaints', record.id, { status: 'resolved' })
      message.success('Complaint resolved')
      reload()
    } catch (error) {
      message.error(error.message)
    }
  }

  const columns = [
    { title: 'Student', dataIndex: 'studentId', render: (v) => nameOf(v) },
    { title: 'Date', dataIndex: 'date' },
    { title: 'Subject', dataIndex: 'subject' },
    { title: 'Details', dataIndex: 'details', ellipsis: true },
    { title: 'Status', dataIndex: 'status', render: (v) => <StatusTag status={v} /> },
    {
      title: 'Actions',
      fixed: 'right',
      render: (_, record) =>
        record.status === 'open' ? (
          <Popconfirm title="Mark as resolved?" onConfirm={() => resolve(record)}>
            <Button type="primary" size="small" icon={<ToolOutlined />}>
              Resolve
            </Button>
          </Popconfirm>
        ) : (
          '-'
        ),
    },
  ]
  return (
    <Card extra={<TableSearchBar query={query} onQuery={setQuery} placeholder="Search..." />}>
      <DataTable rowKey="id" loading={loading} dataSource={filtered} columns={columns} />
    </Card>
  )
}

function InspectionsTab() {
  const { message } = AntApp.useApp()
  const { data, loading, reload } = useResource('/mess/inspections')
  const { query, setQuery, filtered } = useTableFilter(data, ['area', 'remarks'])
  const [modalOpen, setModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (values) => {
    setSaving(true)
    try {
      await resourceApi.post('/mess/inspections', values)
      message.success('Inspection recorded')
      setModalOpen(false)
      reload()
    } catch (error) {
      message.error(error.message)
    } finally {
      setSaving(false)
    }
  }

  const columns = [
    { title: 'Date', dataIndex: 'date' },
    { title: 'Area', dataIndex: 'area' },
    { title: 'Hygiene', dataIndex: 'hygiene', render: (v) => <Tag color={v >= 4 ? 'green' : v >= 3 ? 'gold' : 'red'}>{v}/5</Tag> },
    { title: 'Remarks', dataIndex: 'remarks', render: (v) => v || '-' },
  ]

  return (
    <Card
      title="Kitchen Inspections"
      extra={
        <Space wrap>
          <TableSearchBar query={query} onQuery={setQuery} placeholder="Search..." />
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
            Record Inspection
          </Button>
        </Space>
      }
    >
      <DataTable rowKey="id" loading={loading} dataSource={filtered} columns={columns} />
      <EntityModal
        open={modalOpen}
        title="Record Inspection"
        fields={[
          { name: 'area', label: 'Area', rules: [{ required: true }] },
          { name: 'hygiene', label: 'Hygiene (1-5)', input: 'number', props: { min: 1, max: 5 }, rules: [{ required: true }] },
          { name: 'remarks', label: 'Remarks', input: 'textarea', rows: 3 },
        ]}
        loading={saving}
        onCancel={() => setModalOpen(false)}
        onSubmit={handleSubmit}
      />
    </Card>
  )
}