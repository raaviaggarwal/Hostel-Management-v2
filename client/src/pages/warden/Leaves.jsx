import { useMemo, useState } from 'react'
import { App as AntApp, Button, Card, Popconfirm, Space, Tabs } from 'antd'
import { CheckOutlined, CloseOutlined } from '@ant-design/icons'
import { useResource } from '../../hooks/useResource'
import { useAuth } from '../../context/AuthContext'
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

export default function Leaves() {
  const { message } = AntApp.useApp()
  const { user } = useAuth()
  const [tab, setTab] = useState('all')
  const { data, loading, reload } = useResource('/leaves')
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
    const filtered = data.filter((l) => hostelStudentIds.has(l.studentId))
    return tab === 'all' ? filtered : filtered.filter((l) => l.status === tab)
  }, [data, tab, hostelStudentIds])

  const decide = async (leave, status) => {
    try {
      await resourceApi.post(`/leaves/${leave.id}/decision`, { status })
      message.success(`Leave ${status}`)
      reload()
    } catch (error) {
      message.error(error.message)
    }
  }

  const columns = [
    { title: 'Student', dataIndex: 'studentName' },
    { title: 'From', dataIndex: 'from' },
    { title: 'To', dataIndex: 'to' },
    { title: 'Reason', dataIndex: 'reason', ellipsis: true },
    { title: 'Status', dataIndex: 'status', render: (v) => <StatusTag status={v} /> },
    {
      title: 'Actions',
      fixed: 'right',
      render: (_, record) =>
        record.status === 'pending' ? (
          <Space>
            <Popconfirm
              title="Approve this leave?"
              onConfirm={() => decide(record, 'approved')}
            >
              <Button type="primary" size="small" icon={<CheckOutlined />}>
                Approve
              </Button>
            </Popconfirm>
            <Popconfirm
              title="Reject this leave?"
              onConfirm={() => decide(record, 'rejected')}
            >
              <Button danger size="small" icon={<CloseOutlined />}>
                Reject
              </Button>
            </Popconfirm>
          </Space>
        ) : (
          '-'
        ),
    },
  ]

  return (
    <>
      <PageHeader title="Leaves" subtitle="Approve or reject student leave requests." />
      <Card>
        <Tabs items={TABS} activeKey={tab} onChange={setTab} />
        <DataTable rowKey="id" loading={loading} dataSource={scoped} columns={columns} />
      </Card>
    </>
  )
}
