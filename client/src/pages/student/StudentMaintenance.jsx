import { useState } from 'react'
import { App as AntApp, Button, Card, Form, Input, Select, Space } from 'antd'
import { StarOutlined } from '@ant-design/icons'
import { useResource } from '../../hooks/useResource'
import { resourceApi } from '../../api/client'
import PageHeader from '../../components/PageHeader'
import DataTable from '../../components/DataTable'
import EntityModal from '../../components/EntityModal'
import StatusTag from '../../components/StatusTag'
import TableSearchBar from '../../components/TableSearchBar'
import { useTableFilter } from '../../hooks/useTableFilter'

const CATEGORIES = ['Electrical', 'Plumbing', 'Carpentry', 'Room', 'Furniture', 'Internet', 'Other']

export default function StudentMaintenance() {
  const { message } = AntApp.useApp()
  const [form] = Form.useForm()
  const [submitting, setSubmitting] = useState(false)
  const [ratingFor, setRatingFor] = useState(null)
  const [saving, setSaving] = useState(false)
  const { data, loading, reload } = useResource('/student/maintenance')

  const { query, setQuery, filtered } = useTableFilter(data, ['category', 'subcategory', 'assignedTo'])

  const handleSubmit = async (values) => {
    setSubmitting(true)
    try {
      await resourceApi.post('/maintenance', values)
      message.success('Maintenance request submitted')
      form.resetFields()
      reload()
    } catch (error) {
      message.error(error.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleRate = async (values) => {
    setSaving(true)
    try {
      await resourceApi.post(`/maintenance/${ratingFor.id}/rate`, values)
      message.success('Thank you for your feedback')
      setRatingFor(null)
      reload()
    } catch (error) {
      message.error(error.message)
    } finally {
      setSaving(false)
    }
  }

  const columns = [
    { title: 'Issue', dataIndex: 'subcategory', ellipsis: true },
    { title: 'Category', dataIndex: 'category' },
    { title: 'Priority', dataIndex: 'priority', render: (v) => <StatusTag status={v} /> },
    { title: 'Assigned To', dataIndex: 'assignedTo', render: (v) => v || '-' },
    { title: 'Raised On', dataIndex: 'createdDate' },
    { title: 'Resolved On', dataIndex: 'resolvedDate', render: (v) => v || '-' },
    { title: 'Status', dataIndex: 'status', render: (v) => <StatusTag status={v} /> },
    {
      title: 'Rating',
      dataIndex: 'rating',
      render: (v, record) => (record.status === 'resolved' ? v || '-' : '-'),
    },
    {
      title: 'Actions',
      fixed: 'right',
      render: (_, record) =>
        record.status === 'resolved' && !record.rating ? (
          <Space>
            <Button size="small" icon={<StarOutlined />} onClick={() => setRatingFor(record)}>
              Rate
            </Button>
          </Space>
        ) : (
          '-'
        ),
    },
  ]

  return (
    <>
      <PageHeader title="Maintenance" subtitle="Report an issue in your room." />

      <Card title="Report an Issue" style={{ marginBottom: 16, maxWidth: 560 }}>
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            name="category"
            label="Category"
            rules={[{ required: true, message: 'Select a category' }]}
          >
            <Select placeholder="Select category" options={CATEGORIES.map((c) => ({ label: c, value: c }))} />
          </Form.Item>
          <Form.Item
            name="subcategory"
            label="Issue"
            rules={[{ required: true, message: 'Describe the issue' }]}
          >
            <Input placeholder="e.g. Fan not working, Tap leakage" />
          </Form.Item>
          <Form.Item
            name="description"
            label="Details"
            rules={[{ required: true, message: 'Provide details' }]}
          >
            <Input.TextArea rows={3} placeholder="Describe the problem in detail" />
          </Form.Item>
          <Form.Item name="priority" label="Priority" initialValue="medium">
            <Select
              options={[
                { label: 'Low', value: 'low' },
                { label: 'Medium', value: 'medium' },
                { label: 'High', value: 'high' },
              ]}
            />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={submitting}>
            Submit Request
          </Button>
        </Form>
      </Card>

      <Card
        title="My Requests"
        extra={<TableSearchBar query={query} onQuery={setQuery} placeholder="Search..." />}
      >
        <DataTable rowKey="id" loading={loading} dataSource={filtered} columns={columns} />
      </Card>

      <EntityModal
        open={!!ratingFor}
        title={`Rate resolution for "${ratingFor?.subcategory || ''}"`}
        fields={[
          { name: 'rating', label: 'Rating (1-5)', input: 'number', props: { min: 1, max: 5 }, rules: [{ required: true }] },
          { name: 'remarks', label: 'Remarks', input: 'textarea', rows: 3 },
        ]}
        loading={saving}
        onCancel={() => setRatingFor(null)}
        onSubmit={handleRate}
      />
    </>
  )
}