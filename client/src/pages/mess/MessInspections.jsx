import { useState } from 'react'
import { App as AntApp, Button, Card, Form, Input, Rate, Select } from 'antd'
import { useResource } from '../../hooks/useResource'
import { resourceApi } from '../../api/client'
import PageHeader from '../../components/PageHeader'
import DataTable from '../../components/DataTable'
import StatusTag from '../../components/StatusTag'
import TableSearchBar from '../../components/TableSearchBar'
import { useTableFilter } from '../../hooks/useTableFilter'

const AREAS = ['Kitchen', 'Dining Hall', 'Storage', 'Wash Area', 'Canteen Counter']

export default function MessInspections() {
  const { message } = AntApp.useApp()
  const [form] = Form.useForm()
  const [submitting, setSubmitting] = useState(false)
  const { data, loading, reload } = useResource('/mess/inspections')

  const { query, setQuery, filtered } = useTableFilter(data, ['area', 'remarks'])

  const handleSubmit = async (values) => {
    setSubmitting(true)
    try {
      await resourceApi.post('/mess/inspections', values)
      message.success('Inspection recorded')
      form.resetFields()
      reload()
    } catch (error) {
      message.error(error.message)
    } finally {
      setSubmitting(false)
    }
  }

  const columns = [
    { title: 'Date', dataIndex: 'date' },
    { title: 'Area', dataIndex: 'area' },
    { title: 'Hygiene', dataIndex: 'hygiene', render: (v) => <Rate disabled defaultValue={v} /> },
    { title: 'Remarks', dataIndex: 'remarks', render: (v) => v || '-' },
    { title: 'Status', render: () => <StatusTag status="recorded" /> },
  ]

  return (
    <>
      <PageHeader title="Inspections" subtitle="Record hygiene inspection results." />

      <Card title="Record Inspection" style={{ marginBottom: 16, maxWidth: 560 }}>
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            name="area"
            label="Area"
            rules={[{ required: true, message: 'Select an area' }]}
          >
            <Select placeholder="Select area" options={AREAS.map((a) => ({ label: a, value: a }))} />
          </Form.Item>
          <Form.Item name="hygiene" label="Hygiene Rating" rules={[{ required: true }]}>
            <Rate />
          </Form.Item>
          <Form.Item name="remarks" label="Remarks">
            <Input.TextArea rows={2} placeholder="Inspection notes" />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={submitting}>
            Record Inspection
          </Button>
        </Form>
      </Card>

      <Card title="Inspection Log">
        <div style={{ marginBottom: 16 }}>
          <TableSearchBar query={query} onQuery={setQuery} placeholder="Search area or remarks..." />
        </div>
        <DataTable rowKey="id" loading={loading} dataSource={filtered} columns={columns} pagination={false} />
      </Card>
    </>
  )
}