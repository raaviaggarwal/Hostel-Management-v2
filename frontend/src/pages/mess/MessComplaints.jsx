import { useMemo, useState } from 'react'
import { App as AntApp, Button, Card, Popconfirm, Tabs } from 'antd'
import { CheckOutlined } from '@ant-design/icons'
import { useResource } from '../../hooks/useResource'
import { resourceApi } from '../../api/client'
import PageHeader from '../../components/PageHeader'
import DataTable from '../../components/DataTable'
import StatusTag from '../../components/StatusTag'
import TableSearchBar from '../../components/TableSearchBar'
import { useTableFilter } from '../../hooks/useTableFilter'

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'open', label: 'Open' },
  { key: 'resolved', label: 'Resolved' },
]

export default function MessComplaints() {
  const { message } = AntApp.useApp()
  const [tab, setTab] = useState('all')
  const { data, loading, reload } = useResource('/mess/complaints')
  const { data: students } = useResource('/students')

  const nameOf = (id) => students.find((s) => s.id === id)?.name || `#${id}`

  const filtered = useMemo(
    () => (tab === 'all' ? data : data.filter((c) => c.status === tab)),
    [data, tab]
  )
  const { query, setQuery, filtered: searchFiltered } = useTableFilter(filtered, [
    'studentId',
    'subject',
  ])

  const resolve = async (record) => {
    try {
      await resourceApi.update('/mess/complaints', record.id, { status: 'resolved' })
      message.success('Complaint resolved')
      reload()
    } catch (error) {
      message.error(error.message)
    }
  }

  const columns = [
    { title: 'Student', dataIndex: 'studentId', render: (v) => nameOf(v) },
    { title: 'Date', dataIndex: 'date' },
    { title: 'Subject', dataIndex: 'subject' },
    { title: 'Details', dataIndex: 'details', ellipsis: true },
    { title: 'Status', dataIndex: 'status', render: (v) => <StatusTag status={v} /> },
    {
      title: 'Actions',
      fixed: 'right',
      render: (_, record) =>
        record.status === 'open' ? (
          <Popconfirm title="Mark this complaint as resolved?" onConfirm={() => resolve(record)}>
            <Button type="primary" size="small" icon={<CheckOutlined />}>
              Resolve
            </Button>
          </Popconfirm>
        ) : (
          '-'
        ),
    },
  ]

  return (
    <>
      <PageHeader title="Mess Complaints" subtitle="Address complaints about food and service." />
      <Card>
        <Tabs items={TABS} activeKey={tab} onChange={setTab} />
        <div style={{ marginBottom: 16 }}>
          <TableSearchBar query={query} onQuery={setQuery} placeholder="Search student or subject..." />
        </div>
        <DataTable rowKey="id" loading={loading} dataSource={searchFiltered} columns={columns} pagination={false} />
      </Card>
    </>
  )
}