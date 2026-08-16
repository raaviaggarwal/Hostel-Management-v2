import { useMemo, useState } from 'react'
import { App as AntApp, Button, Card, Space, Tabs, Tag } from 'antd'
import { CheckOutlined, LogoutOutlined } from '@ant-design/icons'
import { useResource } from '../../hooks/useResource'
import { useAuth } from '../../context/AuthContext'
import { resourceApi } from '../../api/client'
import PageHeader from '../../components/PageHeader'
import DataTable from '../../components/DataTable'
import StatusTag from '../../components/StatusTag'
import { formatDate } from '../../utils/format'

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'checked-in', label: 'Checked In' },
  { key: 'checked-out', label: 'Checked Out' },
]

export default function Visitors() {
  const { message } = AntApp.useApp()
  const { user } = useAuth()
  const [tab, setTab] = useState('all')
  const { data, loading, reload } = useResource('/visitors')
  const { data: students } = useResource('/students')

  const hostelStudentIds = useMemo(
    () =>
      new Set(
        students
          .filter((s) => String(s.hostelId) === String(user?.hostelId))
          .map((s) => s.id)
      ),
    [students, user]
  )

  const scoped = useMemo(() => {
    const filtered = data.filter((v) => hostelStudentIds.has(v.studentId))
    return tab === 'all' ? filtered : filtered.filter((v) => v.status === tab)
  }, [data, tab, hostelStudentIds])

  const updateStatus = async (visitor, status) => {
    try {
      await resourceApi.update('/visitors', visitor.id, { status })
      message.success(`Visitor ${status.replace('-', ' ')}`)
      reload()
    } catch (error) {
      message.error(error.message)
    }
  }

  const columns = [
    { title: 'Visitor', dataIndex: 'visitorName' },
    { title: 'Student', dataIndex: 'studentName' },
    { title: 'Relation', dataIndex: 'relation' },
    { title: 'Date', dataIndex: 'date', render: (v) => formatDate(v) },
    { title: 'Status', dataIndex: 'status', render: (v) => <StatusTag status={v} /> },
    {
      title: 'Actions',
      fixed: 'right',
      render: (_, record) => (
        <Space>
          {record.status === 'pending' && (
            <Button
              type="primary"
              size="small"
              icon={<CheckOutlined />}
              onClick={() => updateStatus(record, 'checked-in')}
            >
              Check In
            </Button>
          )}
          {record.status === 'checked-in' && (
            <Button
              size="small"
              icon={<LogoutOutlined />}
              onClick={() => updateStatus(record, 'checked-out')}
            >
              Check Out
            </Button>
          )}
          {record.status === 'checked-out' && <Tag color="default">Done</Tag>}
        </Space>
      ),
    },
  ]

  return (
    <>
      <PageHeader title="Visitors" subtitle="Manage the visitor log for your hostel." />
      <Card>
        <Tabs items={TABS} activeKey={tab} onChange={setTab} />
        <DataTable rowKey="id" loading={loading} dataSource={scoped} columns={columns} />
      </Card>
    </>
  )
}
