import { useEffect, useState } from 'react'
import { App as AntApp, Button, Card, Col, Row, Skeleton, Space, Table, Tag, Typography } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { resourceApi } from '../../api/client'
import PageHeader from '../../components/PageHeader'
import EntityModal from '../../components/EntityModal'
import StatusTag from '../../components/StatusTag'
import { formatDate } from '../../utils/format'

export default function Committee() {
  const { message } = AntApp.useApp()
  const [data, setData] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  const load = () => resourceApi.get('/committee').then(setData)

  useEffect(() => {
    resourceApi
      .get('/committee')
      .then(setData)
      .catch((error) => message.error(error.message))
  }, [message])

  const handleAdd = async (values) => {
    setSaving(true)
    try {
      await resourceApi.post('/committee/meetings', values)
      message.success('Meeting scheduled')
      setModalOpen(false)
      load()
    } catch (error) {
      message.error(error.message)
    } finally {
      setSaving(false)
    }
  }

  if (!data) return <Skeleton active paragraph={{ rows: 12 }} />

  const memberColumns = [
    { title: 'Member', dataIndex: 'name' },
    { title: 'Role', dataIndex: 'role', render: (v) => <Tag color="blue">{v}</Tag> },
  ]

  return (
    <>
      <PageHeader
        title="Committee"
        subtitle="Hostel committee members and meetings."
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
            Schedule Meeting
          </Button>
        }
      />

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={8}>
          <Card size="small" title="Members">
            <Table
              rowKey="id"
              size="small"
              pagination={false}
              dataSource={data.members}
              columns={memberColumns}
            />
          </Card>
        </Col>

        <Col xs={24} lg={16}>
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            {data.meetings.map((meeting) => (
              <Card key={meeting.id} size="small" title={`Meeting — ${formatDate(meeting.date)}`}>
                <Typography.Paragraph>
                  <strong>Agenda:</strong> {meeting.agenda}
                </Typography.Paragraph>
                {meeting.decisions?.length > 0 && (
                  <Typography.Paragraph>
                    <strong>Decisions:</strong>
                    <ul style={{ margin: 0 }}>
                      {meeting.decisions.map((d, i) => (
                        <li key={i}>{d}</li>
                      ))}
                    </ul>
                  </Typography.Paragraph>
                )}
                {meeting.actionItems?.length > 0 && (
                  <Table
                    rowKey="id"
                    size="small"
                    pagination={false}
                    dataSource={meeting.actionItems}
                    columns={[
                      { title: 'Action Item', dataIndex: 'item' },
                      { title: 'Responsible', dataIndex: 'responsible' },
                      { title: 'Deadline', dataIndex: 'deadline', render: (v) => formatDate(v) },
                      { title: 'Status', dataIndex: 'status', render: (v) => <StatusTag status={v} /> },
                    ]}
                  />
                )}
              </Card>
            ))}
          </Space>
        </Col>
      </Row>

      <EntityModal
        open={modalOpen}
        title="Schedule Meeting"
        fields={[
          { name: 'date', label: 'Date' },
          { name: 'agenda', label: 'Agenda', input: 'textarea', rows: 3, rules: [{ required: true }] },
        ]}
        loading={saving}
        onCancel={() => setModalOpen(false)}
        onSubmit={handleAdd}
      />
    </>
  )
}