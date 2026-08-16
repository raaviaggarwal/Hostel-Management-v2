import { useEffect, useState } from 'react'
import { Card, Col, Descriptions, List, Row, Skeleton, Tag, Typography } from 'antd'
import { resourceApi } from '../../api/client'
import PageHeader from '../../components/PageHeader'
import StatusTag from '../../components/StatusTag'
import { formatCurrency, formatDate } from '../../utils/format'

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

  const { student, fees, attendance, leaves, outpasses, notices } = data

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
              <Descriptions.Item label="Fees (pm)">
                {student.feespm ? formatCurrency(student.feespm) : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Status">
                <StatusTag status={student.active ? 'active' : 'inactive'} />
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card size="small" title="Fees">
            <List
              size="small"
              dataSource={fees}
              renderItem={(f) => (
                <List.Item
                  actions={[
                    f.status === 'paid' ? (
                      <Tag key="paid" color="green">Paid</Tag>
                    ) : (
                      <Tag key="status" color="orange">{f.status}</Tag>
                    ),
                  ]}
                >
                  <List.Item.Meta
                    title={`${formatCurrency(f.amount)}`}
                    description={`Due ${formatDate(f.dueDate)}`}
                  />
                </List.Item>
              )}
            />
          </Card>

          <Card size="small" title="Notices" style={{ marginTop: 16 }}>
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
            <Col xs={24} md={12}>
              <Card size="small" title="Out-Passes">
                <List
                  size="small"
                  dataSource={outpasses}
                  renderItem={(o) => (
                    <List.Item>
                      <List.Item.Meta
                        title={`${o.destination} (${formatDate(o.departure)})`}
                        description={o.reason}
                      />
                      <StatusTag status={o.status} />
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