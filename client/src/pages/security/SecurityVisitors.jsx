import { useMemo, useState } from 'react'
import { App as AntApp, Button, Card, Space, Tabs, Tag } from 'antd'
import { CheckOutlined, LogoutOutlined } from '@ant-design/icons'
import { useResource } from '../../hooks/useResource'
import { resourceApi } from '../../api/client'
import PageHeader from '../../components/PageHeader'
import DataTable from '../../components/DataTable'
import StatusTag from '../../components/StatusTag'
import TableSearchBar from '../../components/TableSearchBar'
import { useTableFilter } from '../../hooks/useTableFilter'
import { formatDate } from '../../utils/format'

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'checked-in', label: 'Checked In' },
  { key: 'checked-out', label: 'Checked Out' },
]

export default function SecurityVisitors() {
  const { message } = AntApp.useApp()
  const [tab, setTab] = useState('all')
  const { data, loading, reload } = useResource('/visitors')

  const filtered = useMemo(
    () => (tab === 'all' ? data : data.filter((v) => v.status === tab)),
    [data, tab]
  )
  const { query, setQuery, filtered: searchFiltered } = useTableFilter(filtered, [
    'visitorName',
    'studentName',
    'relation',
    'purpose',
  ])

  const checkin = async (visitor) => {
    try {
      await resourceApi.post(`/visitors/${visitor.id}/checkin`, {})
      message.success('Visitor checked in')
      reload()
    } catch (error) {
      message.error(error.message)
    }
  }

  const checkout = async (visitor) => {
    try {
      await resourceApi.post(`/visitors/${visitor.id}/checkout`, {})
      message.success('Visitor checked out')
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
    { title: 'In Time', dataIndex: 'inTime', render: (v) => v || '-' },
    { title: 'Out Time', dataIndex: 'outTime', render: (v) => v || '-' },
    { title: 'Purpose', dataIndex: 'purpose' },
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
              onClick={() => checkin(record)}
            >
              Check In
            </Button>
          )}
          {record.status === 'checked-in' && (
            <Button
              size="small"
              icon={<LogoutOutlined />}
              onClick={() => checkout(record)}
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
      <PageHeader title="Visitors" subtitle="Gate visitor log across all hostels." />
      <Card>
        <Tabs items={TABS} activeKey={tab} onChange={setTab} />
        <div style={{ marginBottom: 16 }}>
          <TableSearchBar
            query={query}
            onQuery={setQuery}
            placeholder="Search visitors..."
          />
        </div>
        <DataTable rowKey="id" loading={loading} dataSource={searchFiltered} columns={columns} />
      </Card>
    </>
  )
}