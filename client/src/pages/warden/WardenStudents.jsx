import { useMemo, useState } from 'react'
import { App as AntApp, Button, Card, Descriptions, Drawer, Input, Space } from 'antd'
import { EyeOutlined, SwapOutlined } from '@ant-design/icons'
import { useResource } from '../../hooks/useResource'
import { useAuth } from '../../context/AuthContext'
import { resourceApi } from '../../api/client'
import PageHeader from '../../components/PageHeader'
import DataTable from '../../components/DataTable'
import EntityModal from '../../components/EntityModal'
import { formatCurrency } from '../../utils/format'

export default function WardenStudents() {
  const { message } = AntApp.useApp()
  const { user } = useAuth()
  const { data, loading, reload } = useResource('/students')
  const { data: rooms } = useResource('/rooms')
  const { data: blocks } = useResource('/blocks')

  const [search, setSearch] = useState('')
  const [viewing, setViewing] = useState(null)
  const [assignOpen, setAssignOpen] = useState(false)
  const [assigning, setAssigning] = useState(null)
  const [saving, setSaving] = useState(false)

  const blockName = (id) => blocks.find((b) => b.id === id)?.name || '-'

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return data.filter(
      (s) =>
        String(s.hostelId) === String(user?.hostelId) &&
        (!q ||
          s.name.toLowerCase().includes(q) ||
          String(s.regNo).includes(q) ||
          s.emailid.toLowerCase().includes(q))
    )
  }, [data, search, user])

  const hostelRooms = useMemo(() => {
    const hostelBlockIds = blocks
      .filter((b) => String(b.hostelId) === String(user?.hostelId))
      .map((b) => b.id)
    return rooms.filter((r) => hostelBlockIds.includes(r.blockId))
  }, [rooms, blocks, user])

  const openAssign = (student) => {
    setAssigning(student)
    setAssignOpen(true)
  }

  const handleAssign = async (values) => {
    const room = hostelRooms.find((r) => r.id === values.roomId)
    setSaving(true)
    try {
      await resourceApi.update(`/students/${assigning.id}/room`, {
        roomno: room.roomNo,
        blockId: room.blockId,
        hostelId: blocks.find((b) => b.id === room.blockId)?.hostelId,
      })
      message.success('Room assigned')
      setAssignOpen(false)
      reload()
    } catch (error) {
      message.error(error.message)
    } finally {
      setSaving(false)
    }
  }

  const columns = [
    { title: 'Reg No', dataIndex: 'regNo' },
    { title: 'Name', dataIndex: 'name' },
    { title: 'Block', render: (_, r) => blockName(r.blockId) },
    { title: 'Room', dataIndex: 'roomno' },
    { title: 'Seater', dataIndex: 'seater' },
    { title: 'Contact', dataIndex: 'contactno' },
    {
      title: 'Actions',
      fixed: 'right',
      render: (_, record) => (
        <Space>
          <Button type="text" icon={<EyeOutlined />} onClick={() => setViewing(record)} />
          <Button type="text" icon={<SwapOutlined />} onClick={() => openAssign(record)} />
        </Space>
      ),
    },
  ]

  return (
    <>
      <PageHeader
        title="Students"
        subtitle="Students registered in your hostel."
        extra={
          <Input.Search
            placeholder="Search by name, reg no or email"
            allowClear
            style={{ width: 280 }}
            onChange={(e) => setSearch(e.target.value)}
          />
        }
      />

      <Card>
        <DataTable rowKey="id" loading={loading} dataSource={filtered} columns={columns} />
      </Card>

      <Drawer
        title={`${viewing?.name || 'Student'} — Details`}
        open={!!viewing}
        onClose={() => setViewing(null)}
        width={520}
      >
        {viewing && (
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="Reg No">{viewing.regNo}</Descriptions.Item>
            <Descriptions.Item label="Full Name">{viewing.name}</Descriptions.Item>
            <Descriptions.Item label="Gender">{viewing.gender}</Descriptions.Item>
            <Descriptions.Item label="Contact">{viewing.contactno}</Descriptions.Item>
            <Descriptions.Item label="Email">{viewing.emailid}</Descriptions.Item>
            <Descriptions.Item label="Course">{viewing.course}</Descriptions.Item>
            <Descriptions.Item label="Block">{blockName(viewing.blockId)}</Descriptions.Item>
            <Descriptions.Item label="Room">{viewing.roomno}</Descriptions.Item>
            <Descriptions.Item label="Seater">{viewing.seater}</Descriptions.Item>
            <Descriptions.Item label="Fees / Month">{formatCurrency(viewing.feespm)}</Descriptions.Item>
            <Descriptions.Item label="Stay From">{viewing.stayfrom}</Descriptions.Item>
            <Descriptions.Item label="Guardian">
              {viewing.guardianName} ({viewing.guardianRelation}) — {viewing.guardianContactno}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Drawer>

      <EntityModal
        open={assignOpen}
        title={`Assign room for ${assigning?.name}`}
        initialValues={null}
        fields={[
          {
            name: 'roomId',
            label: 'Room',
            input: 'select',
            rules: [{ required: true }],
            options: hostelRooms.map((room) => ({
              label: `${room.roomNo} — ${blockName(room.blockId)} (${room.seater}-seater, ${room.status})`,
              value: room.id,
            })),
          },
        ]}
        loading={saving}
        onCancel={() => setAssignOpen(false)}
        onSubmit={handleAssign}
      />
    </>
  )
}
