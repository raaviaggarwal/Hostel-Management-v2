import { useMemo } from 'react'
import { Card, Col, Row, Skeleton, Statistic } from 'antd'
import {
  SwapOutlined,
  LogoutOutlined,
  WarningOutlined,
} from '@ant-design/icons'
import { useResource } from '../../hooks/useResource'
import PageHeader from '../../components/PageHeader'

const todayLocal = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}`
}

export default function SecurityDashboard() {
  const { data: punches, loading } = useResource('/entry-exit')
  const { data: leaves } = useResource('/leaves')

  const stats = useMemo(() => {
    const today = punches.filter((e) => e.date === todayLocal())
    return {
      today: today.length,
      late: punches.filter((e) => e.status === 'late').length,
      violations: punches.filter((e) => e.status === 'violation').length,
      activeLeaves: leaves.filter((l) => l.status === 'active').length,
    }
  }, [punches, leaves])

  if (loading) return <Skeleton active paragraph={{ rows: 12 }} />

  return (
    <>
      <PageHeader title="Security Dashboard" subtitle="Gate control and out-pass verification." />

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={6}>
          <Card size="small">
            <Statistic title="Today's Punches" value={stats.today} prefix={<SwapOutlined />} />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card size="small">
            <Statistic
              title="Late Entries"
              value={stats.late}
              valueStyle={{ color: '#C9820A' }}
              prefix={<WarningOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card size="small">
            <Statistic
              title="Violations"
              value={stats.violations}
              valueStyle={{ color: '#C0392B' }}
              prefix={<WarningOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card size="small">
            <Statistic
              title="Students Outside"
              value={stats.activeLeaves}
              valueStyle={{ color: '#04335C' }}
              prefix={<LogoutOutlined />}
            />
          </Card>
        </Col>
      </Row>
    </>
  )
}