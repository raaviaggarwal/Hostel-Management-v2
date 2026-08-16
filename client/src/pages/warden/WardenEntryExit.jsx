import { useMemo, useState } from 'react'
import { App as AntApp, Button, Card, Col, DatePicker, Form, Input, Row, Select, Statistic, TimePicker } from 'antd'
import dayjs from 'dayjs'
import { useResource } from '../../hooks/useResource'
import { resourceApi } from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import PageHeader from '../../components/PageHeader'
import DataTable from '../../components/DataTable'
import StatusTag from '../../components/StatusTag'

const todayLocal = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}`
}

export default function WardenEntryExit() {
  const { message } = AntApp.useApp()
  const { user } = useAuth()
  const [form] = Form.useForm()
  const [submitting, setSubmitting] = useState(false)
  const { data, loading, reload } = useResource('/entry-exit')
  const { data: students } = useResource('/students')
  const { data: outpasses } = useResource('/outpasses')

  const scopedStudents = useMemo(() => {
    if (!user?.hostelId) return students
    return students.filter((s) => String(s.hostelId) === String(user.hostelId))
  }, [students, user])

  const nameOf = (id) => students.find((s) => s.id === id)?.name || `#${id}`

  const summary = useMemo(
    () => ({
      today: data.filter((e) => e.date === todayLocal()).length,
      late: data.filter((e) => e.status === 'late').length,
      violations: data.filter((e) => e.status === 'violation').length,
      outside: outpasses.filter((o) => o.status === 'active').length,
    }),
    [data, outpasses]
  )

  const handleRecord = async (values) => {
    setSubmitting(true)
    try {
      await resourceApi.post('/entry-exit', {
        studentId: values.studentId,
        type: values.type,
        date: values.date.format('YYYY-MM-DD'),
        time: values.time.format('HH:mm'),
        gate: values.gate,
      })
      message.success('Gate punch recorded')
      form.resetFields()
      reload()
    } catch (error) {
      message.error(error.message)
    } finally {
      setSubmitting(false)
    }
  }

  const columns = [
    { title: 'Student', dataIndex: 'studentId', render: (v) => nameOf(v) },
    { title: 'Date', dataIndex: 'date' },
    { title: 'Time', dataIndex: 'time' },
    {
      title: 'Type',
      dataIndex: 'type',
      render: (v) => <StatusTag status={v} />,
    },
    { title: 'Gate', dataIndex: 'gate' },
    { title: 'Status', dataIndex: 'status', render: (v) => <StatusTag status={v} /> },
    { title: 'Late (min)', dataIndex: 'lateMinutes', render: (v) => v || 0 },
  ]

  return (
    <>
      <PageHeader title="Entry / Exit" subtitle="Biometric gate punches for your hostel." />

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={6}>
          <Card size="small">
            <Statistic title="Today's Punches" value={summary.today} />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card size="small">
            <Statistic title="Late Entries" value={summary.late} valueStyle={{ color: '#C9820A' }} />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card size="small">
            <Statistic title="Violations" value={summary.violations} valueStyle={{ color: '#C0392B' }} />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card size="small">
            <Statistic title="Currently Outside" value={summary.outside} valueStyle={{ color: '#C0392B' }} />
          </Card>
        </Col>
      </Row>

      <Card title="Record Gate Punch" style={{ marginBottom: 16, maxWidth: 560 }}>
        <Form form={form} layout="vertical" onFinish={handleRecord}>
          <Form.Item
            name="studentId"
            label="Student"
            rules={[{ required: true, message: 'Select a student' }]}
          >
            <Select
              showSearch
              optionFilterProp="label"
              placeholder="Select student"
              options={scopedStudents.map((s) => ({ label: `${s.name} (${s.roomno || 'no room'})`, value: s.id }))}
            />
          </Form.Item>
          <Form.Item
            name="type"
            label="Type"
            rules={[{ required: true, message: 'Select entry or exit' }]}
          >
            <Select
              options={[
                { label: 'Entry', value: 'entry' },
                { label: 'Exit', value: 'exit' },
              ]}
            />
          </Form.Item>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="date" label="Date" initialValue={dayjs()}>
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="time" label="Time" initialValue={dayjs()}>
                <TimePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="gate" label="Gate">
            <Input placeholder="e.g. Main Gate" />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={submitting}>
            Record Punch
          </Button>
        </Form>
      </Card>

      <Card title="Recent Punches">
        <DataTable rowKey="id" loading={loading} dataSource={data} columns={columns} />
      </Card>
    </>
  )
}