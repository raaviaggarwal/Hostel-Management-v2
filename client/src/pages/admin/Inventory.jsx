import { useState } from 'react'
import { App as AntApp, Button, Card, Select, Space } from 'antd'
import { PlusOutlined, EditOutlined } from '@ant-design/icons'
import { useResource } from '../../hooks/useResource'
import { useTableFilter } from '../../hooks/useTableFilter'
import { resourceApi } from '../../api/client'
import PageHeader from '../../components/PageHeader'
import DataTable from '../../components/DataTable'
import EntityModal from '../../components/EntityModal'
import ConfirmDelete from '../../components/ConfirmDelete'
import StatusTag from '../../components/StatusTag'
import TableSearchBar from '../../components/TableSearchBar'

const CONDITION_OPTIONS = ['Good', 'Damaged', 'Fair', 'New']
const STATUS_OPTIONS = ['new', 'good', 'under_repair', 'condemned']

export default function Inventory() {
  const { message } = AntApp.useApp()
  const [hostelId, setHostelId] = useState()
  const [editing, setEditing] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const { data, loading, reload } = useResource(`/inventory${hostelId ? `?hostelId=${hostelId}` : ''}`)
  const { data: hostels } = useResource('/hostels')

  const hostelOptions = hostels.map((h) => ({ label: h.name, value: h.id }))
  const { query, setQuery, filterValue, setFilterValue, filtered } = useTableFilter(
    data,
    ['item', 'assignedTo'],
    'status'
  )
  const statusOptions = STATUS_OPTIONS.map((s) => ({ label: s, value: s }))

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
        await resourceApi.update('/inventory', editing.id, values)
        message.success('Item updated')
      } else {
        await resourceApi.post('/inventory', values)
        message.success('Item added')
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
      await resourceApi.remove('/inventory', record.id)
      message.success('Item removed')
      reload()
    } catch (error) {
      message.error(error.message)
    }
  }

  const columns = [
    { title: 'Hostel', dataIndex: 'hostelId', render: (v) => hostels.find((h) => h.id === v)?.name || v },
    { title: 'Room', dataIndex: 'roomId', render: (v) => v || '-' },
    { title: 'Item', dataIndex: 'item' },
    { title: 'Qty', dataIndex: 'quantity', width: 60 },
    { title: 'Condition', dataIndex: 'condition' },
    { title: 'Status', dataIndex: 'status', render: (v) => <StatusTag status={v} /> },
    { title: 'Assigned To', dataIndex: 'assignedTo' },
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

  const fields = [
    {
      name: 'hostelId',
      label: 'Hostel',
      input: 'select',
      options: hostelOptions,
      rules: [{ required: true }],
    },
    { name: 'roomId', label: 'Room ID', input: 'number', props: { min: 1 } },
    { name: 'item', label: 'Item', rules: [{ required: true }] },
    { name: 'quantity', label: 'Quantity', input: 'number', props: { min: 1 }, rules: [{ required: true }] },
    {
      name: 'condition',
      label: 'Condition',
      input: 'select',
      options: CONDITION_OPTIONS.map((c) => ({ label: c, value: c })),
      rules: [{ required: true }],
    },
    {
      name: 'status',
      label: 'Status',
      input: 'select',
      options: STATUS_OPTIONS.map((s) => ({ label: s, value: s })),
      rules: [{ required: true }],
    },
    {
      name: 'assignedTo',
      label: 'Assigned To',
      input: 'select',
      options: [
        { label: 'Student', value: 'Student' },
        { label: 'Room', value: 'Room' },
        { label: 'Store', value: 'Store' },
      ],
      rules: [{ required: true }],
    },
  ]

  return (
    <>
      <PageHeader
        title="Inventory"
        subtitle="Room inventory across all hostels."
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            Add Item
          </Button>
        }
      />

      <Card title="Filter by hostel" style={{ marginBottom: 16 }}>
        <Select
          allowClear
          style={{ minWidth: 260 }}
          placeholder="All hostels"
          value={hostelId}
          onChange={setHostelId}
          options={hostelOptions}
        />
      </Card>

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
        title={editing ? 'Edit Item' : 'Add Item'}
        initialValues={editing}
        fields={fields}
        loading={saving}
        onCancel={() => setModalOpen(false)}
        onSubmit={handleSubmit}
      />
    </>
  )
}