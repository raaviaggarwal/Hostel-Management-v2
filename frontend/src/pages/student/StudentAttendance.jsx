import { useMemo } from 'react'
import { Card, Col, Row, Statistic, Tag } from 'antd'
import { useResource } from '../../hooks/useResource'
import PageHeader from '../../components/PageHeader'
import DataTable from '../../components/DataTable'
import StatusTag from '../../components/StatusTag'

export default function StudentAttendance() {
  const { data, loading } = useResource('/student/attendance')

  const summary = useMemo(
    () => ({
      present: data.filter((a) => a.status === 'present').length,
      absent: data.filter((a) => a.status === 'absent').length,
      leave: data.filter((a) => a.status === 'leave').length,
    }),
    [data]
  )

  const columns = [
    { title: 'Date', dataIndex: 'date' },
    { title: 'Status', dataIndex: 'status', render: (v) => <StatusTag status={v} /> },
  ]

  return (
    <>
      <PageHeader title="Attendance" subtitle="Your attendance record." />

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={8}>
          <Card size="small">
            <Statistic title="Present" value={summary.present} valueStyle={{ color: '#1B8A6B' }} />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card size="small">
            <Statistic title="Absent" value={summary.absent} valueStyle={{ color: '#C0392B' }} />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card size="small">
            <Statistic title="On Leave" value={summary.leave} />
          </Card>
        </Col>
      </Row>

      <Card>
        {data.length === 0 ? (
          <Card size="small" style={{ textAlign: 'center' }}>
            <Tag color="default">No attendance records yet</Tag>
          </Card>
        ) : (
          <DataTable
            rowKey={(r) => `${r.date}-${r.studentId}`}
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
