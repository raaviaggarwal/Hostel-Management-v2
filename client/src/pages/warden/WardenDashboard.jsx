import { useEffect, useState } from 'react'
import { Card, Col, Row, Skeleton, Statistic, Progress } from 'antd'
import {
  TeamOutlined,
  AppstoreOutlined,
  BugOutlined,
  FileDoneOutlined,
  CalendarOutlined,
} from '@ant-design/icons'
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts'
import { resourceApi } from '../../api/client'
import PageHeader from '../../components/PageHeader'

const PALETTE = ['#04335C', '#1B8A6B', '#E8A13A', '#C0392B', '#5A67D8']

function toChartData(record) {
  return Object.entries(record || {}).map(([name, value]) => ({ name, value }))
}

function ChartCard({ title, children, height = 260 }) {
  return (
    <Card size="small" title={title}>
      <div style={{ height }}>{children}</div>
    </Card>
  )
}

export default function WardenDashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    resourceApi
      .get('/warden/dashboard')
      .then(setData)
      .finally(() => setLoading(false))
  }, [])

  if (loading || !data) {
    return <Skeleton active paragraph={{ rows: 12 }} />
  }

  const s = data.stats

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle="Overview of your hostel: students, rooms and day-to-day operations."
      />

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={6}>
          <Card size="small">
            <Statistic title="Students" value={s.totalStudents} prefix={<TeamOutlined />} />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card size="small">
            <Statistic title="Total Rooms" value={s.totalRooms} prefix={<AppstoreOutlined />} />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card size="small">
            <Statistic
              title="Occupied Rooms"
              value={s.occupiedRooms}
              valueStyle={{ color: '#04335C' }}
              prefix={<AppstoreOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card size="small">
            <Statistic
              title="Pending Applications"
              value={s.pendingAllocations}
              valueStyle={{ color: '#E8A13A' }}
              prefix={<FileDoneOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card size="small">
            <Statistic
              title="New Complaints"
              value={s.newComplaints}
              valueStyle={{ color: '#C0392B' }}
              prefix={<BugOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card size="small">
            <Statistic
              title="Pending Leaves"
              value={s.pendingLeaves}
              valueStyle={{ color: '#5A67D8' }}
              prefix={<CalendarOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card size="small">
            <Statistic
              title="Waitlisted"
              value={s.waitlisted}
              valueStyle={{ color: '#E8A13A' }}
              prefix={<FileDoneOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card size="small" title="Room Occupancy">
            <div style={{ padding: '12px 0' }}>
              <Progress
                type="dashboard"
                percent={s.occupancy}
                strokeColor="#04335C"
                size={120}
              />
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card size="small">
            <Statistic
              title="Total Complaints"
              value={s.totalComplaints}
              prefix={<BugOutlined />}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={12}>
          <ChartCard title="Complaints by Status">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={toChartData(data.charts.complaintsByStatus)}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={55}
                  outerRadius={90}
                  paddingAngle={2}
                  label
                >
                  {toChartData(data.charts.complaintsByStatus).map((entry, index) => (
                    <Cell key={entry.name} fill={PALETTE[index % PALETTE.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
        </Col>

        <Col xs={24} lg={12}>
          <ChartCard title="Leave Requests by Status">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={toChartData(data.charts.leavesByStatus)}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={55}
                  outerRadius={90}
                  paddingAngle={2}
                  label
                >
                  {toChartData(data.charts.leavesByStatus).map((entry, index) => (
                    <Cell key={entry.name} fill={PALETTE[index % PALETTE.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
        </Col>

        <Col xs={24}>
          <ChartCard title="Room Occupancy by Block" height={300}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.charts.blockOccupancy}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Bar dataKey="total" name="Total Rooms" fill="#E8A13A" />
                <Bar dataKey="occupied" name="Occupied" fill="#04335C" />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </Col>
      </Row>
    </>
  )
}
