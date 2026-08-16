import { useMemo } from 'react'
import { Card } from 'antd'
import { useResource } from '../../hooks/useResource'
import { useAuth } from '../../context/AuthContext'
import PageHeader from '../../components/PageHeader'
import DataTable from '../../components/DataTable'
import StatusTag from '../../components/StatusTag'
import { formatCurrency } from '../../utils/format'

export default function WardenRooms() {
  const { user } = useAuth()
  const { data: rooms, loading } = useResource('/rooms')
  const { data: blocks } = useResource('/blocks')
  const { data: students } = useResource('/students')

  const hostelBlockIds = useMemo(
    () => blocks.filter((b) => String(b.hostelId) === String(user?.hostelId)).map((b) => b.id),
    [blocks, user]
  )

  const scoped = useMemo(
    () => rooms.filter((r) => hostelBlockIds.includes(r.blockId)),
    [rooms, hostelBlockIds]
  )

  const occupancy = (roomNo) => students.filter((s) => s.roomno === roomNo).length
  const blockName = (id) => blocks.find((b) => b.id === id)?.name || '-'

  const columns = [
    { title: 'Room No', dataIndex: 'roomNo' },
    { title: 'Block', render: (_, r) => blockName(r.blockId) },
    { title: 'Seater', dataIndex: 'seater' },
    { title: 'Fees / Month', dataIndex: 'fees', render: (v) => formatCurrency(v) },
    { title: 'Occupancy', render: (_, r) => `${occupancy(r.roomNo)} / ${r.seater}` },
    { title: 'Status', dataIndex: 'status', render: (v) => <StatusTag status={v} /> },
  ]

  return (
    <>
      <PageHeader title="Rooms" subtitle="Rooms within your hostel." />
      <Card>
        <DataTable rowKey="id" loading={loading} dataSource={scoped} columns={columns} />
      </Card>
    </>
  )
}
