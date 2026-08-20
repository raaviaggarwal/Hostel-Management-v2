import { useEffect, useMemo, useState } from 'react'
import { App as AntApp, Button, Card, Col, DatePicker, Form, Input, Row, Statistic, Tabs } from 'antd'
import dayjs from 'dayjs'
import { useResource } from '../../hooks/useResource'
import { resourceApi } from '../../api/client'
import PageHeader from '../../components/PageHeader'
import DataTable from '../../components/DataTable'
import StatusTag from '../../components/StatusTag'
import TableSearchBar from '../../components/TableSearchBar'
import { useTableFilter } from '../../hooks/useTableFilter'

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'active', label: 'Active' },
  { key: 'completed', label: 'Completed' },
  { key: 'rejected', label: 'Rejected' },
]

export default function StudentLeave() {
  const { message } = AntApp.useApp()
  const [form] = Form.useForm()
  const [tab, setTab] = useState('all')
  const [submitting, setSubmitting] = useState(false)
  const [quota, setQuota] = useState(12)
  const { data, loading, reload } = useResource('/student/leaves')

  useEffect(() => {
    resourceApi
      .get('/settings')
      .then((s) => setQuota(s.leaveTotal || 12))
      .catch(() => {})
  }, [])

  const used = useMemo(
    () => data.filter((l) => ['approved', 'active', 'completed'].includes(l.status)).length,
    [data]
  )
  const active = data.find((l) => l.status === 'active')
  const hasOpen = data.some((l) => ['pending', 'approved', 'active'].includes(l.status))

  const filtered = tab === 'all' ? data : data.filter((l) => l.status === tab)

  const { query, setQuery, filtered: searchFiltered } = useTableFilter(filtered, [
    'reason',
    'destination',
  ])

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
    { title: 'Departure', dataIndex: 'departure', render: (v) => v || '-' },
    { title: 'Actual Return', dataIndex: 'actualReturn', render: (v) => v || '-' },
    { title: 'Status', dataIndex: 'status', render: (v) => <StatusTag status={v} /> },
  ]

  return (
    <>
      <PageHeader title="Leave / Out-Pass" subtitle="Request leave and track your departures and returns." />

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={8}>
          <Card size="small">
            <Statistic title="Leaves Used" value={used} suffix={`/ ${quota}`} />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card size="small">
            <Statistic
              title="Remaining"
              value={Math.max(0, quota - used)}
              valueStyle={{ color: used >= quota ? '#C0392B' : '#1B8A6B' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card size="small">
            <Statistic
              title="Currently Out"
              value={active ? 'Yes' : 'No'}
              valueStyle={{ color: active ? '#C0392B' : '#1B8A6B' }}
            />
          </Card>
        </Col>
      </Row>

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
          <Button type="primary" htmlType="submit" loading={submitting} disabled={hasOpen}>
            {hasOpen ? 'You have an open request' : 'Submit Request'}
          </Button>
        </Form>
      </Card>

      <Card title="My Leave Requests">
        <Tabs items={TABS} activeKey={tab} onChange={setTab} />
        <TableSearchBar query={query} onQuery={setQuery} placeholder="Search..." />
        <DataTable rowKey="id" loading={loading} dataSource={searchFiltered} columns={columns} />
      </Card>
    </>
  )
}