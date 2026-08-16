import { useMemo, useState } from 'react'
import { App as AntApp, Button, Card, Input, Select, Space } from 'antd'
import { PlusOutlined, EyeOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { useResource } from '../../hooks/useResource'
import { resourceApi } from '../../api/client'
import PageHeader from '../../components/PageHeader'
import DataTable from '../../components/DataTable'
import EntityModal from '../../components/EntityModal'
import StatusTag from '../../components/StatusTag'
import { formatCurrency } from '../../utils/format'

const STATUS_OPTIONS = [
  { label: 'Available', value: 'available' },
  { label: 'Partially Occupied', value: 'partially_occupied' },
  { label: 'Full', value: 'full' },
  { label: 'Maintenance', value: 'maintenance' },
  { label: 'Medical Reserve', value: 'medical_reserved' },
  { label: 'Cleaning', value: 'cleaning' },
  { label: 'Blocked', value: 'blocked' },
]

export default function Rooms() {
  const { message } = AntApp.useApp()
  const navigate = useNavigate()
  const { data, loading, reload } = useResource('/rooms')
  const { data: hostels } = useResource('/hostels')
  const { data: blocks } = useResource('/blocks')

  const [hostelFilter, setHostelFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [search, setSearch] = useState('')

  const [modalOpen, setModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  const blockIds = useMemo(
    () =>
      hostelFilter === 'all'
        ? blocks.map((b) => b.id)
        : blocks.filter((b) => String(b.hostelId) === String(hostelFilter)).map((b) => b.id),
    [blocks, hostelFilter]
  )

  const filtered = useMemo(() => {
    let list = data
    if (hostelFilter !== 'all') list = list.filter((r) => blockIds.includes(r.blockId))
    if (statusFilter !== 'all') list = list.filter((r) => r.status === statusFilter)
    if (typeFilter !== 'all') list = list.filter((r) => r.type === typeFilter)
    if (search) list = list.filter((r) => r.roomNo.toLowerCase().includes(search.toLowerCase()))
    return list
  }, [data, blockIds, hostelFilter, statusFilter, typeFilter, search])

  const hostelName = (id) => hostels.find((h) => h.id === id)?.name || '-'
  const blockName = (id) => blocks.find((b) => b.id === id)?.name || '-'

  const changeStatus = async (room, status) => {
    try {
      await resourceApi.update(`/rooms/${room.id}/status`, status)
      message.success(`${room.roomNo} → ${status}`)
      reload()
    } catch (error) {
      message.error(error.message)
    }
  }

  const handleAdd = async (values) => {
    setSaving(true)
    try {
      await resourceApi.post('/rooms', values)
      message.success('Room added')
      setModalOpen(false)
      reload()
    } catch (error) {
      message.error(error.message)
    } finally {
      setSaving(false)
    }
  }

  const fields = [
    {
      name: 'hostelId',
      label: 'Hostel',
      input: 'select',
      rules: [{ required: true }],
      options: hostels.map((h) => ({ label: h.name, value: h.id })),
    },
    {
      name: 'blockId',
      label: 'Wing',
      input: 'select',
      rules: [{ required: true }],
      options: blocks.map((b) => ({ label: `${b.name} (${hostelName(b.hostelId)})`, value: b.id })),
    },
    { name: 'roomNo', label: 'Room No', rules: [{ required: true }] },
    { name: 'floor', label: 'Floor', input: 'number', rules: [{ required: true }], props: { min: 0 } },
    {
      name: 'type',
      label: 'Type',
      input: 'select',
      rules: [{ required: true }],
      options: [
        { label: 'Single', value: 'single' },
        { label: 'Double', value: 'double' },
        { label: 'Triple', value: 'triple' },
      ],
    },
    { name: 'seater', label: 'Seater', input: 'number', rules: [{ required: true }], props: { min: 1 } },
    { name: 'fees', label: 'Fees / Month', input: 'number', rules: [{ required: true }], props: { min: 0 } },
  ]

  const columns = [
    {
      title: 'Room No',
      dataIndex: 'roomNo',
      render: (v, r) => (
        <Button type="link" style={{ padding: 0 }} onClick={() => navigate(`/admin/rooms/${r.id}`)}>
          {v}
        </Button>
      ),
    },
    { title: 'Hostel', dataIndex: 'hostelId', render: (v) => hostelName(v) },
    { title: 'Wing', dataIndex: 'blockId', render: (v) => blockName(v) },
    { title: 'Floor', dataIndex: 'floor' },
    { title: 'Type', dataIndex: 'type', render: (v) => (v ? v.charAt(0).toUpperCase() + v.slice(1) : '-') },
    { title: 'Seater', dataIndex: 'seater' },
    { title: 'Occupancy', dataIndex: 'occupied', render: (v, r) => `${v}/${r.seater}` },
    { title: 'Fees / Month', dataIndex: 'fees', render: (v) => formatCurrency(v) },
    { title: 'Status', dataIndex: 'status', render: (v) => <StatusTag status={v} /> },
    {
      title: 'Actions',
      fixed: 'right',
      render: (_, record) => (
        <Space>
          <Button
            type="text"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => navigate(`/admin/rooms/${record.id}`)}
          />
          <Select
            size="small"
            style={{ width: 150 }}
            value={record.status === 'medical_reserved' ? 'medical_reserved' : record.status}
            options={STATUS_OPTIONS}
            onChange={(status) => changeStatus(record, status)}
          />
        </Space>
      ),
    },
  ]

  return (
    <>
      <PageHeader
        title="Room Management"
        subtitle="All rooms across hostels with live occupancy and status."
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
            Add Room
          </Button>
        }
      />

      <Card>
        <Space style={{ marginBottom: 16 }} wrap>
          <Select
            style={{ width: 240 }}
            placeholder="All hostels"
            value={hostelFilter}
            onChange={setHostelFilter}
            options={[{ label: 'All hostels', value: 'all' }, ...hostels.map((h) => ({ label: h.name, value: h.id }))]}
          />
          <Select
            style={{ width: 180 }}
            placeholder="All statuses"
            value={statusFilter}
            onChange={setStatusFilter}
            options={[{ label: 'All statuses', value: 'all' }, ...STATUS_OPTIONS]}
          />
          <Select
            style={{ width: 160 }}
            placeholder="All types"
            value={typeFilter}
            onChange={setTypeFilter}
            options={[
              { label: 'All types', value: 'all' },
              { label: 'Single', value: 'single' },
              { label: 'Double', value: 'double' },
              { label: 'Triple', value: 'triple' },
            ]}
          />
          <Input.Search
            placeholder="Search room no"
            allowClear
            style={{ width: 200 }}
            onSearch={setSearch}
            onChange={(e) => !e.target.value && setSearch('')}
          />
        </Space>
        <DataTable rowKey="id" loading={loading} dataSource={filtered} columns={columns} />
      </Card>

      <EntityModal
        open={modalOpen}
        title="Add Room"
        fields={fields}
        loading={saving}
        onCancel={() => setModalOpen(false)}
        onSubmit={handleAdd}
      />
    </>
  )
}