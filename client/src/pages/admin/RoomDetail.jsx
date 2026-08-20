import { useParams, useNavigate } from 'react-router-dom'
import { App as AntApp, Button, Card, Col, Descriptions, Empty, Row, Select, Skeleton, Statistic, Table } from 'antd'
import { ArrowLeftOutlined } from '@ant-design/icons'
import { useResource } from '../../hooks/useResource'
import { resourceApi } from '../../api/client'
import PageHeader from '../../components/PageHeader'
import StatusTag from '../../components/StatusTag'

const STATUS_OPTIONS = [
  { label: 'Available', value: 'available' },
  { label: 'Maintenance', value: 'maintenance' },
  { label: 'Medical Reserve', value: 'medical_reserved' },
  { label: 'Cleaning', value: 'cleaning' },
  { label: 'Blocked', value: 'blocked' },
]

export default function RoomDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { message } = AntApp.useApp()
  const { data, loading, reload } = useResource(`/rooms/${id}`)

  if (loading) return <Skeleton active paragraph={{ rows: 10 }} />
  if (!data || !data.id) return <Empty description="Room not found" style={{ marginTop: 60 }} />

  const changeStatus = async (status) => {
    try {
      await resourceApi.update(`/rooms/${id}/status`, status)
      message.success(`Status → ${status}`)
      reload()
    } catch (error) {
      message.error(error.message)
    }
  }

  return (
    <>
      <PageHeader
        title={`Room ${data.roomNo}`}
        subtitle={`${data.hostel} · ${data.wing} · Floor ${data.floor}`}
        extra={
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/admin/rooms')}>
            Back to Rooms
          </Button>
        }
      />

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={6}>
          <Card size="small">
            <Statistic title="Type" value={data.type.charAt(0).toUpperCase() + data.type.slice(1)} />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card size="small">
            <Statistic title="Seater" value={data.seater} />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card size="small">
            <Statistic title="Occupied" value={`${data.occupants.length}/${data.seater}`} />
          </Card>
        </Col>
      </Row>

      <Card
        style={{ marginTop: 16 }}
        title="Status"
        extra={
          <Select
            style={{ width: 200 }}
            value={data.medicalReserved ? 'medical_reserved' : data.status}
            options={STATUS_OPTIONS}
            onChange={changeStatus}
          />
        }
      >
        <Descriptions
          column={2}
          size="small"
          bordered
          items={[
            { key: 'status', label: 'Status', children: <StatusTag status={data.medicalReserved ? 'medical_reserved' : data.status} /> },
            { key: 'wing', label: 'Wing', children: data.wing },
            { key: 'hostel', label: 'Hostel', children: data.hostel },
            { key: 'floor', label: 'Floor', children: data.floor },
          ]}
        />
      </Card>

      <Card style={{ marginTop: 16 }} title="Occupants">
        <Table
          rowKey="id"
          size="middle"
          bordered
          pagination={false}
          dataSource={data.occupants}
          locale={{ emptyText: <Empty description="No occupants" /> }}
          columns={[
            { title: 'Reg No', dataIndex: 'regNo' },
            { title: 'Name', dataIndex: 'name' },
            { title: 'Year', dataIndex: 'year' },
            { title: 'Course', dataIndex: 'course' },
            { title: 'Allocation Status', dataIndex: 'allocationStatus', render: (v) => (v ? <StatusTag status={v} /> : '-') },
          ]}
        />
      </Card>

      {data.inventory?.length > 0 && (
        <Card style={{ marginTop: 16 }} title="Inventory">
          <Table
            rowKey="id"
            size="middle"
            bordered
            pagination={false}
            dataSource={data.inventory}
            columns={[
              { title: 'Item', dataIndex: 'item' },
              { title: 'Quantity', dataIndex: 'quantity' },
              { title: 'Condition', dataIndex: 'condition', render: (v) => <StatusTag status={v} /> },
            ]}
          />
        </Card>
      )}
    </>
  )
}