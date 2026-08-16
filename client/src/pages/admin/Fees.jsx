import { useState } from 'react'
import { App as AntApp, Button, Card, Tabs, Tag } from 'antd'
import { PlusOutlined, CheckOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { useResource } from '../../hooks/useResource'
import { resourceApi } from '../../api/client'
import PageHeader from '../../components/PageHeader'
import DataTable from '../../components/DataTable'
import EntityModal from '../../components/EntityModal'
import StatusTag from '../../components/StatusTag'
import TableSearchBar from '../../components/TableSearchBar'
import { useTableFilter } from '../../hooks/useTableFilter'
import { formatCurrency } from '../../utils/format'

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'paid', label: 'Paid' },
  { key: 'due', label: 'Due' },
  { key: 'overdue', label: 'Overdue' },
]

export default function Fees() {
  const { message } = AntApp.useApp()
  const [tab, setTab] = useState('all')
  const { data, loading, reload } = useResource(`/fees?status=${tab}`)
  const { data: students } = useResource('/students')
  const { query, setQuery, filtered } = useTableFilter(data, ['studentName'])

  const [modalOpen, setModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  const regNoOf = (studentId) => students.find((s) => s.id === studentId)?.regNo || '-'

  const openCreate = () => setModalOpen(true)

  const handleCreate = async (values) => {
    setSaving(true)
    try {
      const student = students.find((s) => s.id === values.studentId)
      await resourceApi.post('/fees', {
        studentId: values.studentId,
        studentName: student?.name,
        amount: values.amount,
        dueDate: values.dueDate ? dayjs(values.dueDate).format('YYYY-MM-DD') : undefined,
        status: values.status,
      })
      message.success('Fee record added')
      setModalOpen(false)
      reload()
    } catch (error) {
      message.error(error.message)
    } finally {
      setSaving(false)
    }
  }

  const markPaid = async (record) => {
    try {
      await resourceApi.update('/fees', record.id, { status: 'paid' })
      message.success('Fee marked as paid')
      reload()
    } catch (error) {
      message.error(error.message)
    }
  }

  const columns = [
    { title: 'Student', dataIndex: 'studentName' },
    { title: 'Reg No', render: (_, r) => regNoOf(r.studentId) },
    { title: 'Amount', dataIndex: 'amount', render: (v) => formatCurrency(v) },
    { title: 'Due Date', dataIndex: 'dueDate' },
    { title: 'Paid On', dataIndex: 'paidDate', render: (v) => v || '-' },
    { title: 'Status', dataIndex: 'status', render: (v) => <StatusTag status={v} /> },
    {
      title: 'Actions',
      fixed: 'right',
      render: (_, record) =>
        record.status !== 'paid' ? (
          <Button
            type="primary"
            size="small"
            icon={<CheckOutlined />}
            onClick={() => markPaid(record)}
          >
            Mark Paid
          </Button>
        ) : (
          <Tag color="green">Settled</Tag>
        ),
    },
  ]

  return (
    <>
      <PageHeader
        title="Fees"
        subtitle="Track hostel fee records and collect payments."
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            Add Fee Record
          </Button>
        }
      />

      <Card>
        <Tabs items={TABS} activeKey={tab} onChange={setTab} />
        <TableSearchBar query={query} onQuery={setQuery} placeholder="Search..." />
        <DataTable rowKey="id" loading={loading} dataSource={filtered} columns={columns} />
      </Card>

      <EntityModal
        open={modalOpen}
        title="Add Fee Record"
        fields={[
          {
            name: 'studentId',
            label: 'Student',
            input: 'select',
            rules: [{ required: true }],
            options: students.map((s) => ({ label: `${s.name} (${s.regNo})`, value: s.id })),
          },
          { name: 'amount', label: 'Amount', input: 'number', rules: [{ required: true }] },
          { name: 'dueDate', label: 'Due Date', input: 'date' },
          {
            name: 'status',
            label: 'Status',
            input: 'select',
            options: [
              { label: 'Due', value: 'due' },
              { label: 'Overdue', value: 'overdue' },
            ],
          },
        ]}
        loading={saving}
        onCancel={() => setModalOpen(false)}
        onSubmit={handleCreate}
      />
    </>
  )
}
