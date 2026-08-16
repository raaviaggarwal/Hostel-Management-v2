import { useMemo, useState } from 'react'
import { Card, DatePicker, Select, Space, Tag } from 'antd'
import { useResource } from '../../hooks/useResource'
import PageHeader from '../../components/PageHeader'
import DataTable from '../../components/DataTable'
import StatusTag from '../../components/StatusTag'
import TableSearchBar from '../../components/TableSearchBar'
import { useTableFilter } from '../../hooks/useTableFilter'

export default function EntryExit() {
  const [studentId, setStudentId] = useState()
  const [date, setDate] = useState()
  const { data, loading } = useResource('/entry-exit')
  const { data: students } = useResource('/students')

  const nameOf = (id) => students.find((s) => s.id === id)?.name || `#${id}`

  const filtered = useMemo(() => {
    let list = data
    if (studentId) list = list.filter((e) => e.studentId === studentId)
    if (date) list = list.filter((e) => e.date === date.format('YYYY-MM-DD'))
    return list
  }, [data, studentId, date])

  const { query, setQuery, filtered: searchFiltered } = useTableFilter(filtered, ['studentId', 'gate'])

  const columns = [
    { title: 'Student', dataIndex: 'studentId', render: (v) => nameOf(v) },
    { title: 'Date', dataIndex: 'date' },
    { title: 'Time', dataIndex: 'time' },
    {
      title: 'Type',
      dataIndex: 'type',
      render: (v) => <Tag color={v === 'entry' ? 'green' : 'orange'}>{v === 'entry' ? 'Entry' : 'Exit'}</Tag>,
    },
    { title: 'Gate', dataIndex: 'gate' },
    { title: 'Status', dataIndex: 'status', render: (v) => <StatusTag status={v} /> },
    { title: 'Late (min)', dataIndex: 'lateMinutes', render: (v) => v || 0 },
  ]

  return (
    <>
      <PageHeader title="Entry / Exit" subtitle="Biometric gate punches across all hostels." />

      <Card title="Filters" style={{ marginBottom: 16 }}>
        <Space wrap>
          <Select
            allowClear
            showSearch
            optionFilterProp="label"
            style={{ minWidth: 240 }}
            placeholder="Filter by student"
            value={studentId}
            onChange={setStudentId}
            options={students.map((s) => ({ label: `${s.name} (${s.roomno || 'no room'})`, value: s.id }))}
          />
          <DatePicker
            placeholder="Filter by date"
            value={date}
            onChange={setDate}
          />
          <TableSearchBar query={query} onQuery={setQuery} placeholder="Search..." />
        </Space>
      </Card>

      <Card>
        <DataTable rowKey="id" loading={loading} dataSource={searchFiltered} columns={columns} />
      </Card>
    </>
  )
}