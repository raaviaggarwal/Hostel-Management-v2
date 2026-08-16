import { useMemo } from 'react'
import { Card, Col, Row, Skeleton, Statistic } from 'antd'
import { ToolOutlined, SyncOutlined, CheckCircleOutlined, ClockCircleOutlined } from '@ant-design/icons'
import { useResource } from '../../hooks/useResource'
import PageHeader from '../../components/PageHeader'

export default function MaintenanceDashboard() {
  const { data: tickets, loading } = useResource('/maintenance')

  const stats = useMemo(
    () => ({
      total: tickets.length,
      reported: tickets.filter((t) => t.status === 'reported').length,
      inProgress: tickets.filter((t) => t.status === 'in_progress').length,
      resolved: tickets.filter((t) => t.status === 'resolved').length,
    }),
    [tickets]
  )

  if (loading) return <Skeleton active paragraph={{ rows: 12 }} />

  return (
    <>
      <PageHeader title="Maintenance Dashboard" subtitle="Repair tickets for your hostel." />

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={6}>
          <Card size="small">
            <Statistic title="Total Tickets" value={stats.total} prefix={<ToolOutlined />} />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card size="small">
            <Statistic
              title="Reported"
              value={stats.reported}
              valueStyle={{ color: '#C9820A' }}
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card size="small">
            <Statistic
              title="In Progress"
              value={stats.inProgress}
              valueStyle={{ color: '#04335C' }}
              prefix={<SyncOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card size="small">
            <Statistic
              title="Resolved"
              value={stats.resolved}
              valueStyle={{ color: '#1B8A6B' }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
      </Row>
    </>
  )
}