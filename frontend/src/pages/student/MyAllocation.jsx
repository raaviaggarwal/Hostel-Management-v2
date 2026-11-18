import { useMemo } from 'react'
import { Card, Descriptions, Empty, Space, Steps, Timeline, Typography } from 'antd'
import { useResource } from '../../hooks/useResource'
import PageHeader from '../../components/PageHeader'
import DataTable from '../../components/DataTable'
import StatusTag from '../../components/StatusTag'

const STATUS_ORDER = ['applied', 'under_review', 'approved', 'waitlisted', 'allocated', 'occupied']

export default function MyAllocation() {
  const { data, loading } = useResource('/student/allocation')
  const { data: hostels } = useResource('/hostels')

  const hostelName = (id) => hostels.find((h) => h.id === id)?.name || '-'
  const latest = data[0]

  const stepIndex = useMemo(() => {
    if (!latest) return 0
    const idx = STATUS_ORDER.indexOf(latest.status)
    return idx >= 0 ? idx + 1 : 1
  }, [latest])

  const stepStatus = (status) =>
    ['allocated', 'occupied'].includes(status) ? 'finish'
      : status === 'rejected' || status === 'cancelled' ? 'error'
        : status === 'waitlisted' ? 'wait' : 'process'

  const columns = [
    { title: 'Applied On', dataIndex: 'appliedDate' },
    {
      title: 'Preferences',
      dataIndex: 'hostelPrefs',
      render: (v) => (v || []).map((id) => hostelName(id)).join(', ') || '-',
    },
    { title: 'Room Type', dataIndex: 'roomType', render: (v) => v || 'Any' },
    { title: 'Allotted Room', dataIndex: 'roomNo', render: (v) => v || '-' },
    {
      title: 'Status',
      dataIndex: 'status',
      render: (v) => <StatusTag status={v} />,
    },
  ]

  return (
    <>
      <PageHeader title="My Allocation" subtitle="Track your hostel allocation applications." />

      <Card title="Current Application" loading={loading}>
        {!latest ? (
          <Empty description="You have not applied for a hostel room yet." />
        ) : (
          <div style={{ maxWidth: 620 }}>
            <Space direction="vertical" size={12} style={{ width: '100%' }}>
              <Descriptions column={1} size="small" bordered>
                <Descriptions.Item label="Applied On">{latest.appliedDate}</Descriptions.Item>
                <Descriptions.Item label="Preferences">
                  {latest.hostelPrefs.map((id) => hostelName(id)).join(', ')}
                </Descriptions.Item>
                <Descriptions.Item label="Room Type">{latest.roomType || 'Any'}</Descriptions.Item>
                {latest.roomNo && (
                  <Descriptions.Item label="Allotted Room">
                    {latest.roomNo}
                    {latest.hostelId ? ` · ${hostelName(latest.hostelId)}` : ''}
                  </Descriptions.Item>
                )}
                <Descriptions.Item label="Status">
                  <StatusTag status={latest.status} />
                </Descriptions.Item>
              </Descriptions>

              <Steps
                size="small"
                current={stepIndex}
                status={stepStatus(latest.status)}
                items={[
                  { title: 'Applied' },
                  { title: 'Under Review' },
                  { title: 'Approved / Waitlisted' },
                  { title: 'Room Allocated' },
                  { title: 'Occupied' },
                ]}
              />

              {latest.history?.length > 0 && (
                <Card size="small" title="History" style={{ background: '#fafafa' }}>
                  <Timeline
                    items={latest.history.map((h) => ({
                      color: h.status === 'rejected' || h.status === 'cancelled' ? 'red' : 'blue',
                      children: (
                        <Typography.Text>
                          <StatusTag status={h.status} /> {h.note} — {h.date}
                          {h.by ? ` (by ${h.by})` : ''}
                        </Typography.Text>
                      ),
                    }))}
                  />
                </Card>
              )}
            </Space>
          </div>
        )}
      </Card>

      <Card
        style={{ marginTop: 16 }}
        title="All Applications"
        extra={
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            Every application you have submitted
          </Typography.Text>
        }
      >
        <DataTable rowKey="id" loading={loading} dataSource={data} columns={columns} />
      </Card>
    </>
  )
}