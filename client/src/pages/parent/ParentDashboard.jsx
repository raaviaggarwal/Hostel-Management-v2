import { useEffect, useState } from 'react'
import { Card, Col, Descriptions, List, Row, Skeleton, Typography } from 'antd'
import { resourceApi } from '../../api/client'
import PageHeader from '../../components/PageHeader'
import StatusTag from '../../components/StatusTag'
import { formatDate } from '../../utils/format'

export default function ParentDashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    resourceApi
      .get('/parent/ward')
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <Skeleton active paragraph={{ rows: 12 }} />

  if (!data) {
    return (
      <>
        <PageHeader title="Parent Portal" subtitle="Your ward's hostel information." />
        <Card>
          <Typography.Text type="secondary">
            No ward linked to this account yet. Contact the hostel office.
          </Typography.Text>
        </Card>
      </>
    )
  }

  const { student, attendance, leaves, notices } = data

  return (
    <>
      <PageHeader title="Parent Portal" subtitle={`Information for ${student.name}`} />

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card size="small" title="Ward Profile">
            <Descriptions column={1} size="small" bordered>
              <Descriptions.Item label="Name">{student.name}</Descriptions.Item>
              <Descriptions.Item label="Reg No">{student.regNo}</Descriptions.Item>
              <Descriptions.Item label="Course">{student.course}</Descriptions.Item>
              <Descriptions.Item label="Year">{student.year}</Descriptions.Item>
              <Descriptions.Item label="Room">{student.roomno || 'Not allocated'}</Descriptions.Item>
              <Descriptions.Item label="Status">
                <StatusTag status={student.active ? 'active' : 'inactive'} />
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card size="small" title="Notices">
            <List
              size="small"
              dataSource={notices}
              renderItem={(n) => (
                <List.Item>
                  <List.Item.Meta
                    title={n.title}
                    description={`${n.body} (${formatDate(n.date)})`}
                  />
                </List.Item>
              )}
            />
          </Card>
        </Col>

        <Col xs={24}>
          <Row gutter={[16, 16]}>
            <Col xs={24} md={12}>
              <Card size="small" title="Attendance">
                <List
                  size="small"
                  dataSource={attendance}
                  renderItem={(a) => (
                    <List.Item>
                      <List.Item.Meta
                        title={formatDate(a.date)}
                        description={<StatusTag status={a.status} />}
                      />
                    </List.Item>
                  )}
                />
              </Card>
            </Col>
            <Col xs={24} md={12}>
              <Card size="small" title="Leave History">
                <List
                  size="small"
                  dataSource={leaves}
                  renderItem={(l) => (
                    <List.Item>
                      <List.Item.Meta
                        title={`${formatDate(l.from)} → ${formatDate(l.to)}`}
                        description={l.reason}
                      />
                      <StatusTag status={l.status} />
                    </List.Item>
                  )}
                />
              </Card>
            </Col>
          </Row>
        </Col>
      </Row>
    </>
  )
}