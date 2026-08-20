import { useMemo, useState } from 'react'
import { App as AntApp, Button, Card, Descriptions, Modal, Skeleton, Space, Tabs, Timeline, Typography } from 'antd'
import { EyeOutlined, ToolOutlined } from '@ant-design/icons'
import { useResource } from '../../hooks/useResource'
import { useAuth } from '../../context/auth'
import { useTableFilter } from '../../hooks/useTableFilter'
import { resourceApi } from '../../api/client'
import PageHeader from '../../components/PageHeader'
import DataTable from '../../components/DataTable'
import EntityModal from '../../components/EntityModal'
import StatusTag from '../../components/StatusTag'
import TableSearchBar from '../../components/TableSearchBar'
import { formatDateTime } from '../../utils/format'

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'new', label: 'New' },
  { key: 'inprocess', label: 'In Process' },
  { key: 'closed', label: 'Closed' },
]

export default function WardenComplaints() {
  const { message } = AntApp.useApp()
  const { user } = useAuth()
  const [tab, setTab] = useState('all')
  const [viewing, setViewing] = useState(null)
  const [history, setHistory] = useState([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [actionOpen, setActionOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  const { data, loading, reload } = useResource(`/complaints?status=${tab}`)
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

  const scoped = useMemo(
    () => data.filter((c) => hostelStudentIds.has(c.studentId)),
    [data, hostelStudentIds]
  )

  const { query, setQuery, filtered: searchFiltered } = useTableFilter(scoped, [
    'studentName',
    'complaintType',
    'complaintDetails',
    'preferredVisitingHours',
  ])

  const openView = async (complaint) => {
    setViewing(complaint)
    setHistoryLoading(true)
    try {
      const items = await resourceApi.get(`/complaints/${complaint.id}/history`)
      setHistory(items)
    } catch (error) {
      message.error(error.message)
    } finally {
      setHistoryLoading(false)
    }
  }

  const handleAction = async (values) => {
    setSaving(true)
    try {
      await resourceApi.post(`/complaints/${viewing.id}/action`, {
        status: values.status,
        remark: values.remark,
      })
      message.success('Complaint updated')
      setActionOpen(false)
      openView(viewing)
      reload()
    } catch (error) {
      message.error(error.message)
    } finally {
      setSaving(false)
    }
  }

  const columns = [
    { title: 'Complaint No', dataIndex: 'complainNumber' },
    { title: 'Student', dataIndex: 'studentName' },
    { title: 'Type', dataIndex: 'complaintType' },
    { title: 'Details', dataIndex: 'complaintDetails', ellipsis: true },
    { title: 'Preferred Visiting Hours', dataIndex: 'preferredVisitingHours', width: 120 },
    { title: 'Registered On', dataIndex: 'registrationDate', render: (v) => formatDateTime(v) },
    { title: 'Status', dataIndex: 'complaintStatus', render: (v) => <StatusTag status={v} /> },
    {
      title: 'Actions',
      fixed: 'right',
      render: (_, record) => (
        <Button type="text" icon={<EyeOutlined />} onClick={() => openView(record)} />
      ),
    },
  ]

  return (
    <>
      <PageHeader
        title="Complaints"
        subtitle="Student complaints raised in your hostel."
      />

      <Card>
        <Tabs items={TABS} activeKey={tab} onChange={setTab} />
        <TableSearchBar query={query} onQuery={setQuery} placeholder="Search..." />
        <DataTable rowKey="id" loading={loading} dataSource={searchFiltered} columns={columns} />
      </Card>

      <Modal
        open={!!viewing}
        title={`Complaint #${viewing?.complainNumber || ''}`}
        onCancel={() => setViewing(null)}
        footer={null}
        width={600}
      >
        {viewing ? (
          <>
            <Descriptions column={1} bordered size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="Student">{viewing.studentName}</Descriptions.Item>
              <Descriptions.Item label="Type">{viewing.complaintType}</Descriptions.Item>
              <Descriptions.Item label="Status">
                <StatusTag status={viewing.complaintStatus} />
              </Descriptions.Item>
              <Descriptions.Item label="Registered On">
                {formatDateTime(viewing.registrationDate)}
              </Descriptions.Item>
              <Descriptions.Item label="Details">{viewing.complaintDetails}</Descriptions.Item>
              <Descriptions.Item label="Preferred Visiting Hours">
                {viewing.preferredVisitingHours}
              </Descriptions.Item>
            </Descriptions>

            <Card
              size="small"
              title="Action History"
              extra={
                <Button
                  type="primary"
                  size="small"
                  icon={<ToolOutlined />}
                  onClick={() => setActionOpen(true)}
                >
                  Take Action
                </Button>
              }
            >
              {historyLoading ? (
                <Skeleton active paragraph={{ rows: 2 }} />
              ) : history.length === 0 ? (
                <Typography.Text type="secondary">No actions taken yet.</Typography.Text>
              ) : (
                <Timeline
                  items={history.map((entry) => ({
                    color: entry.compalintStatus === 'Closed' ? 'green' : 'gold',
                    children: (
                      <div>
                        <Space>
                          <strong>{entry.compalintStatus}</strong>
                          <Typography.Text type="secondary">
                            {formatDateTime(entry.postingDate)}
                          </Typography.Text>
                        </Space>
                        {entry.complaintRemark && (
                          <div>
                            <Typography.Text type="secondary">
                              {entry.complaintRemark}
                            </Typography.Text>
                          </div>
                        )}
                      </div>
                    ),
                  }))}
                />
              )}
            </Card>
          </>
        ) : null}
      </Modal>

      <EntityModal
        open={actionOpen}
        title="Take Action"
        fields={[
          {
            name: 'status',
            label: 'Status',
            input: 'select',
            rules: [{ required: true }],
            options: [
              { label: 'In Process', value: 'In Process' },
              { label: 'Closed', value: 'Closed' },
            ],
          },
          { name: 'remark', label: 'Remark', input: 'textarea', rows: 3 },
        ]}
        loading={saving}
        onCancel={() => setActionOpen(false)}
        onSubmit={handleAction}
      />
    </>
  )
}
