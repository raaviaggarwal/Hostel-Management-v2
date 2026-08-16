import { useMemo } from 'react'
import { Card, Col, Row, Skeleton, Statistic } from 'antd'
import { ClearOutlined, CheckCircleOutlined, ClockCircleOutlined, SyncOutlined } from '@ant-design/icons'
import { useResource } from '../../hooks/useResource'
import PageHeader from '../../components/PageHeader'

export default function HousekeepingDashboard() {
  const { data: tasks, loading } = useResource('/housekeeping')

  const stats = useMemo(
    () => ({
      total: tasks.length,
      pending: tasks.filter((t) => t.status === 'pending').length,
      inProgress: tasks.filter((t) => t.status === 'in_progress').length,
      completed: tasks.filter((t) => t.status === 'completed').length,
    }),
    [tasks]
  )

  if (loading) return <Skeleton active paragraph={{ rows: 12 }} />

  return (
    <>
      <PageHeader title="Housekeeping Dashboard" subtitle="Cleaning tasks assigned to your hostel." />

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={6}>
          <Card size="small">
            <Statistic title="Total Tasks" value={stats.total} prefix={<ClearOutlined />} />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card size="small">
            <Statistic
              title="Pending"
              value={stats.pending}
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
              title="Completed"
              value={stats.completed}
              valueStyle={{ color: '#1B8A6B' }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
      </Row>
    </>
  )
}