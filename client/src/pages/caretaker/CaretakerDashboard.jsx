import { useMemo } from 'react'
import { Card, Col, Row, Skeleton, Statistic, Progress } from 'antd'
import { AppstoreOutlined, ClearOutlined, ToolOutlined, TeamOutlined } from '@ant-design/icons'
import { useResource } from '../../hooks/useResource'
import PageHeader from '../../components/PageHeader'

export default function CaretakerDashboard() {
  const { data: tasks, loading } = useResource('/housekeeping')
  const { data: tickets } = useResource('/maintenance')
  const { data: rooms } = useResource('/rooms?hostelId=2')

  const stats = useMemo(() => {
    const occupied = rooms.filter((r) => r.occupants.length > 0).length
    return {
      rooms: rooms.length,
      occupied,
      occupancy: rooms.length ? Math.round((occupied / rooms.length) * 100) : 0,
      pendingTasks: tasks.filter((t) => t.status !== 'completed').length,
      openTickets: tickets.filter((t) => t.status !== 'resolved').length,
    }
  }, [tasks, tickets, rooms])

  if (loading) return <Skeleton active paragraph={{ rows: 12 }} />

  return (
    <>
      <PageHeader title="Caretaker Dashboard" subtitle="Room upkeep, housekeeping and maintenance overview." />

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={6}>
          <Card size="small">
            <Statistic title="Total Rooms" value={stats.rooms} prefix={<AppstoreOutlined />} />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card size="small">
            <Statistic title="Occupied" value={stats.occupied} prefix={<TeamOutlined />} />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card size="small">
            <Statistic
              title="Pending Housekeeping"
              value={stats.pendingTasks}
              prefix={<ClearOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card size="small">
            <Statistic
              title="Open Maintenance"
              value={stats.openTickets}
              valueStyle={{ color: '#C0392B' }}
              prefix={<ToolOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card size="small" title="Room Occupancy">
            <div style={{ padding: '12px 0' }}>
              <Progress type="dashboard" percent={stats.occupancy} strokeColor="#04335C" size={120} />
            </div>
          </Card>
        </Col>
      </Row>
    </>
  )
}