import { useEffect, useMemo, useState } from 'react'
import { App as AntApp, Button, Card, Col, DatePicker, Form, Input, Row, Statistic, Tabs } from 'antd'
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
]

export default function StudentOutPass() {
  const { message } = AntApp.useApp()
  const [form] = Form.useForm()
  const [tab, setTab] = useState('all')
  const [submitting, setSubmitting] = useState(false)
  const [quota, setQuota] = useState(12)
  const { data, loading, reload } = useResource('/student/outpasses')

  useEffect(() => {
    resourceApi
      .get('/settings')
      .then((s) => setQuota(s.outpassTotal || 12))
      .catch(() => {})
  }, [])

  const used = useMemo(
    () => data.filter((o) => ['approved', 'active', 'completed'].includes(o.status)).length,
    [data]
  )
  const active = data.find((o) => o.status === 'active')
  const hasOpen = data.some((o) => ['pending', 'approved', 'active'].includes(o.status))

  const filtered = tab === 'all' ? data : data.filter((o) => o.status === tab)

  const { query, setQuery, filtered: searchFiltered } = useTableFilter(filtered, ['destination', 'reason'])

  const handleSubmit = async (values) => {
    setSubmitting(true)
    try {
      await resourceApi.post('/outpasses', {
        destination: values.destination,
        reason: values.reason,
        departure: values.departure.format('YYYY-MM-DD HH:mm'),
        expectedReturn: values.expectedReturn.format('YYYY-MM-DD HH:mm'),
      })
      message.success('Out-pass request submitted')
      form.resetFields()
      reload()
    } catch (error) {
      message.error(error.message)
    } finally {
      setSubmitting(false)
    }
  }

  const columns = [
    { title: 'Pass', dataIndex: 'passNo', width: 64 },
    { title: 'Destination', dataIndex: 'destination' },
    { title: 'Reason', dataIndex: 'reason', ellipsis: true },
    { title: 'Departure', dataIndex: 'departure' },
    { title: 'Expected Return', dataIndex: 'expectedReturn' },
    { title: 'Actual Return', dataIndex: 'actualReturn', render: (v) => v || '-' },
    { title: 'Status', dataIndex: 'status', render: (v) => <StatusTag status={v} /> },
  ]

  return (
    <>
      <PageHeader title="Out-Pass" subtitle="Request permission to leave the hostel." />

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={8}>
          <Card size="small">
            <Statistic title="Out-passes Used" value={used} suffix={`/ ${quota}`} />
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

      <Card title="Request Out-Pass" style={{ marginBottom: 16, maxWidth: 560 }}>
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            name="destination"
            label="Destination"
            rules={[{ required: true, message: 'Please provide a destination' }]}
          >
            <Input placeholder="e.g. Shimla" />
          </Form.Item>
          <Form.Item
            name="reason"
            label="Reason"
            rules={[{ required: true, message: 'Please provide a reason' }]}
          >
            <Input.TextArea rows={2} placeholder="Reason for going out" />
          </Form.Item>
          <Form.Item
            name="departure"
            label="Departure"
            rules={[{ required: true, message: 'Select departure time' }]}
          >
            <DatePicker showTime style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item
            name="expectedReturn"
            label="Expected Return"
            rules={[{ required: true, message: 'Select expected return time' }]}
          >
            <DatePicker showTime style={{ width: '100%' }} />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={submitting} disabled={hasOpen}>
            {hasOpen ? 'You have an open request' : 'Submit Request'}
          </Button>
        </Form>
      </Card>

      <Card title="My Out-Passes">
        <Tabs items={TABS} activeKey={tab} onChange={setTab} />
        <TableSearchBar query={query} onQuery={setQuery} placeholder="Search..." />
        <DataTable rowKey="id" loading={loading} dataSource={searchFiltered} columns={columns} />
      </Card>
    </>
  )
}