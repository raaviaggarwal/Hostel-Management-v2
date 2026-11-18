import { useState } from 'react'
import { App as AntApp, Button, Card, Col, Form, Input, Rate, Row } from 'antd'
import { useResource } from '../../hooks/useResource'
import { resourceApi } from '../../api/client'
import PageHeader from '../../components/PageHeader'
import DataTable from '../../components/DataTable'
import StatusTag from '../../components/StatusTag'

const RATING_FIELDS = [
  { name: 'taste', label: 'Taste' },
  { name: 'quantity', label: 'Quantity' },
  { name: 'hygiene', label: 'Hygiene' },
  { name: 'variety', label: 'Variety' },
  { name: 'temperature', label: 'Temperature' },
  { name: 'overall', label: 'Overall' },
]

export default function StudentMessFeedback() {
  const { message } = AntApp.useApp()
  const [form] = Form.useForm()
  const [complaintForm] = Form.useForm()
  const [submitting, setSubmitting] = useState(false)
  const [complaining, setComplaining] = useState(false)
  const { data, loading, reload } = useResource('/student/mess/feedback')
  const { data: complaints, loading: complaintsLoading, reload: reloadComplaints } = useResource('/student/mess/complaints')

  const handleFeedback = async (values) => {
    setSubmitting(true)
    try {
      await resourceApi.post('/mess/feedback', values)
      message.success('Feedback submitted')
      form.resetFields()
      reload()
    } catch (error) {
      message.error(error.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleComplaint = async (values) => {
    setComplaining(true)
    try {
      await resourceApi.post('/mess/complaints', values)
      message.success('Complaint submitted')
      complaintForm.resetFields()
      reloadComplaints()
    } catch (error) {
      message.error(error.message)
    } finally {
      setComplaining(false)
    }
  }

  const feedbackColumns = [
    { title: 'Date', dataIndex: 'date' },
    { title: 'Taste', dataIndex: 'taste', render: (v) => <Rate disabled defaultValue={v} /> },
    { title: 'Qty', dataIndex: 'quantity', render: (v) => <Rate disabled defaultValue={v} /> },
    { title: 'Hygiene', dataIndex: 'hygiene', render: (v) => <Rate disabled defaultValue={v} /> },
    { title: 'Variety', dataIndex: 'variety', render: (v) => <Rate disabled defaultValue={v} /> },
    { title: 'Temp', dataIndex: 'temperature', render: (v) => <Rate disabled defaultValue={v} /> },
    { title: 'Overall', dataIndex: 'overall', render: (v) => <Rate disabled defaultValue={v} /> },
    { title: 'Comment', dataIndex: 'comment', ellipsis: true, render: (v) => v || '-' },
  ]

  const complaintColumns = [
    { title: 'Date', dataIndex: 'date' },
    { title: 'Subject', dataIndex: 'subject' },
    { title: 'Details', dataIndex: 'details', ellipsis: true },
    { title: 'Status', dataIndex: 'status', render: (v) => <StatusTag status={v} /> },
  ]

  return (
    <>
      <PageHeader title="Mess Feedback" subtitle="Rate the mess and raise concerns." />

      <Card title="Today's Feedback" style={{ marginBottom: 16, maxWidth: 560 }}>
        <Form form={form} layout="vertical" onFinish={handleFeedback}>
          <Row gutter={12}>
            {RATING_FIELDS.map((f) => (
              <Col span={8} key={f.name}>
                <Form.Item name={f.name} label={f.label} rules={[{ required: true }]}>
                  <Rate />
                </Form.Item>
              </Col>
            ))}
          </Row>
          <Form.Item name="comment" label="Comment">
            <Input.TextArea rows={2} placeholder="Anything you want to add?" />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={submitting}>
            Submit Feedback
          </Button>
        </Form>
      </Card>

      <Card title="My Feedback" style={{ marginBottom: 16 }}>
        <DataTable rowKey="id" loading={loading} dataSource={data} columns={feedbackColumns} pagination={false} />
      </Card>

      <Card title="Raise a Mess Complaint" style={{ marginBottom: 16, maxWidth: 560 }}>
        <Form form={complaintForm} layout="vertical" onFinish={handleComplaint}>
          <Form.Item
            name="subject"
            label="Subject"
            rules={[{ required: true, message: 'Enter a subject' }]}
          >
            <Input placeholder="e.g. Food quality" />
          </Form.Item>
          <Form.Item
            name="details"
            label="Details"
            rules={[{ required: true, message: 'Describe the issue' }]}
          >
            <Input.TextArea rows={3} placeholder="Describe the issue" />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={complaining}>
            Submit Complaint
          </Button>
        </Form>
      </Card>

      <Card title="My Mess Complaints">
        <DataTable rowKey="id" loading={complaintsLoading} dataSource={complaints} columns={complaintColumns} pagination={false} />
      </Card>
    </>
  )
}