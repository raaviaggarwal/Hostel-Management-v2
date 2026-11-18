import { useMemo } from 'react'
import { Card, Col, Row, Skeleton, Statistic } from 'antd'
import { CoffeeOutlined, BugOutlined, LikeOutlined, ReadOutlined } from '@ant-design/icons'
import { useResource } from '../../hooks/useResource'
import PageHeader from '../../components/PageHeader'

const avg = (list, key) =>
  list.length ? (list.reduce((s, f) => s + (f[key] || 0), 0) / list.length).toFixed(1) : '-'

export default function MessDashboard() {
  const { data: feedback, loading } = useResource('/mess/feedback')
  const { data: complaints } = useResource('/mess/complaints')
  const { data: inspections } = useResource('/mess/inspections')
  const { data: menu } = useResource('/mess-menu')

  const stats = useMemo(
    () => ({
      overall: avg(feedback, 'overall'),
      taste: avg(feedback, 'taste'),
      hygiene: avg(feedback, 'hygiene'),
      openComplaints: complaints.filter((c) => c.status === 'open').length,
      inspections: inspections.length,
      today: menu.find(
        (m) =>
          m.day ===
          new Date().toLocaleDateString('en-US', { weekday: 'long' })
      ),
    }),
    [feedback, complaints, inspections, menu]
  )

  if (loading) return <Skeleton active paragraph={{ rows: 12 }} />

  return (
    <>
      <PageHeader title="Mess Dashboard" subtitle="Feedback, complaints and kitchen inspections." />

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={6}>
          <Card size="small">
            <Statistic title="Overall Rating" value={stats.overall} prefix={<LikeOutlined />} />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card size="small">
            <Statistic title="Taste" value={stats.taste} prefix={<CoffeeOutlined />} />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card size="small">
            <Statistic title="Hygiene" value={stats.hygiene} prefix={<CoffeeOutlined />} />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card size="small">
            <Statistic
              title="Open Complaints"
              value={stats.openComplaints}
              valueStyle={{ color: '#C0392B' }}
              prefix={<BugOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card size="small">
            <Statistic title="Inspections" value={stats.inspections} prefix={<ReadOutlined />} />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card size="small">
            <Statistic title="Today's Breakfast" value={stats.today?.breakfast || '-'} />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card size="small">
            <Statistic title="Today's Lunch" value={stats.today?.lunch || '-'} />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card size="small">
            <Statistic title="Today's Dinner" value={stats.today?.dinner || '-'} />
          </Card>
        </Col>
      </Row>
    </>
  )
}