import { useState } from 'react'
import { App as AntApp, Button, Card, DatePicker, Form, Input } from 'antd'
import dayjs from 'dayjs'
import { useResource } from '../../hooks/useResource'
import { resourceApi } from '../../api/client'
import PageHeader from '../../components/PageHeader'
import DataTable from '../../components/DataTable'
import StatusTag from '../../components/StatusTag'
import TableSearchBar from '../../components/TableSearchBar'
import { useTableFilter } from '../../hooks/useTableFilter'

export default function StudentVisitors() {
  const { message } = AntApp.useApp()
  const [form] = Form.useForm()
  const [submitting, setSubmitting] = useState(false)
  const { data, loading, reload } = useResource('/student/visitors')

  const { query, setQuery, filterValue, setFilterValue, filtered } = useTableFilter(
    data,
    ['visitorName', 'relation'],
    'status'
  )
  const statusOptions = [...new Set(data.map((r) => r.status).filter(Boolean))].map((v) => ({ label: v, value: v }))

  const handleSubmit = async (values) => {
    setSubmitting(true)
    try {
      await resourceApi.post('/visitors', {
        visitorName: values.visitorName,
        relation: values.relation,
        date: dayjs(values.date).format('YYYY-MM-DD'),
      })
      message.success('Visitor registered')
      form.resetFields()
      reload()
    } catch (error) {
      message.error(error.message)
    } finally {
      setSubmitting(false)
    }
  }

  const columns = [
    { title: 'Visitor Name', dataIndex: 'visitorName' },
    { title: 'Relation', dataIndex: 'relation' },
    { title: 'Date', dataIndex: 'date' },
    { title: 'Status', dataIndex: 'status', render: (v) => <StatusTag status={v} /> },
  ]

  return (
    <>
      <PageHeader title="Visitors" subtitle="Register a visitor for entry into the hostel." />

      <Card title="Register Visitor" style={{ marginBottom: 16, maxWidth: 560 }}>
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            name="visitorName"
            label="Visitor Name"
            rules={[{ required: true, message: 'Enter visitor name' }]}
          >
            <Input placeholder="Visitor's full name" />
          </Form.Item>
          <Form.Item
            name="relation"
            label="Relation"
            rules={[{ required: true, message: 'Enter relation' }]}
          >
            <Input placeholder="e.g. Father, Mother, Friend" />
          </Form.Item>
          <Form.Item
            name="date"
            label="Visit Date"
            rules={[{ required: true, message: 'Select the visit date' }]}
          >
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={submitting}>
            Register Visitor
          </Button>
        </Form>
      </Card>

      <Card
        title="My Visitor Log"
        extra={
          <TableSearchBar
            query={query}
            onQuery={setQuery}
            placeholder="Search..."
            filterOptions={statusOptions}
            filterValue={filterValue}
            onFilter={setFilterValue}
          />
        }
      >
        <DataTable rowKey="id" loading={loading} dataSource={filtered} columns={columns} />
      </Card>
    </>
  )
}
