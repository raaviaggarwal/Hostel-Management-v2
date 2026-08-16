import { useEffect, useState } from 'react'
import { Card, Col, Empty, Row, Skeleton, Statistic, Tag, Typography } from 'antd'
import {
  WalletOutlined,
  BugOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  TeamOutlined,
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { resourceApi } from '../../api/client'
import { useAuth } from '../../context/auth'
import PageHeader from '../../components/PageHeader'
import StatusTag from '../../components/StatusTag'

export default function StudentDashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    resourceApi
      .get('/student/dashboard')
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <Skeleton active paragraph={{ rows: 12 }} />

  if (!data) {
    return (
      <Empty
        description="No student record linked to this account yet. Apply for a room to get started."
        style={{ marginTop: 80 }}
      />
    )
  }

  const s = data.stats

  return (
    <>
      <PageHeader
        title={`Welcome, ${user?.name?.split(' ')[0] || 'Student'}`}
        subtitle="Your hostel dashboard — fees, complaints, leave and more."
      />

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={6}>
          <Card size="small">
            <Statistic title="Total Fees" value={s.feesTotal} prefix={<WalletOutlined />} />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card size="small">
            <Statistic
              title="Fees Paid"
              value={s.feesPaid}
              valueStyle={{ color: '#1B8A6B' }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card size="small">
            <Statistic
              title="Fees Pending"
              value={s.feesPending}
              valueStyle={{ color: '#C0392B' }}
              prefix={<WalletOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card size="small">
            <Statistic
              title="Open Complaints"
              value={s.complaintsOpen}
              valueStyle={{ color: '#E8A13A' }}
              prefix={<BugOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card size="small">
            <Statistic
              title="Pending Leaves"
              value={s.leavesPending}
              valueStyle={{ color: '#5A67D8' }}
              prefix={<CalendarOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card size="small">
            <Statistic
              title="Days Present"
              value={s.attendancePresent}
              prefix={<TeamOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card size="small">
            <Statistic
              title="Days Absent"
              value={s.attendanceAbsent}
              valueStyle={{ color: '#C0392B' }}
              prefix={<TeamOutlined />}
            />
          </Card>
        </Col>

        <Col xs={24} lg={10}>
          <Card
            size="small"
            title="My Allocation"
            extra={
              <Tag color={data.allocation ? 'gold' : 'default'}>
                {data.allocation ? data.allocation.status : 'None'}
              </Tag>
            }
          >
            {data.allocation ? (
              <div>
                <Typography.Paragraph>
                  Room <strong>{data.allocation.roomNo || '—'}</strong> (
                  {data.allocation.roomType || 'any'}) · Applied on {data.allocation.appliedDate}
                </Typography.Paragraph>
                <StatusTag status={data.allocation.status} />
              </div>
            ) : (
              <Typography.Text type="secondary">No allocation yet.</Typography.Text>
            )}
          </Card>
        </Col>

        <Col xs={24} lg={14}>
          <Card size="small" title="Recent Complaints">
            {data.recentComplaints.length === 0 ? (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No complaints" />
            ) : (
              data.recentComplaints.map((complaint) => (
                <div
                  key={complaint.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: 12,
                    padding: '8px 0',
                    borderBottom: '1px solid rgba(0,0,0,0.06)',
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <Typography.Text strong>{complaint.complaintType}</Typography.Text>
                    <Typography.Paragraph type="secondary" ellipsis style={{ margin: 0 }}>
                      {complaint.complaintDetails}
                    </Typography.Paragraph>
                  </div>
                  <StatusTag status={complaint.complaintStatus} />
                </div>
              ))
            )}
          </Card>
        </Col>
      </Row>

      <Card
        size="small"
        title="Recent Notices"
        style={{ marginTop: 16 }}
        extra={
          <Typography.Link onClick={() => navigate('/student/notices')}>
            View all
          </Typography.Link>
        }
      >
        {data.recentNotices.length === 0 ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No active notices" />
        ) : (
          data.recentNotices.map((notice) => (
            <div key={notice.id} style={{ padding: '6px 0' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 12,
                  alignItems: 'center',
                }}
              >
                <Typography.Text strong>{notice.title}</Typography.Text>
                <Typography.Text type="secondary">{notice.date}</Typography.Text>
              </div>
              <Typography.Paragraph type="secondary" style={{ margin: 0 }}>
                {notice.body}
              </Typography.Paragraph>
            </div>
          ))
        )}
      </Card>
    </>
  )
}
