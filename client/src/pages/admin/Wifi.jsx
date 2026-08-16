import { useState } from 'react'
import { App as AntApp, Button, Card, Select, Space } from 'antd'
import { EditOutlined } from '@ant-design/icons'
import { useResource } from '../../hooks/useResource'
import { useTableFilter } from '../../hooks/useTableFilter'
import { resourceApi } from '../../api/client'
import PageHeader from '../../components/PageHeader'
import DataTable from '../../components/DataTable'
import EntityModal from '../../components/EntityModal'
import StatusTag from '../../components/StatusTag'
import TableSearchBar from '../../components/TableSearchBar'

export default function Wifi() {
  const { message } = AntApp.useApp()
  const [hostelId, setHostelId] = useState()
  const [editing, setEditing] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const { data, loading, reload } = useResource(`/wifi${hostelId ? `?hostelId=${hostelId}` : ''}`)
  const { data: hostels } = useResource('/hostels')

  const hostelOptions = hostels.map((h) => ({ label: h.name, value: h.id }))
  const { query, setQuery, filterValue, setFilterValue, filtered } = useTableFilter(
    data,
    ['accessPoint', 'issues'],
    'status'
  )
  const statusOptions = ['online', 'degraded', 'offline'].map((s) => ({ label: s, value: s }))

  const openEdit = (record) => {
    setEditing(record)
    setModalOpen(true)
  }

  const handleSubmit = async (values) => {
    setSaving(true)
    try {
      await resourceApi.update('/wifi', editing.id, values)
      message.success('Access point updated')
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
    { title: 'Access Point', dataIndex: 'accessPoint' },
    { title: 'Status', dataIndex: 'status', render: (v) => <StatusTag status={v} /> },
    { title: 'Downtime (min)', dataIndex: 'downtime' },
    { title: 'Issues', dataIndex: 'issues', render: (v) => (v && v.length ? v.join(', ') : '-') },
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
      options: [
        { label: 'Online', value: 'online' },
        { label: 'Degraded', value: 'degraded' },
        { label: 'Offline', value: 'offline' },
      ],
      rules: [{ required: true }],
    },
    { name: 'downtime', label: 'Downtime (min)', input: 'number', props: { min: 0 } },
    { name: 'issues', label: 'Issues', input: 'textarea', rows: 3 },
  ]

  return (
    <>
      <PageHeader title="Wi-Fi" subtitle="Access point status across all hostels." />

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
        title={`Update ${editing?.accessPoint || ''}`}
        initialValues={editing}
        fields={fields}
        loading={saving}
        onCancel={() => setModalOpen(false)}
        onSubmit={handleSubmit}
      />
    </>
  )
}