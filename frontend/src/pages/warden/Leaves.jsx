import { useState } from 'react'
import { Alert, App as AntApp, Button, Card, Popconfirm, Space, Tabs } from 'antd'
import { CheckOutlined, CloseOutlined, LogoutOutlined, UndoOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { useResource } from '../../hooks/useResource'
import { useTableFilter } from '../../hooks/useTableFilter'
import { resourceApi } from '../../api/client'
import PageHeader from '../../components/PageHeader'
import DataTable from '../../components/DataTable'
import StatusTag from '../../components/StatusTag'
import TableSearchBar from '../../components/TableSearchBar'

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'outpass-pending', label: 'Pending Out-Passes' },
  { key: 'pending', label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'active', label: 'Active' },
  { key: 'completed', label: 'Completed' },
  { key: 'rejected', label: 'Rejected' },
]

export default function Leaves() {
  const { message } = AntApp.useApp()
  const [tab, setTab] = useState('all')
  const { data, loading, reload, error } = useResource('/leaves', {
    refreshIntervalMs: 5000,
    refreshOnFocus: true,
  })
  const scoped = tab === 'all'
    ? data
    : tab === 'outpass-pending'
      ? data.filter((l) => l.requestType === 'OUTPASS' && l.status === 'pending')
      : data.filter((l) => l.status === tab)

  const { query, setQuery, filtered: searchFiltered } = useTableFilter(scoped, [
    'studentName',
    'reason',
    'destination',
  ])

  const decide = async (leave, status) => {
    try {
      await resourceApi.post(`/leaves/${leave.id}/decision`, { status })
      const label = leave.requestType === 'OUTPASS' ? 'Out-Pass' : 'Leave'
      message.success(`${label} ${status}`)
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
    {
      title: 'Request Type',
      dataIndex: 'requestType',
      render: (value) => value === 'OUTPASS' ? 'Out-Pass' : 'Leave',
    },
    { title: 'Student', dataIndex: 'studentName' },
    {
      title: 'Registration No.',
      dataIndex: ['student', 'regNo'],
      render: (value) => value || '-',
    },
    { title: 'Reason', dataIndex: 'reason', ellipsis: true },
    { title: 'From', dataIndex: 'from' },
    { title: 'To', dataIndex: 'to' },
    { title: 'Destination', dataIndex: 'destination' },
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
    {
      title: 'Actions',
      fixed: 'right',
      render: (_, record) => {
        if (record.status === 'pending') {
          const label = record.requestType === 'OUTPASS' ? 'Out-Pass' : 'leave'
          return (
            <Space>
              <Popconfirm title={`Approve this ${label}?`} onConfirm={() => decide(record, 'approved')}>
                <Button type="primary" size="small" icon={<CheckOutlined />}>
                  Approve
                </Button>
              </Popconfirm>
              <Popconfirm title={`Reject this ${label}?`} onConfirm={() => decide(record, 'rejected')}>
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
      <PageHeader title="Leave and Out-Pass Approvals" subtitle="Review hostel requests and track student movement." />
      {error && (
        <Alert
          type="warning"
          showIcon
          message="Unable to refresh leave requests"
          description={error.message || 'The latest requests could not be loaded.'}
          action={<Button size="small" onClick={reload}>Retry</Button>}
          style={{ marginBottom: 16 }}
        />
      )}
      <Card>
        <Tabs items={TABS} activeKey={tab} onChange={setTab} />
        <TableSearchBar query={query} onQuery={setQuery} placeholder="Search..." />
        <DataTable rowKey="id" loading={loading} dataSource={searchFiltered} columns={columns} />
      </Card>
    </>
  )
}