import { useEffect, useState } from 'react'
import { Card, Col, Row, Statistic, Skeleton, Table, Tag } from 'antd'
import {
  HomeOutlined,
  ApartmentOutlined,
  TeamOutlined,
  PercentageOutlined,
  FileDoneOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from 'recharts'
import { resourceApi } from '../../api/client'
import PageHeader from '../../components/PageHeader'

const GIRL_COLOR = '#E91E63'
const BOY_COLOR = '#04335C'

function GenderSummary({ title, color, hostels }) {
  const blocks = hostels.reduce((sum, h) => sum + (h.wings || 0), 0)
  const rooms = hostels.reduce((sum, h) => sum + h.rooms, 0)
  const occupied = hostels.reduce((sum, h) => sum + h.occupied, 0)
  const seats = hostels.reduce((sum, h) => sum + h.seats, 0)
  const items = [
    { title: 'Hostels', value: hostels.length },
    { title: 'Blocks', value: blocks },
    { title: 'Rooms', value: rooms },
    { title: 'Occupied', value: occupied },
    { title: 'Seats', value: seats },
    {
      title: 'Occupancy',
      value: seats ? Math.round((occupied / seats) * 100) : 0,
      suffix: '%',
    },
  ]
  return (
    <Card size="small" title={<span style={{ color }}>{title} Hostels</span>}>
      <Row gutter={[8, 8]}>
        {items.map((item) => (
          <Col span={8} key={item.title}>
            <Statistic
              title={item.title}
              value={item.value}
              suffix={item.suffix || ''}
              valueStyle={{ fontSize: 20, color }}
            />
          </Col>
        ))}
      </Row>
    </Card>
  )
}

export default function Dashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    resourceApi
      .get('/admin/dashboard')
      .then(setData)
      .finally(() => setLoading(false))
  }, [])

  if (loading || !data) {
    return <Skeleton active paragraph={{ rows: 12 }} />
  }

  const s = data.stats
  const girls = data.hostels.filter((h) => h.gender === 'female')
  const boys = data.hostels.filter((h) => h.gender === 'male')

  const occupancy = data.hostels.map((h) => ({
    name: h.name.split(' ').slice(0, 2).join(' '),
    gender: h.gender,
    Occupied: h.occupied,
    Available: h.available,
    occupancyPct: h.occupancyPct,
  }))

  const hostelColumns = [
    { title: 'Hostel', dataIndex: 'name' },
    {
      title: 'Gender',
      dataIndex: 'gender',
      render: (v) => (
        <Tag color={v === 'male' ? 'blue' : 'magenta'}>{v === 'male' ? 'Boys' : 'Girls'}</Tag>
      ),
    },
    {
      title: 'Type',
      dataIndex: 'type',
      render: (v) => <Tag>{v === 'freshers' ? 'Freshers' : 'Seniors'}</Tag>,
    },
    { title: 'Wings', dataIndex: 'wings' },
    { title: 'Rooms', dataIndex: 'rooms' },
    { title: 'Seats', dataIndex: 'seats' },
    { title: 'Occupied', dataIndex: 'occupied' },
    { title: 'Available', dataIndex: 'available' },
    {
      title: 'Occupancy',
      dataIndex: 'occupancyPct',
      render: (v) => (
        <Tag color={v >= 75 ? 'red' : v >= 50 ? 'gold' : 'green'}>{v}%</Tag>
      ),
    },
  ]

  const stats = [
    { title: 'Total Hostels', value: s.totalHostels, icon: <HomeOutlined />, color: GIRL_COLOR },
    { title: 'Campus Hostels', value: s.campusHostels, icon: <ApartmentOutlined />, color: '#5A67D8' },
    { title: 'Beds Occupied', value: s.occupiedBeds, icon: <TeamOutlined />, color: BOY_COLOR },
    { title: 'Overall Occupancy', value: s.occupancyPct, suffix: '%', icon: <PercentageOutlined />, color: '#1B8A6B' },
    { title: 'Pending Allocation', value: s.pendingAllocations, icon: <FileDoneOutlined />, color: '#E8A13A' },
    { title: 'Waitlisted', value: s.waitlisted, icon: <ClockCircleOutlined />, color: '#C0392B' },
  ]

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle="Hostel occupancy and allocation overview across boys' and girls' hostels."
      />

      <Row gutter={[16, 16]}>
        {stats.map((stat) => (
          <Col xs={24} sm={12} md={6} key={stat.title}>
            <Card size="small">
              <Statistic
                title={stat.title}
                value={stat.value}
                suffix={stat.suffix || ''}
                prefix={<span style={{ color: stat.color }}>{stat.icon}</span>}
              />
            </Card>
          </Col>
        ))}
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={12}>
          <GenderSummary title="Girls" color={GIRL_COLOR} hostels={girls} />
        </Col>
        <Col xs={24} lg={12}>
          <GenderSummary title="Boys" color={BOY_COLOR} hostels={boys} />
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={12}>
          <Card size="small" title="Hostel Occupancy (by gender)">
            <div style={{ height: 280 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={occupancy}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="Occupied" stackId="a" fill={BOY_COLOR} name="Occupied" />
                  <Bar dataKey="Available" stackId="a" fill="#E8A13A" name="Available" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card size="small" title="Hostels & Occupancy">
            <Table
              rowKey="id"
              size="small"
              pagination={false}
              scroll={{ x: true }}
              dataSource={data.hostels}
              columns={hostelColumns}
            />
          </Card>
        </Col>
      </Row>
    </>
  )
}