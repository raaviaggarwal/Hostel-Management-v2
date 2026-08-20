import { useMemo, useState } from 'react'
import { App as AntApp, Button, Card, Popconfirm, Space, Tabs } from 'antd'
import { CheckOutlined, CloseOutlined, LogoutOutlined, UndoOutlined } from '@ant-design/icons'
import { useResource } from '../../hooks/useResource'
import { useAuth } from '../../context/auth'
import { useTableFilter } from '../../hooks/useTableFilter'
import { resourceApi } from '../../api/client'
import PageHeader from '../../components/PageHeader'
import DataTable from '../../components/DataTable'
import StatusTag from '../../components/StatusTag'
import TableSearchBar from '../../components/TableSearchBar'

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'active', label: 'Active' },
  { key: 'completed', label: 'Completed' },
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

  const { query, setQuery, filtered: searchFiltered } = useTableFilter(scoped, [
    'studentName',
    'reason',
    'destination',
  ])

  const decide = async (leave, status) => {
    try {
      await resourceApi.post(`/leaves/${leave.id}/decision`, { status })
      message.success(`Leave ${status}`)
      reload()
    } catch (error) {
      message.error(error.message)
    }
  }

  const activate = async (leave) => {
    try {
      await resourceApi.post(`/leaves/${leave.id}/activate`, {})
      message.success('Student marked as departed')
      reload()
    } catch (error) {
      message.error(error.message)
    }
  }

  const complete = async (leave) => {
    try {
      await resourceApi.post(`/leaves/${leave.id}/complete`, {})
      message.success('Return marked, leave completed')
      reload()
    } catch (error) {
      message.error(error.message)
    }
  }

  const columns = [
    { title: 'Student', dataIndex: 'studentName' },
    { title: 'From', dataIndex: 'from' },
    { title: 'To', dataIndex: 'to' },
    { title: 'Destination', dataIndex: 'destination' },
    { title: 'Departure', dataIndex: 'departure', render: (v) => v || '-' },
    { title: 'Actual Return', dataIndex: 'actualReturn', render: (v) => v || '-' },
    { title: 'Status', dataIndex: 'status', render: (v) => <StatusTag status={v} /> },
    {
      title: 'Actions',
      fixed: 'right',
      render: (_, record) => {
        if (record.status === 'pending') {
          return (
            <Space>
              <Popconfirm title="Approve this leave?" onConfirm={() => decide(record, 'approved')}>
                <Button type="primary" size="small" icon={<CheckOutlined />}>
                  Approve
                </Button>
              </Popconfirm>
              <Popconfirm title="Reject this leave?" onConfirm={() => decide(record, 'rejected')}>
                <Button danger size="small" icon={<CloseOutlined />}>
                  Reject
                </Button>
              </Popconfirm>
            </Space>
          )
        }
        if (record.status === 'approved') {
          return (
            <Popconfirm title="Mark student as departed?" onConfirm={() => activate(record)}>
              <Button size="small" icon={<LogoutOutlined />}>
                Mark Departed
              </Button>
            </Popconfirm>
          )
        }
        if (record.status === 'active') {
          return (
            <Popconfirm title="Mark student as returned?" onConfirm={() => complete(record)}>
              <Button type="primary" size="small" icon={<UndoOutlined />}>
                Mark Returned
              </Button>
            </Popconfirm>
          )
        }
        return '-'
      },
    },
  ]

  return (
    <>
      <PageHeader title="Leaves / Out-Passes" subtitle="Approve requests and track student movement." />
      <Card>
        <Tabs items={TABS} activeKey={tab} onChange={setTab} />
        <TableSearchBar query={query} onQuery={setQuery} placeholder="Search..." />
        <DataTable rowKey="id" loading={loading} dataSource={searchFiltered} columns={columns} />
      </Card>
    </>
  )
}