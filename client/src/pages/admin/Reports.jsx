import { useEffect, useState } from 'react'
import { Button, Card, Col, Row, Skeleton, Statistic, Table, Tag, Typography } from 'antd'
import { DownloadOutlined, WalletOutlined, BugOutlined, TeamOutlined, ToolOutlined, LikeOutlined } from '@ant-design/icons'
import { resourceApi } from '../../api/client'
import PageHeader from '../../components/PageHeader'
import { downloadCsv, formatCurrency } from '../../utils/format'

const EXPORTS = {
  students: { endpoint: '/students' },
  fees: { endpoint: '/fees' },
  complaints: {
    endpoint: '/complaints',
    columns: [
      { key: 'complainNumber', label: 'Complaint No' },
      { key: 'studentName', label: 'Student' },
      { key: 'complaintType', label: 'Type' },
      { key: 'complaintDetails', label: 'Details' },
      { key: 'complaintStatus', label: 'Status' },
      { key: 'registrationDate', label: 'Registered On' },
    ],
  },
  maintenance: {
    endpoint: '/maintenance',
    columns: [
      { key: 'id', label: 'Ticket ID' },
      { key: 'studentName', label: 'Student' },
      { key: 'roomNo', label: 'Room' },
      { key: 'category', label: 'Category' },
      { key: 'description', label: 'Description' },
      { key: 'priority', label: 'Priority' },
      { key: 'status', label: 'Status' },
      { key: 'assignedTo', label: 'Assigned To' },
      { key: 'createdDate', label: 'Raised On' },
      { key: 'resolvedDate', label: 'Resolved On' },
      { key: 'rating', label: 'Rating' },
    ],
  },
  visitors: {
    endpoint: '/visitors',
    columns: [
      { key: 'visitorName', label: 'Visitor' },
      { key: 'relation', label: 'Relation' },
      { key: 'studentName', label: 'Student' },
      { key: 'date', label: 'Date' },
      { key: 'inTime', label: 'In Time' },
      { key: 'outTime', label: 'Out Time' },
      { key: 'purpose', label: 'Purpose' },
      { key: 'status', label: 'Status' },
    ],
  },
  inventory: {
    endpoint: '/inventory',
    columns: [
      { key: 'id', label: 'ID' },
      { key: 'item', label: 'Item' },
      { key: 'quantity', label: 'Quantity' },
      { key: 'condition', label: 'Condition' },
      { key: 'status', label: 'Status' },
      { key: 'assignedTo', label: 'Assigned To' },
    ],
  },
  housekeeping: {
    endpoint: '/housekeeping',
    columns: [
      { key: 'id', label: 'Task ID' },
      { key: 'taskType', label: 'Task' },
      { key: 'area', label: 'Area' },
      { key: 'assignedTo', label: 'Assigned To' },
      { key: 'schedule', label: 'Scheduled' },
      { key: 'status', label: 'Status' },
      { key: 'inspected', label: 'Inspected' },
      { key: 'rating', label: 'Rating' },
    ],
  },
  'mess-feedback': {
    endpoint: '/mess/feedback',
    columns: [
      { key: 'id', label: 'ID' },
      { key: 'studentId', label: 'Student ID' },
      { key: 'date', label: 'Date' },
      { key: 'overall', label: 'Overall' },
      { key: 'taste', label: 'Taste' },
      { key: 'quantity', label: 'Quantity' },
      { key: 'hygiene', label: 'Hygiene' },
      { key: 'variety', label: 'Variety' },
      { key: 'temperature', label: 'Temperature' },
      { key: 'comment', label: 'Comment' },
    ],
  },
  'audit-logs': {
    endpoint: '/audit-logs',
    columns: [
      { key: 'id', label: 'ID' },
      { key: 'actor', label: 'Actor' },
      { key: 'action', label: 'Action' },
      { key: 'entity', label: 'Entity' },
      { key: 'target', label: 'Target' },
      { key: 'timestamp', label: 'Timestamp' },
    ],
  },
}

export default function Reports() {
  const [report, setReport] = useState(null)

  useEffect(() => {
    resourceApi.get('/admin/reports').then(setReport)
  }, [])

  if (!report) return <Skeleton active paragraph={{ rows: 12 }} />

  const occupancyColumns = [
    { title: 'Hostel', dataIndex: 'hostel' },
    { title: 'Total Rooms', dataIndex: 'total' },
    { title: 'Occupied', dataIndex: 'occupied', render: (v) => <Tag color="blue">{v}</Tag> },
    { title: 'Free', dataIndex: 'free', render: (v) => <Tag color="green">{v}</Tag> },
  ]

  const complaintsColumns = [
    { title: 'Complaint Type', dataIndex: 'type' },
    { title: 'Count', dataIndex: 'count', render: (v) => <Tag color="orange">{v}</Tag> },
  ]

  const download = async (kind) => {
    const config = EXPORTS[kind]
    const list = await resourceApi.get(config.endpoint)
    downloadCsv(`${kind}.csv`, list, config.columns)
  }

  return (
    <>
      <PageHeader
        title="Reports"
        subtitle="Summary reports and data exports."
        extra={
          <Row gutter={8}>
            <Col>
              <Button icon={<DownloadOutlined />} onClick={() => download('students')}>
                Students
              </Button>
            </Col>
            <Col>
              <Button icon={<DownloadOutlined />} onClick={() => download('fees')}>
                Fees
              </Button>
            </Col>
            <Col>
              <Button icon={<DownloadOutlined />} onClick={() => download('complaints')}>
                Complaints
              </Button>
            </Col>
            <Col>
              <Button icon={<DownloadOutlined />} onClick={() => download('maintenance')}>
                Maintenance
              </Button>
            </Col>
            <Col>
              <Button icon={<DownloadOutlined />} onClick={() => download('visitors')}>
                Visitors
              </Button>
            </Col>
            <Col>
              <Button icon={<DownloadOutlined />} onClick={() => download('inventory')}>
                Inventory
              </Button>
            </Col>
            <Col>
              <Button icon={<DownloadOutlined />} onClick={() => download('housekeeping')}>
                Housekeeping
              </Button>
            </Col>
            <Col>
              <Button icon={<DownloadOutlined />} onClick={() => download('mess-feedback')}>
                Mess Feedback
              </Button>
            </Col>
            <Col>
              <Button icon={<DownloadOutlined />} onClick={() => download('audit-logs')}>
                Audit Logs
              </Button>
            </Col>
          </Row>
        }
      />

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={6}>
          <Card size="small">
            <Statistic
              title="Total Fees"
              value={report.feeSummary.total}
              prefix={<WalletOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card size="small">
            <Statistic
              title="Collected"
              value={report.feeSummary.collected}
              valueStyle={{ color: '#1B8A6B' }}
              prefix={<WalletOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card size="small">
            <Statistic
              title="Pending"
              value={report.feeSummary.pending}
              valueStyle={{ color: '#C0392B' }}
              prefix={<WalletOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card size="small">
            <Statistic title="Total Complaints" value={report.totalComplaints} prefix={<BugOutlined />} />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card size="small">
            <Statistic
              title="Open Complaints"
              value={report.openComplaints}
              valueStyle={{ color: '#E8A13A' }}
              prefix={<BugOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card size="small">
            <Statistic
              title="Students Present"
              value={report.attendanceSummary.present}
              prefix={<TeamOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card size="small">
            <Statistic
              title="Students Absent"
              value={report.attendanceSummary.absent}
              valueStyle={{ color: '#C0392B' }}
              prefix={<TeamOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card size="small">
            <Statistic
              title="On Leave"
              value={report.attendanceSummary.leave}
              prefix={<TeamOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card size="small">
            <Statistic
              title="Campus Fees"
              value={formatCurrency(report.feeByCampus.campus)}
              valueStyle={{ color: '#04335C' }}
              prefix={<WalletOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card size="small">
            <Statistic
              title="Off-Campus Fees"
              value={formatCurrency(report.feeByCampus['off-campus'])}
              valueStyle={{ color: '#5A67D8' }}
              prefix={<WalletOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card size="small">
            <Statistic
              title="Open Maintenance"
              value={report.maintenanceSummary.open}
              valueStyle={{ color: '#C0392B' }}
              prefix={<ToolOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card size="small">
            <Statistic
              title="Maintenance Rating"
              value={report.maintenanceSummary.avgRating}
              prefix={<LikeOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card size="small">
            <Statistic title="Mess Rating" value={report.messRating} prefix={<LikeOutlined />} />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={12}>
          <Card
            size="small"
            title="Hostel Occupancy"
            extra={
              <Typography.Text type="secondary">
                {report.attendanceSummary.date ? `as of ${report.attendanceSummary.date}` : 'no data'}
              </Typography.Text>
            }
          >
            <Table
              rowKey="hostel"
              size="small"
              pagination={false}
              dataSource={report.occupancy}
              columns={occupancyColumns}
            />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card
            size="small"
            title="Complaints by Type"
            extra={<Typography.Text strong>{formatCurrency(report.feeSummary.pending)} pending</Typography.Text>}
          >
            <Table
              rowKey="type"
              size="small"
              pagination={false}
              dataSource={Object.entries(report.complaintsByType).map(([type, count]) => ({
                type,
                count,
              }))}
              columns={complaintsColumns}
            />
          </Card>
        </Col>
      </Row>
    </>
  )
}
