import { useEffect, useMemo, useState } from 'react'
import { Alert, App as AntApp, Button, Card, Col, DatePicker, Form, Input, Radio, Row, Statistic, Tabs } from 'antd'
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
  { key: 'outpass', label: 'Out-Passes' },
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
  const [requestType, setRequestType] = useState('LEAVE')
  const [submitting, setSubmitting] = useState(false)
  const [quota, setQuota] = useState(null)
  const [quotaError, setQuotaError] = useState(null)
  const { data, loading, reload, error } = useResource('/student/leaves', {
    refreshIntervalMs: 5000,
    refreshOnFocus: true,
  })

  useEffect(() => {
    let active = true
    resourceApi
      .get('/settings')
      .then((settings) => {
        if (active) setQuota(settings.leaveTotal ?? 12)
      })
      .catch((error) => {
        if (active) setQuotaError(error)
      })

    return () => {
      active = false
    }
  }, [])

  const used = useMemo(
    () => data.filter((l) => ['approved', 'active', 'completed'].includes(l.status)).length,
    [data]
  )
  const active = data.find((l) => l.status === 'active')
  const hasOpen = data.some((l) => ['pending', 'approved', 'active'].includes(l.status))

  const filtered = tab === 'all'
    ? data
    : tab === 'outpass'
      ? data.filter((l) => l.requestType === 'OUTPASS')
      : data.filter((l) => l.status === tab)

  const { query, setQuery, filtered: searchFiltered } = useTableFilter(filtered, [
    'reason',
    'destination',
  ])

  const handleSubmit = async (values) => {
    setSubmitting(true)
    try {
      const [from, to] = requestType === 'OUTPASS' ? values.outpassTimes : values.dates
      await resourceApi.post('/leaves', {
        requestType,
        from: dayjs(from).format('YYYY-MM-DD'),
        to: dayjs(to).format('YYYY-MM-DD'),
        reason: values.reason,
        destination: values.destination,
        ...(requestType === 'OUTPASS'
          ? {
              requestedDepartureAt: dayjs(from).format('YYYY-MM-DDTHH:mm:ssZ'),
              expectedReturnAt: dayjs(to).format('YYYY-MM-DDTHH:mm:ssZ'),
            }
          : {}),
      })
      message.success(`${requestType === 'OUTPASS' ? 'Out-Pass' : 'Leave'} request submitted`)
      form.resetFields()
      reload()
    } catch (error) {
      message.error(error.message)
    } finally {
      setSubmitting(false)
    }
  }

  const columns = [
    {
      title: 'Request Type',
      dataIndex: 'requestType',
      render: (value) => value === 'OUTPASS' ? 'Out-Pass' : 'Leave',
    },
    { title: 'From', dataIndex: 'from' },
    { title: 'To', dataIndex: 'to' },
    { title: 'Destination', dataIndex: 'destination', render: (v) => v || '-' },
    { title: 'Reason', dataIndex: 'reason', ellipsis: true },
    {
      title: 'Requested Departure',
      dataIndex: 'requestedDepartureAt',
      render: (value, record) => value
        ? dayjs(value).format('YYYY-MM-DD HH:mm')
        : record.from,
    },
    {
      title: 'Expected Return',
      dataIndex: 'expectedReturnAt',
      render: (value, record) => value
        ? dayjs(value).format('YYYY-MM-DD HH:mm')
        : record.to,
    },
    { title: 'Departure', dataIndex: 'departure', render: (v) => v || '-' },
    { title: 'Actual Return', dataIndex: 'actualReturn', render: (v) => v || '-' },
    { title: 'Status', dataIndex: 'status', render: (v) => <StatusTag status={v} /> },
  ]

  return (
    <>
      <PageHeader title="Leave / Out-Pass" subtitle="Request leave and track your departures and returns." />

      {quotaError && (
        <Alert
          type="error"
          showIcon
          message="Unable to load leave quota"
          description={quotaError.message}
          style={{ marginBottom: 16 }}
        />
      )}

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={8}>
          <Card size="small">
            <Statistic title="Leaves Used" value={used} suffix={quota === null ? '' : `/ ${quota}`} />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card size="small">
            <Statistic
              title="Remaining"
              value={quota === null ? '—' : Math.max(0, quota - used)}
              valueStyle={
                quota === null
                  ? undefined
                  : { color: used >= quota ? '#C0392B' : '#1B8A6B' }
              }
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

      <Card title="Request Leave or Out-Pass" style={{ marginBottom: 16, maxWidth: 560 }}>
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item label="Request Type">
            <Radio.Group
              value={requestType}
              onChange={(event) => {
                form.resetFields(['dates', 'outpassTimes'])
                setRequestType(event.target.value)
              }}
              options={[
                { label: 'Leave', value: 'LEAVE' },
                { label: 'Out-Pass', value: 'OUTPASS' },
              ]}
            />
          </Form.Item>
          {requestType === 'OUTPASS' ? (
            <Form.Item
              name="outpassTimes"
              label="Departure and Expected Return"
              preserve={false}
              rules={[
                { required: true, message: 'Select departure and expected return date/time' },
                {
                  validator: async (_, values) => {
                    if (values?.[0] && values?.[1] && !values[1].isAfter(values[0])) {
                      throw new Error('Expected return must be after departure')
                    }
                  },
                },
              ]}
            >
              <DatePicker.RangePicker
                showTime
                format="YYYY-MM-DD HH:mm"
                style={{ width: '100%' }}
              />
            </Form.Item>
          ) : (
            <Form.Item
              name="dates"
              label="Leave Dates"
              preserve={false}
              rules={[{ required: true, message: 'Select the leave dates' }]}
            >
              <DatePicker.RangePicker style={{ width: '100%' }} />
            </Form.Item>
          )}
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
        {error && (
          <Alert
            type="warning"
            showIcon
            message="Unable to refresh your requests"
            description={error.message || 'The latest request status could not be loaded.'}
            action={<Button size="small" onClick={reload}>Retry</Button>}
            style={{ marginBottom: 16 }}
          />
        )}
        <Tabs items={TABS} activeKey={tab} onChange={setTab} />
        <TableSearchBar query={query} onQuery={setQuery} placeholder="Search..." />
        <DataTable rowKey="id" loading={loading} dataSource={searchFiltered} columns={columns} />
      </Card>
    </>
  )
}