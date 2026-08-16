import { useMemo, useState } from 'react'
import {
  App as AntApp,
  Button,
  Card,
  Descriptions,
  Modal,
  Popconfirm,
  Radio,
  Select,
  Space,
  Tabs,
} from 'antd'
import {
  CheckOutlined,
  CloseOutlined,
  ClockCircleOutlined,
  SwapOutlined,
  LogoutOutlined,
} from '@ant-design/icons'
import { useResource } from '../../hooks/useResource'
import { resourceApi } from '../../api/client'
import PageHeader from '../../components/PageHeader'
import DataTable from '../../components/DataTable'
import StatusTag from '../../components/StatusTag'

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'applied', label: 'Applied' },
  { key: 'under_review', label: 'Under Review' },
  { key: 'approved', label: 'Approved' },
  { key: 'waitlisted', label: 'Waitlisted' },
  { key: 'allocated', label: 'Allocated' },
  { key: 'occupied', label: 'Occupied' },
]

export default function Allocations() {
  const { message } = AntApp.useApp()
  const [tab, setTab] = useState('all')
  const [hostelFilter, setHostelFilter] = useState('all')
  const { data, loading, reload } = useResource('/allocations')
  const { data: rooms } = useResource('/rooms')
  const { data: blocks } = useResource('/blocks')
  const { data: hostels } = useResource('/hostels')

  const [allocating, setAllocating] = useState(null)
  const [allocMode, setAllocMode] = useState('auto')
  const [roomId, setRoomId] = useState(undefined)
  const [transferring, setTransferring] = useState(null)
  const [transferRoomId, setTransferRoomId] = useState(undefined)
  const [saving, setSaving] = useState(false)

  const blockIds = useMemo(
    () =>
      hostelFilter === 'all'
        ? blocks.map((b) => b.id)
        : blocks.filter((b) => String(b.hostelId) === String(hostelFilter)).map((b) => b.id),
    [blocks, hostelFilter]
  )

  const availableRooms = useMemo(
    () =>
      rooms
        .filter(
          (r) =>
            blockIds.includes(r.blockId) &&
            !r.medicalReserved &&
            (r.status === 'available' || r.status === 'partially_occupied')
        )
        .map((r) => ({
          label: `${r.roomNo} — ${hostels.find((h) => h.id === r.hostelId)?.code || r.hostelId} (${r.occupants}/${r.seater} in)`,
          value: r.id,
        })),
    [rooms, blockIds, hostels]
  )

  const filtered = useMemo(() => {
    let list = data
    if (hostelFilter !== 'all') {
      list = list.filter(
        (a) =>
          a.hostelId === Number(hostelFilter) ||
          (a.hostelPrefs || []).includes(Number(hostelFilter))
      )
    }
    return tab === 'all' ? list : list.filter((a) => a.status === tab)
  }, [data, tab, hostelFilter])

  const run = async (fn, success) => {
    setSaving(true)
    try {
      await fn()
      message.success(success)
      reload()
    } catch (error) {
      message.error(error.message)
    } finally {
      setSaving(false)
    }
  }

  const decide = (allocation, decision) =>
    run(
      () => resourceApi.post(`/allocations/${allocation.id}/decision`, { decision }),
      `Application ${decision}`
    )

  const openAllocate = (allocation) => {
    setAllocating(allocation)
    setAllocMode('auto')
    setRoomId(undefined)
  }

  const doAllocate = () =>
    run(
      () =>
        resourceApi.post(`/allocations/${allocating.id}/allocate`, {
          roomId: allocMode === 'manual' ? roomId : undefined,
        }),
      'Room allocated'
    )

  const openTransfer = (allocation) => {
    setTransferring(allocation)
    setTransferRoomId(undefined)
  }

  const doTransfer = () => {
    if (!transferRoomId) {
      message.warning('Select a room')
      return
    }
    run(
      () =>
        resourceApi.post(`/allocations/${transferring.id}/transfer`, {
          roomId: transferRoomId,
        }),
      'Room transferred'
    )
  }

  const checkIn = (allocation) => run(() => resourceApi.post(`/allocations/${allocation.id}/checkin`), 'Checked in')

  const cancel = (allocation) => run(() => resourceApi.post(`/allocations/${allocation.id}/cancel`), 'Allocation cancelled')

  const renderActions = (record) => {
    const actions = []
    if (record.status === 'applied' || record.status === 'under_review') {
      actions.push(
        <Button key="review" size="small" onClick={() => decide(record, 'under_review')}>
          Under Review
        </Button>,
        <Button key="approve" type="primary" size="small" icon={<CheckOutlined />} onClick={() => decide(record, 'approved')}>
          Approve
        </Button>,
        <Button key="waitlist" size="small" icon={<ClockCircleOutlined />} onClick={() => decide(record, 'waitlist')}>
          Waitlist
        </Button>,
        <Popconfirm key="reject" title="Reject this application?" onConfirm={() => decide(record, 'rejected')}>
          <Button danger size="small" icon={<CloseOutlined />}>
            Reject
          </Button>
        </Popconfirm>
      )
    } else if (record.status === 'approved' || record.status === 'waitlisted') {
      actions.push(
        <Button key="allocate" type="primary" size="small" onClick={() => openAllocate(record)}>
          Allocate Room
        </Button>,
        <Popconfirm key="reject2" title="Reject this application?" onConfirm={() => decide(record, 'rejected')}>
          <Button danger size="small">
            Reject
          </Button>
        </Popconfirm>
      )
    } else if (record.status === 'allocated') {
      actions.push(
        <Button key="checkin" type="primary" size="small" onClick={() => checkIn(record)}>
          Check In
        </Button>,
        <Popconfirm key="cancel" title="Cancel this allocation?" onConfirm={() => cancel(record)}>
          <Button danger size="small" icon={<LogoutOutlined />}>
            Cancel
          </Button>
        </Popconfirm>
      )
    } else if (record.status === 'occupied') {
      actions.push(
        <Button key="transfer" size="small" icon={<SwapOutlined />} onClick={() => openTransfer(record)}>
          Transfer
        </Button>,
        <Popconfirm key="cancel2" title="Cancel this allocation?" onConfirm={() => cancel(record)}>
          <Button danger size="small" icon={<LogoutOutlined />}>
            Cancel
          </Button>
        </Popconfirm>
      )
    }
    return actions.length ? <Space>{actions}</Space> : '-'
  }

  const columns = [
    { title: 'Student', dataIndex: 'studentName' },
    { title: 'Reg No', dataIndex: 'regNo' },
    { title: 'Gender', dataIndex: 'gender', render: (v) => (v === 'male' ? 'Boys' : 'Girls') },
    { title: 'Year', dataIndex: 'year' },
    {
      title: 'Hostel',
      dataIndex: 'hostelId',
      render: (v, r) =>
        v
          ? hostels.find((h) => h.id === v)?.name
          : (r.hostelPrefs || []).map((id) => hostels.find((h) => h.id === id)?.name || id).join(', ') || '-',
    },
    { title: 'Room Type', dataIndex: 'roomType', render: (v) => v || 'Any' },
    { title: 'Applied On', dataIndex: 'appliedDate' },
    { title: 'Room', dataIndex: 'roomNo', render: (v) => v || '-' },
    { title: 'Status', dataIndex: 'status', render: (v) => <StatusTag status={v} /> },
    {
      title: 'Actions',
      fixed: 'right',
      render: (_, record) => renderActions(record),
    },
  ]

  return (
    <>
      <PageHeader title="Allocation" subtitle="Review hostel applications and allocate rooms." />

      <Card>
        <Space style={{ marginBottom: 16 }} wrap>
          <Select
            style={{ width: 260 }}
            placeholder="All hostels"
            value={hostelFilter}
            onChange={setHostelFilter}
            options={[
              { label: 'All hostels', value: 'all' },
              ...hostels.map((h) => ({ label: `${h.name} (${h.code})`, value: h.id })),
            ]}
          />
          <Tabs items={TABS} activeKey={tab} onChange={setTab} />
        </Space>
        <DataTable rowKey="id" loading={loading} dataSource={filtered} columns={columns} />
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
            { key: 'type', label: 'Room Type', children: allocating?.roomType || 'Any' },
          ]}
        />
        <Radio.Group
          value={allocMode}
          onChange={(e) => setAllocMode(e.target.value)}
          style={{ marginBottom: 12 }}
        >
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

      <Modal
        open={!!transferring}
        title={`Transfer — ${transferring?.studentName || ''}`}
        onCancel={() => setTransferring(null)}
        onOk={doTransfer}
        confirmLoading={saving}
      >
        <Select
          style={{ width: '100%' }}
          placeholder="Select an available room"
          options={availableRooms}
          value={transferRoomId}
          onChange={setTransferRoomId}
          showSearch
          optionFilterProp="label"
        />
      </Modal>
    </>
  )
}