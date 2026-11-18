import { useMemo } from 'react'
import { Card, Col, Row, Statistic, Tag } from 'antd'
import { useResource } from '../../hooks/useResource'
import PageHeader from '../../components/PageHeader'
import DataTable from '../../components/DataTable'
import StatusTag from '../../components/StatusTag'

export default function StudentEntryExit() {
  const { data, loading } = useResource('/student/entry-exit')

  const summary = useMemo(
    () => ({
      entries: data.filter((e) => e.type === 'entry').length,
      exits: data.filter((e) => e.type === 'exit').length,
      late: data.filter((e) => e.status === 'late').length,
      violations: data.filter((e) => e.status === 'violation').length,
    }),
    [data]
  )

  const columns = [
    { title: 'Date', dataIndex: 'date' },
    { title: 'Time', dataIndex: 'time' },
    {
      title: 'Type',
      dataIndex: 'type',
      render: (v) => (
        <Tag color={v === 'entry' ? 'green' : 'orange'}>{v === 'entry' ? 'Entry' : 'Exit'}</Tag>
      ),
    },
    { title: 'Gate', dataIndex: 'gate' },
    { title: 'Status', dataIndex: 'status', render: (v) => <StatusTag status={v} /> },
    { title: 'Late (min)', dataIndex: 'lateMinutes', render: (v) => v || 0 },
  ]

  return (
    <>
      <PageHeader title="Entry / Exit" subtitle="Your biometric gate records." />

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={6}>
          <Card size="small">
            <Statistic title="Entries" value={summary.entries} valueStyle={{ color: '#1B8A6B' }} />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card size="small">
            <Statistic title="Exits" value={summary.exits} valueStyle={{ color: '#C9820A' }} />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card size="small">
            <Statistic title="Late Entries" value={summary.late} valueStyle={{ color: '#C0392B' }} />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card size="small">
            <Statistic title="Violations" value={summary.violations} valueStyle={{ color: '#C0392B' }} />
          </Card>
        </Col>
      </Row>

      <Card>
        {data.length === 0 ? (
          <Card size="small" style={{ textAlign: 'center' }}>
            <Tag color="default">No gate records yet</Tag>
          </Card>
        ) : (
          <DataTable
            rowKey="id"
            loading={loading}
            dataSource={data}
            columns={columns}
            pagination={false}
          />
        )}
      </Card>
    </>
  )
}