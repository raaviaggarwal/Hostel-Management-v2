import { useEffect, useState } from 'react'
import { Button, Card, Col, Row, Skeleton, Statistic, Table, Tag, Typography } from 'antd'
import { DownloadOutlined, WalletOutlined, BugOutlined, TeamOutlined } from '@ant-design/icons'
import { resourceApi } from '../../api/client'
import PageHeader from '../../components/PageHeader'
import { downloadCsv, formatCurrency } from '../../utils/format'

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
    const list = await resourceApi.get(`/${kind}`)
    downloadCsv(`${kind}.csv`, list)
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
