import { useState } from 'react'
import { App as AntApp, Button, Card, DatePicker, Form, Input, Tabs } from 'antd'
import dayjs from 'dayjs'
import { useResource } from '../../hooks/useResource'
import { resourceApi } from '../../api/client'
import PageHeader from '../../components/PageHeader'
import DataTable from '../../components/DataTable'
import StatusTag from '../../components/StatusTag'

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
]

export default function StudentLeave() {
  const { message } = AntApp.useApp()
  const [form] = Form.useForm()
  const [tab, setTab] = useState('all')
  const [submitting, setSubmitting] = useState(false)
  const { data, loading, reload } = useResource('/student/leaves')

  const filtered = tab === 'all' ? data : data.filter((l) => l.status === tab)

  const handleSubmit = async (values) => {
    setSubmitting(true)
    try {
      await resourceApi.post('/leaves', {
        from: dayjs(values.dates[0]).format('YYYY-MM-DD'),
        to: dayjs(values.dates[1]).format('YYYY-MM-DD'),
        reason: values.reason,
        destination: values.destination,
      })
      message.success('Leave request submitted')
      form.resetFields()
      reload()
    } catch (error) {
      message.error(error.message)
    } finally {
      setSubmitting(false)
    }
  }

  const columns = [
    { title: 'From', dataIndex: 'from' },
    { title: 'To', dataIndex: 'to' },
    { title: 'Destination', dataIndex: 'destination', render: (v) => v || '-' },
    { title: 'Reason', dataIndex: 'reason', ellipsis: true },
    { title: 'Status', dataIndex: 'status', render: (v) => <StatusTag status={v} /> },
  ]

  return (
    <>
      <PageHeader title="Leave" subtitle="Request leave and track its approval." />

      <Card title="Request Leave" style={{ marginBottom: 16, maxWidth: 560 }}>
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            name="dates"
            label="Leave Dates"
            rules={[{ required: true, message: 'Select the leave dates' }]}
          >
            <DatePicker.RangePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item
            name="reason"
            label="Reason"
            rules={[{ required: true, message: 'Please provide a reason' }]}
          >
            <Input.TextArea rows={3} placeholder="Reason for leave" />
          </Form.Item>
          <Form.Item
            name="destination"
            label="Destination"
            rules={[{ required: true, message: 'Please provide a destination' }]}
          >
            <Input placeholder="Where are you going?" />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={submitting}>
            Submit Request
          </Button>
        </Form>
      </Card>

      <Card title="My Leave Requests">
        <Tabs items={TABS} activeKey={tab} onChange={setTab} />
        <DataTable rowKey="id" loading={loading} dataSource={filtered} columns={columns} />
      </Card>
    </>
  )
}
