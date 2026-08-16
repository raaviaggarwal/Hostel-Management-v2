import { useMemo, useState } from 'react'
import { App as AntApp, Button, Card, Popconfirm, Space, Tabs } from 'antd'
import { LogoutOutlined, UndoOutlined } from '@ant-design/icons'
import { useResource } from '../../hooks/useResource'
import { resourceApi } from '../../api/client'
import PageHeader from '../../components/PageHeader'
import DataTable from '../../components/DataTable'
import StatusTag from '../../components/StatusTag'
import TableSearchBar from '../../components/TableSearchBar'
import { useTableFilter } from '../../hooks/useTableFilter'

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'approved', label: 'Approved' },
  { key: 'active', label: 'Active' },
]

export default function SecurityOutPasses() {
  const { message } = AntApp.useApp()
  const [tab, setTab] = useState('all')
  const { data, loading, reload } = useResource('/security/outpasses')

  const filtered = useMemo(
    () => (tab === 'all' ? data : data.filter((o) => o.status === tab)),
    [data, tab]
  )
  const { query, setQuery, filtered: searchFiltered } = useTableFilter(filtered, [
    'studentName',
    'destination',
  ])

  const activate = async (record) => {
    try {
      await resourceApi.post(`/outpasses/${record.id}/activate`, {})
      message.success('Departure verified')
      reload()
    } catch (error) {
      message.error(error.message)
    }
  }

  const complete = async (record) => {
    try {
      await resourceApi.post(`/outpasses/${record.id}/complete`, {})
      message.success('Return verified, out-pass completed')
      reload()
    } catch (error) {
      message.error(error.message)
    }
  }

  const columns = [
    { title: 'Student', dataIndex: 'studentName' },
    { title: 'Destination', dataIndex: 'destination' },
    { title: 'Departure', dataIndex: 'departure' },
    { title: 'Expected Return', dataIndex: 'expectedReturn' },
    { title: 'Status', dataIndex: 'status', render: (v) => <StatusTag status={v} /> },
    {
      title: 'Actions',
      fixed: 'right',
      render: (_, record) => {
        if (record.status === 'approved') {
          return (
            <Popconfirm title="Verify departure at gate?" onConfirm={() => activate(record)}>
              <Button size="small" icon={<LogoutOutlined />}>
                Verify Exit
              </Button>
            </Popconfirm>
          )
        }
        if (record.status === 'active') {
          return (
            <Popconfirm title="Verify return at gate?" onConfirm={() => complete(record)}>
              <Button type="primary" size="small" icon={<UndoOutlined />}>
                Verify Return
              </Button>
            </Popconfirm>
          )
        }
        return <Space>-</Space>
      },
    },
  ]

  return (
    <>
      <PageHeader title="Out-Pass Control" subtitle="Verify student movement at the gate." />
      <Card>
        <Tabs items={TABS} activeKey={tab} onChange={setTab} />
        <div style={{ marginBottom: 16 }}>
          <TableSearchBar query={query} onQuery={setQuery} placeholder="Search student or destination..." />
        </div>
        <DataTable rowKey="id" loading={loading} dataSource={searchFiltered} columns={columns} />
      </Card>
    </>
  )
}