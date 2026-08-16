import { useParams, useNavigate } from 'react-router-dom'
import { Button, Card, Col, Descriptions, Empty, Row, Statistic, Tag, Skeleton } from 'antd'
import { ArrowLeftOutlined } from '@ant-design/icons'
import { useResource } from '../../hooks/useResource'
import PageHeader from '../../components/PageHeader'
import DataTable from '../../components/DataTable'
import StatusTag from '../../components/StatusTag'

export default function HostelDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data, loading } = useResource(`/hostels/${id}`)

  if (loading) return <Skeleton active paragraph={{ rows: 10 }} />
  if (!data || !data.id) return <Empty description="Hostel not found" style={{ marginTop: 60 }} />

  const totalOccupied = data.rooms.reduce((s, r) => s + r.occupied, 0)

  const columns = [
    { title: 'Wing', dataIndex: 'wing' },
    { title: 'Room No', dataIndex: 'roomNo' },
    { title: 'Floor', dataIndex: 'floor' },
    { title: 'Type', dataIndex: 'type', render: (v) => v.charAt(0).toUpperCase() + v.slice(1) },
    { title: 'Seater', dataIndex: 'seater' },
    { title: 'Occupied', dataIndex: 'occupied', render: (v, r) => `${v}/${r.seater}` },
    { title: 'Status', dataIndex: 'status', render: (v) => <StatusTag status={v} /> },
  ]

  return (
    <>
      <PageHeader
        title={data.name}
        subtitle={`${data.code} · ${data.gender === 'male' ? 'Boys' : 'Girls'} · ${data.type === 'freshers' ? 'Freshers' : 'Seniors'}`}
        extra={
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/admin/hostels')}>
            Back to Hostels
          </Button>
        }
      />

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={6}>
          <Card size="small">
            <Statistic title="Total Seats" value={data.seats} />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card size="small">
            <Statistic title="Wings" value={data.wings?.length || 0} />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card size="small">
            <Statistic title="Rooms" value={data.rooms.length} />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card size="small">
            <Statistic title="Occupied Beds" value={totalOccupied} />
          </Card>
        </Col>
      </Row>

      <Card style={{ marginTop: 16 }}>
        <Descriptions
          column={{ xs: 1, sm: 2, lg: 3 }}
          size="small"
          bordered
          style={{ marginBottom: 16 }}
          items={[
            { key: 'code', label: 'Code', children: data.code },
            { key: 'campus', label: 'Campus', children: <Tag>{data.campus === 'campus' ? 'On Campus' : 'Off Campus'}</Tag> },
            { key: 'address', label: 'Address', children: data.address || '-' },
            {
              key: 'occupancy',
              label: 'Occupancy',
              children: `${Math.round((totalOccupied / (data.seats || 1)) * 100)}%`,
            },
          ]}
        />
      </Card>

      <Card style={{ marginTop: 16 }} title="Rooms">
        <DataTable rowKey="id" loading={loading} dataSource={data.rooms} columns={columns} />
      </Card>
    </>
  )
}