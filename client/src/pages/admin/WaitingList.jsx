import { useMemo, useState } from 'react'
import { App as AntApp, Button, Card, Descriptions, Modal, Popconfirm, Radio, Select, Space } from 'antd'
import { useResource } from '../../hooks/useResource'
import { resourceApi } from '../../api/client'
import PageHeader from '../../components/PageHeader'
import DataTable from '../../components/DataTable'
import StatusTag from '../../components/StatusTag'

export default function WaitingList() {
  const { message } = AntApp.useApp()
  const { data, loading, reload } = useResource('/allocations')
  const { data: rooms } = useResource('/rooms')
  const { data: blocks } = useResource('/blocks')
  const { data: hostels } = useResource('/hostels')

  const [allocating, setAllocating] = useState(null)
  const [allocMode, setAllocMode] = useState('auto')
  const [roomId, setRoomId] = useState(undefined)
  const [saving, setSaving] = useState(false)

  const waitlisted = useMemo(
    () =>
      data
        .filter((a) => a.status === 'waitlisted')
        .sort((a, b) => (a.appliedDate < b.appliedDate ? -1 : 1)),
    [data]
  )

  const blockIds = useMemo(() => blocks.map((b) => b.id), [blocks])

  const availableRooms = useMemo(
    () =>
      rooms
        .filter(
          (r) => blockIds.includes(r.blockId) && !r.medicalReserved && (r.status === 'available' || r.status === 'partially_occupied')
        )
        .map((r) => ({
          label: `${r.roomNo} — ${hostels.find((h) => h.id === r.hostelId)?.code || r.hostelId} (${r.occupants}/${r.seater} in)`,
          value: r.id,
        })),
    [rooms, blockIds, hostels]
  )

  const openAllocate = (allocation) => {
    setAllocating(allocation)
    setAllocMode('auto')
    setRoomId(undefined)
  }

  const doAllocate = async () => {
    setSaving(true)
    try {
      await resourceApi.post(`/allocations/${allocating.id}/allocate`, {
        roomId: allocMode === 'manual' ? roomId : undefined,
      })
      message.success('Room allocated')
      setAllocating(null)
      reload()
    } catch (error) {
      message.error(error.message)
    } finally {
      setSaving(false)
    }
  }

  const decide = async (allocation, decision) => {
    try {
      await resourceApi.post(`/allocations/${allocation.id}/decision`, { decision })
      message.success(`Application ${decision}`)
      reload()
    } catch (error) {
      message.error(error.message)
    }
  }

  const columns = [
    { title: '#', dataIndex: 'id', width: 60 },
    { title: 'Student', dataIndex: 'studentName' },
    { title: 'Reg No', dataIndex: 'regNo' },
    { title: 'Gender', dataIndex: 'gender', render: (v) => (v === 'male' ? 'Boys' : 'Girls') },
    { title: 'Year', dataIndex: 'year' },
    {
      title: 'Preferences',
      dataIndex: 'hostelPrefs',
      render: (v) => (v || []).map((id) => hostels.find((h) => h.id === id)?.name || id).join(', ') || '-',
    },
    { title: 'Applied On', dataIndex: 'appliedDate' },
    { title: 'Status', dataIndex: 'status', render: (v) => <StatusTag status={v} /> },
    {
      title: 'Actions',
      fixed: 'right',
      render: (_, record) => (
        <Space>
          <Button type="primary" size="small" onClick={() => openAllocate(record)}>
            Allocate Room
          </Button>
          <Popconfirm title="Reject this application?" onConfirm={() => decide(record, 'rejected')}>
            <Button danger size="small">
              Reject
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <>
      <PageHeader
        title="Waiting List"
        subtitle="Waitlisted applicants, prioritised by application date."
      />

      <Card>
        <DataTable rowKey="id" loading={loading} dataSource={waitlisted} columns={columns} />
      </Card>

      <Modal
        open={!!allocating}
        title={`Allocate room — ${allocating?.studentName || ''}`}
        onCancel={() => setAllocating(null)}
        onOk={doAllocate}
        confirmLoading={saving}
      >
        <Descriptions
          column={1}
          size="small"
          bordered
          style={{ marginBottom: 16 }}
          items={[
            { key: 'reg', label: 'Reg No', children: allocating?.regNo },
            { key: 'prefs', label: 'Preferences', children: (allocating?.hostelPrefs || []).map((id) => hostels.find((h) => h.id === id)?.name || id).join(', ') },
          ]}
        />
        <Radio.Group value={allocMode} onChange={(e) => setAllocMode(e.target.value)} style={{ marginBottom: 12 }}>
          <Radio.Button value="auto">Auto-assign</Radio.Button>
          <Radio.Button value="manual">Choose room</Radio.Button>
        </Radio.Group>
        {allocMode === 'manual' && (
          <Select
            style={{ width: '100%' }}
            placeholder="Select an available room"
            options={availableRooms}
            value={roomId}
            onChange={setRoomId}
            showSearch
            optionFilterProp="label"
          />
        )}
      </Modal>
    </>
  )
}