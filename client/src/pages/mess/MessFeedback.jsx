import { Card, Rate } from 'antd'
import { useResource } from '../../hooks/useResource'
import PageHeader from '../../components/PageHeader'
import DataTable from '../../components/DataTable'
import TableSearchBar from '../../components/TableSearchBar'
import { useTableFilter } from '../../hooks/useTableFilter'

export default function MessFeedback() {
  const { data, loading } = useResource('/mess/feedback')
  const { data: students } = useResource('/students')

  const nameOf = (id) => students.find((s) => s.id === id)?.name || `#${id}`

  const { query, setQuery, filtered } = useTableFilter(data, ['studentId', 'comment'])

  const columns = [
    { title: 'Student', dataIndex: 'studentId', render: (v) => nameOf(v) },
    { title: 'Date', dataIndex: 'date' },
    { title: 'Taste', dataIndex: 'taste', render: (v) => <Rate disabled defaultValue={v} /> },
    { title: 'Qty', dataIndex: 'quantity', render: (v) => <Rate disabled defaultValue={v} /> },
    { title: 'Hygiene', dataIndex: 'hygiene', render: (v) => <Rate disabled defaultValue={v} /> },
    { title: 'Variety', dataIndex: 'variety', render: (v) => <Rate disabled defaultValue={v} /> },
    { title: 'Overall', dataIndex: 'overall', render: (v) => <Rate disabled defaultValue={v} /> },
    { title: 'Comment', dataIndex: 'comment', ellipsis: true, render: (v) => v || '-' },
  ]

  return (
    <>
      <PageHeader title="Mess Feedback" subtitle="Daily meal ratings from students." />
      <Card>
        <div style={{ marginBottom: 16 }}>
          <TableSearchBar query={query} onQuery={setQuery} placeholder="Search student or comment..." />
        </div>
        <DataTable rowKey="id" loading={loading} dataSource={filtered} columns={columns} pagination={false} />
      </Card>
    </>
  )
}