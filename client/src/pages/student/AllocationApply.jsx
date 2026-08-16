import { useMemo, useState } from 'react'
import { App as AntApp, Alert, Button, Card, Form, Radio, Result, Select, Space, Typography } from 'antd'
import { useNavigate } from 'react-router-dom'
import { useResource } from '../../hooks/useResource'
import { resourceApi } from '../../api/client'
import { useAuth } from '../../context/auth'
import PageHeader from '../../components/PageHeader'
import StatusTag from '../../components/StatusTag'

export default function AllocationApply() {
  const { message } = AntApp.useApp()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [form] = Form.useForm()
  const { data: hostels } = useResource('/hostels')
  const { data: students } = useResource('/students')
  const { data: allocations, reload } = useResource('/student/allocation')

  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(null)

  const me = useMemo(
    () => students.find((s) => s.regNo === user?.regNo),
    [students, user]
  )

  const eligibleHostels = useMemo(
    () =>
      hostels.filter(
        (h) =>
          h.gender === me?.gender &&
          (h.type === 'freshers' ? me?.year === 1 : me?.year > 1)
      ),
    [hostels, me]
  )

  const activeAllocation = useMemo(
    () => allocations.find((a) => !['rejected', 'cancelled'].includes(a.status)) || null,
    [allocations]
  )

  const handleSubmit = async (values) => {
    setSubmitting(true)
    try {
      const result = await resourceApi.post('/allocations', {
        hostelPrefs: values.hostelPrefs,
        roomType: values.roomType || null,
      })
      message.success('Allocation application submitted')
      setSubmitted(result)
      reload()
    } catch (error) {
      message.error(error.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <Result
        status="success"
        title="Application submitted"
        subTitle="Your hostel allocation application has been submitted for review. Track its status from the Allocation page."
        extra={
          <Button type="primary" onClick={() => navigate('/student/allocation')}>
            View Allocation
          </Button>
        }
      />
    )
  }

  if (activeAllocation) {
    return (
      <>
        <PageHeader title="Apply for Hostel" subtitle="Hostel allocation application." />
        <Card>
          <Alert
            type="info"
            showIcon
            message="You already have an active application"
            description={
              <Space direction="vertical" size={4}>
                <span>
                  Status: <StatusTag status={activeAllocation.status} />, applied on{' '}
                  {activeAllocation.appliedDate}
                </span>
                <Typography.Text type="secondary">
                  Preferences: {activeAllocation.hostelPrefs
                    .map((id) => hostels.find((h) => h.id === id)?.name || `Hostel ${id}`)
                    .join(', ')}
                </Typography.Text>
              </Space>
            }
          />
        </Card>
      </>
    )
  }

  if (!me) {
    return (
      <>
        <PageHeader title="Apply for Hostel" subtitle="Hostel allocation application." />
        <Card>
          <Alert type="warning" showIcon message="Student profile not found." />
        </Card>
      </>
    )
  }

  return (
    <>
      <PageHeader
        title="Apply for Hostel"
        subtitle={`Choose your hostel preferences. You are eligible for ${eligibleHostels.length} hostel(s).`}
      />
      <Card style={{ maxWidth: 640 }}>
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            name="hostelPrefs"
            label="Hostel Preferences (up to 3)"
            rules={[{ required: true, message: 'Select at least one hostel' }]}
          >
            <Select
              mode="multiple"
              maxCount={3}
              placeholder="Select hostels in order of preference"
              options={eligibleHostels.map((h) => ({
                label: `${h.name} (${h.gender === 'male' ? 'Boys' : 'Girls'} · ${h.type === 'freshers' ? 'Freshers' : 'Seniors'})`,
                value: h.id,
              }))}
            />
          </Form.Item>

          <Form.Item name="roomType" label="Room Type (optional)">
            <Radio.Group>
              <Radio.Button value="single">Single</Radio.Button>
              <Radio.Button value="double">Double</Radio.Button>
              <Radio.Button value="triple">Triple</Radio.Button>
              <Radio.Button value={null}>No preference</Radio.Button>
            </Radio.Group>
          </Form.Item>

          <Typography.Paragraph type="secondary" style={{ fontSize: 12 }}>
            Your application will be reviewed by the warden. If you are waitlisted, you will be
            allocated a room as soon as one becomes available.
          </Typography.Paragraph>

          <Button type="primary" htmlType="submit" loading={submitting}>
            Submit Application
          </Button>
        </Form>
      </Card>
    </>
  )
}