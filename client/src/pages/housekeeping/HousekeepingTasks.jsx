import { App as AntApp, Button, Card, Popconfirm, Space } from 'antd'
import { CheckOutlined, SyncOutlined } from '@ant-design/icons'
import { useResource } from '../../hooks/useResource'
import { resourceApi } from '../../api/client'
import PageHeader from '../../components/PageHeader'
import DataTable from '../../components/DataTable'
import StatusTag from '../../components/StatusTag'
import TableSearchBar from '../../components/TableSearchBar'
import { useTableFilter } from '../../hooks/useTableFilter'

export default function HousekeepingTasks() {
  const { message } = AntApp.useApp()
  const { data, loading, reload } = useResource('/housekeeping')

  const { query, setQuery, filterValue, setFilterValue, filtered } = useTableFilter(
    data,
    ['taskType', 'area', 'assignedTo'],
    'status'
  )
  const statusOptions = [...new Set(data.map((r) => r.status).filter(Boolean))].map((v) => ({
    label: v,
    value: v,
  }))

  const updateStatus = async (record, status) => {
    try {
      await resourceApi.update('/housekeeping', record.id, { status })
      message.success(`Task marked ${status.replace('_', ' ')}`)
      reload()
    } catch (error) {
      message.error(error.message)
    }
  }

  const columns = [
    { title: 'Task', dataIndex: 'taskType' },
    { title: 'Area', dataIndex: 'area' },
    { title: 'Assigned To', dataIndex: 'assignedTo' },
    { title: 'Schedule', dataIndex: 'schedule' },
    { title: 'Status', dataIndex: 'status', render: (v) => <StatusTag status={v} /> },
    { title: 'Inspected', dataIndex: 'inspected', render: (v) => (v ? 'Yes' : 'No') },
    {
      title: 'Actions',
      fixed: 'right',
      render: (_, record) => (
        <Space>
          {record.status === 'pending' && (
            <Popconfirm title="Start this task?" onConfirm={() => updateStatus(record, 'in_progress')}>
              <Button size="small" icon={<SyncOutlined />}>
                Start
              </Button>
            </Popconfirm>
          )}
          {record.status === 'in_progress' && (
            <Popconfirm title="Mark as completed?" onConfirm={() => updateStatus(record, 'completed')}>
              <Button type="primary" size="small" icon={<CheckOutlined />}>
                Complete
              </Button>
            </Popconfirm>
          )}
          {record.status === 'completed' && <span>-</span>}
        </Space>
      ),
    },
  ]

  return (
    <>
      <PageHeader title="Tasks" subtitle="Assigned cleaning tasks for your hostel." />
      <Card>
        <div style={{ marginBottom: 16 }}>
          <TableSearchBar
            query={query}
            onQuery={setQuery}
            placeholder="Search task, area, or assignee..."
            filterOptions={statusOptions}
            filterValue={filterValue}
            onFilter={setFilterValue}
          />
        </div>
        <DataTable rowKey="id" loading={loading} dataSource={filtered} columns={columns} />
      </Card>
    </>
  )
}