import { useMemo, useState } from 'react'
import { App as AntApp, Button, Card, Popconfirm, Space, Tabs } from 'antd'
import { CheckOutlined, CloseOutlined, LogoutOutlined, UndoOutlined } from '@ant-design/icons'
import { useResource } from '../../hooks/useResource'
import { resourceApi } from '../../api/client'
import PageHeader from '../../components/PageHeader'
import DataTable from '../../components/DataTable'
import StatusTag from '../../components/StatusTag'

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'active', label: 'Active' },
  { key: 'completed', label: 'Completed' },
]

export default function WardenOutPass() {
  const { message } = AntApp.useApp()
  const [tab, setTab] = useState('all')
  const { data, loading, reload } = useResource('/outpasses')

  const filtered = useMemo(
    () => (tab === 'all' ? data : data.filter((o) => o.status === tab)),
    [data, tab]
  )

  const decide = async (record, status) => {
    try {
      await resourceApi.post(`/outpasses/${record.id}/decision`, { status })
      message.success(`Out-pass ${status}`)
      reload()
    } catch (error) {
      message.error(error.message)
    }
  }

  const activate = async (record) => {
    try {
      await resourceApi.post(`/outpasses/${record.id}/activate`, {})
      message.success('Student marked as departed')
      reload()
    } catch (error) {
      message.error(error.message)
    }
  }

  const complete = async (record) => {
    try {
      await resourceApi.post(`/outpasses/${record.id}/complete`, {})
      message.success('Return marked, out-pass completed')
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
    { title: 'Actual Return', dataIndex: 'actualReturn', render: (v) => v || '-' },
    { title: 'Status', dataIndex: 'status', render: (v) => <StatusTag status={v} /> },
    {
      title: 'Actions',
      fixed: 'right',
      render: (_, record) => {
        if (record.status === 'pending') {
          return (
            <Space>
              <Popconfirm
                title="Approve this out-pass?"
                onConfirm={() => decide(record, 'approved')}
              >
                <Button type="primary" size="small" icon={<CheckOutlined />}>
                  Approve
                </Button>
              </Popconfirm>
              <Popconfirm
                title="Reject this out-pass?"
                onConfirm={() => decide(record, 'rejected')}
              >
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
      <PageHeader title="Out-Passes" subtitle="Approve requests and track student movement." />
      <Card>
        <Tabs items={TABS} activeKey={tab} onChange={setTab} />
        <DataTable rowKey="id" loading={loading} dataSource={filtered} columns={columns} />
      </Card>
    </>
  )
}