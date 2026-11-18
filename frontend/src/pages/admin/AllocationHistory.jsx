import { useMemo, useState } from 'react'
import { Card, Select, Space, Timeline, Typography } from 'antd'
import { useResource } from '../../hooks/useResource'
import PageHeader from '../../components/PageHeader'
import DataTable from '../../components/DataTable'
import StatusTag from '../../components/StatusTag'
import TableSearchBar from '../../components/TableSearchBar'
import { useTableFilter } from '../../hooks/useTableFilter'

export default function AllocationHistory() {
  const { data, loading } = useResource('/allocations')
  const { data: hostels } = useResource('/hostels')

  const [hostelFilter, setHostelFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')

  const filtered = useMemo(() => {
    let list = data
    if (hostelFilter !== 'all') {
      list = list.filter(
        (a) =>
          a.hostelId === Number(hostelFilter) ||
          (a.hostelPrefs || []).includes(Number(hostelFilter))
      )
    }
    if (statusFilter !== 'all') list = list.filter((a) => a.status === statusFilter)
    return [...list].sort((a, b) => b.id - a.id)
  }, [data, hostelFilter, statusFilter])

  const { query, setQuery, filtered: searchFiltered } = useTableFilter(filtered, ['studentName', 'regNo'])

  const columns = [
    { title: 'Student', dataIndex: 'studentName' },
    { title: 'Reg No', dataIndex: 'regNo' },
    {
      title: 'Hostel',
      dataIndex: 'hostelId',
      render: (v) =>
        v ? hostels.find((h) => h.id === v)?.name || '-' : '-',
    },
    { title: 'Room', dataIndex: 'roomNo', render: (v) => v || '-' },
    { title: 'Applied On', dataIndex: 'appliedDate' },
    { title: 'Last Update', dataIndex: 'updatedDate' },
    {
      title: 'Status',
      dataIndex: 'status',
      render: (v) => <StatusTag status={v} />,
    },
  ]

  return (
    <>
      <PageHeader title="Allocation History" subtitle="Full audit trail of every hostel allocation." />

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
          <Select
            style={{ width: 200 }}
            placeholder="All statuses"
            value={statusFilter}
            onChange={setStatusFilter}
            options={[
              { label: 'All statuses', value: 'all' },
              ...[
                'applied',
                'under_review',
                'approved',
                'waitlisted',
                'allocated',
                'occupied',
                'rejected',
                'cancelled',
              ].map((s) => ({ label: s, value: s })),
            ]}
          />
          <TableSearchBar query={query} onQuery={setQuery} placeholder="Search..." />
        </Space>

        <DataTable
          rowKey="id"
          loading={loading}
          dataSource={searchFiltered}
          columns={columns}
          expandable={{
            expandedRowRender: (record) => (
              <Timeline
                style={{ maxWidth: 720 }}
                items={(record.history || []).map((h) => ({
                  color:
                    h.status === 'rejected' || h.status === 'cancelled' ? 'red' : 'blue',
                  children: (
                    <Typography.Text>
                      <StatusTag status={h.status} /> {h.note} — {h.date}
                      {h.by ? ` (by ${h.by})` : ''}
                    </Typography.Text>
                  ),
                }))}
              />
            ),
          }}
        />
      </Card>
    </>
  )
}