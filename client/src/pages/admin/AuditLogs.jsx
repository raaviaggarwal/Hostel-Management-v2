import { Card, Tag } from 'antd'
import { useResource } from '../../hooks/useResource'
import { useTableFilter } from '../../hooks/useTableFilter'
import PageHeader from '../../components/PageHeader'
import DataTable from '../../components/DataTable'
import TableSearchBar from '../../components/TableSearchBar'
import { formatDateTime } from '../../utils/format'

export default function AuditLogs() {
  const { data, loading } = useResource('/audit-logs')
  const { query, setQuery, filtered } = useTableFilter(data, ['actor', 'action', 'entity', 'target'])

  const columns = [
    { title: 'Timestamp', dataIndex: 'timestamp', render: (v) => formatDateTime(v) },
    { title: 'Actor', dataIndex: 'actor', render: (v) => <Tag color="blue">{v}</Tag> },
    { title: 'Action', dataIndex: 'action' },
    { title: 'Entity', dataIndex: 'entity' },
    { title: 'Target', dataIndex: 'target' },
    { title: 'Before', dataIndex: 'before' },
    { title: 'After', dataIndex: 'after' },
  ]

  return (
    <>
      <PageHeader title="Audit Logs" subtitle="Record of administrative actions." />
      <Card extra={<TableSearchBar query={query} onQuery={setQuery} placeholder="Search..." />}>
        <DataTable rowKey="id" loading={loading} dataSource={filtered} columns={columns} />
      </Card>
    </>
  )
}