import { useEffect, useState } from 'react'
import { Alert, Card, Col, Empty, Row, Skeleton, Statistic, Tag, Typography } from 'antd'
import dayjs from 'dayjs'
import {
  BugOutlined,
  CalendarOutlined,
  TeamOutlined,
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { resourceApi } from '../../api/client'
import { useAuth } from '../../context/auth'
import PageHeader from '../../components/PageHeader'
import StatusTag from '../../components/StatusTag'

const DASHBOARD_REFRESH_INTERVAL_MS = 5000

export default function StudentDashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let active = true
    let latestRequest = 0
    const load = async () => {
      const requestId = ++latestRequest
      try {
        const result = await resourceApi.get('/student/dashboard')
        if (active && requestId === latestRequest) {
          setData(result)
          setError(null)
        }
      } catch (requestError) {
        if (!active || requestId !== latestRequest) return
        if (requestError.status === 404) {
          setData(null)
          setError(null)
        } else {
          setError(requestError)
        }
      } finally {
        if (active && requestId === latestRequest) setLoading(false)
      }
    }
    const refreshIfVisible = () => {
      if (document.visibilityState === 'visible') void load()
    }

    void load()
    const intervalId = window.setInterval(refreshIfVisible, DASHBOARD_REFRESH_INTERVAL_MS)
    window.addEventListener('focus', refreshIfVisible)
    document.addEventListener('visibilitychange', refreshIfVisible)

    return () => {
      active = false
      window.clearInterval(intervalId)
      window.removeEventListener('focus', refreshIfVisible)
      document.removeEventListener('visibilitychange', refreshIfVisible)
    }
  }, [])

  if (loading && !data) return <Skeleton active paragraph={{ rows: 12 }} />

  if (error && !data) {
    return (
      <Alert
        type="error"
        showIcon
        message="Unable to load the dashboard"
        description={error.message}
      />
    )
  }

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
        subtitle="Your hostel dashboard — complaints, leave, attendance and more."
      />
      {error && (
        <Alert
          type="warning"
          showIcon
          message="Dashboard refresh failed"
          description={error.message || 'The latest dashboard data could not be loaded.'}
          style={{ marginBottom: 16 }}
        />
      )}

      <Row gutter={[16, 16]}>
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
        title="Recent Leave and Out-Pass Requests"
        style={{ marginTop: 16 }}
        extra={
          <Typography.Link onClick={() => navigate('/student/leave')}>
            View all
          </Typography.Link>
        }
      >
        {data.recentRequests.length === 0 ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No requests yet" />
        ) : (
          data.recentRequests.map((request) => (
            <div
              key={request.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 12,
                padding: '6px 0',
              }}
            >
              <div>
                <Typography.Text strong>
                  {request.requestType === 'OUTPASS' ? 'Out-Pass' : 'Leave'}
                </Typography.Text>
                <Typography.Paragraph type="secondary" style={{ margin: 0 }}>
                  {request.reason}
                  {request.requestedDepartureAt
                    ? ` · ${dayjs(request.requestedDepartureAt).format('YYYY-MM-DD HH:mm')}`
                    : ` · ${request.from} to ${request.to}`}
                </Typography.Paragraph>
              </div>
              <StatusTag status={request.status} />
            </div>
          ))
        )}
      </Card>

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
