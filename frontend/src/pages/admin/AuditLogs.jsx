import { useMemo, useState } from 'react'
import { Card, Col, Row, Select, Tag } from 'antd'
import { useResource } from '../../hooks/useResource'
import { useTableFilter } from '../../hooks/useTableFilter'
import PageHeader from '../../components/PageHeader'
import DataTable from '../../components/DataTable'
import TableSearchBar from '../../components/TableSearchBar'
import { formatDateTime } from '../../utils/format'

const ROLE_COLORS = {
  admin: 'gold',
  warden: 'blue',
  chief_warden: 'blue',
  deputy_warden: 'blue',
  assistant_warden: 'blue',
  student: 'green',
  mess_manager: 'purple',
  security: 'red',
  housekeeping: 'orange',
  caretaker: 'cyan',
}

export default function AuditLogs() {
  const { data, loading } = useResource('/audit-logs')
  const { query, setQuery, filtered } = useTableFilter(data, ['actor', 'action', 'entity', 'target'])
  const [entity, setEntity] = useState('all')

  const entityOptions = useMemo(() => {
    const set = new Set(data.map((log) => log.entity))
    return [{ value: 'all', label: 'All entities' }, ...[...set].sort().map((e) => ({ value: e, label: e }))]
  }, [data])

  const scoped = entity === 'all' ? filtered : filtered.filter((log) => log.entity === entity)

  const columns = [
    { title: 'Timestamp', dataIndex: 'timestamp', render: (v) => formatDateTime(v) },
    {
      title: 'Actor',
      dataIndex: 'actor',
      render: (v, r) => (
        <Tag color={r.actorRole ? ROLE_COLORS[r.actorRole] || 'default' : 'blue'}>
          {v}
          {r.actorRole ? ` (${r.actorRole})` : ''}
        </Tag>
      ),
    },
    { title: 'Action', dataIndex: 'action' },
    { title: 'Entity', dataIndex: 'entity', render: (v) => <Tag>{v}</Tag> },
    { title: 'Target', dataIndex: 'target' },
    { title: 'Before', dataIndex: 'before' },
    { title: 'After', dataIndex: 'after' },
  ]

  return (
    <>
      <PageHeader title="Audit Logs" subtitle="Record of administrative actions." />
      <Card
        extra={
          <Row gutter={8}>
            <Col>
              <Select
                value={entity}
                onChange={setEntity}
                options={entityOptions}
                style={{ width: 180 }}
              />
            </Col>
            <Col>
              <TableSearchBar query={query} onQuery={setQuery} placeholder="Search..." />
            </Col>
          </Row>
        }
      >
        <DataTable rowKey="id" loading={loading} dataSource={scoped} columns={columns} />
      </Card>
    </>
  )
}