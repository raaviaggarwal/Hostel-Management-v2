import { useState } from 'react'
import { App as AntApp, Button, Card, Descriptions, Drawer, Form, Input, Select, Space, Timeline, Typography, Upload } from 'antd'
import { EyeOutlined, UploadOutlined } from '@ant-design/icons'
import { useResource } from '../../hooks/useResource'
import { resourceApi } from '../../api/client'
import PageHeader from '../../components/PageHeader'
import DataTable from '../../components/DataTable'
import StatusTag from '../../components/StatusTag'
import TableSearchBar from '../../components/TableSearchBar'
import AttachmentLink from '../../components/AttachmentLink'
import { useTableFilter } from '../../hooks/useTableFilter'
import { formatDateTime } from '../../utils/format'

const TYPES = ['Electrical', 'Plumbing', 'Food Related', 'Carpentry', 'Cleaning', 'Internet', 'Other']
const ACCEPT_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'application/pdf']
const MAX_BYTES = 2 * 1024 * 1024

export default function StudentComplaints() {
  const { message } = AntApp.useApp()
  const [form] = Form.useForm()
  const [submitting, setSubmitting] = useState(false)
  const [viewing, setViewing] = useState(null)
  const [history, setHistory] = useState([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [fileList, setFileList] = useState([])

  const { data, loading, reload } = useResource('/student/complaints')

  const { query, setQuery, filtered } = useTableFilter(data, ['complaintType', 'complaintDetails'])

  const attachmentFile = fileList[0]?.originFileObj

  const beforeUpload = (file) => {
    if (!ACCEPT_TYPES.includes(file.type)) {
      message.error('Only images or PDFs are allowed')
      return Upload.LIST_IGNORE
    }
    if (file.size > MAX_BYTES) {
      message.error('File too large (max 2 MB)')
      return Upload.LIST_IGNORE
    }
    return false
  }

  const handleSubmit = async (values) => {
    setSubmitting(true)
    try {
      let complaintDoc = null
      if (attachmentFile) {
        const uploaded = await resourceApi.upload('/upload', attachmentFile)
        complaintDoc = { name: uploaded.name, url: uploaded.url }
      }
      await resourceApi.post('/complaints', {
        complaintType: values.complaintType,
        complaintDetails: values.complaintDetails,
        complaintDoc,
      })
      message.success('Complaint registered')
      form.resetFields()
      setFileList([])
      reload()
    } catch (error) {
      message.error(error.message)
    } finally {
      setSubmitting(false)
    }
  }

  const openView = async (complaint) => {
    setViewing(complaint)
    setHistoryLoading(true)
    try {
      const items = await resourceApi.get(`/complaints/${complaint.id}/history`)
      setHistory(items)
    } catch {
      setHistory([])
    } finally {
      setHistoryLoading(false)
    }
  }

  const columns = [
    { title: 'Complaint No', dataIndex: 'complainNumber' },
    { title: 'Type', dataIndex: 'complaintType' },
    { title: 'Details', dataIndex: 'complaintDetails', ellipsis: true },
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
      <PageHeader title="Complaints" subtitle="Raise a complaint and track its progress." />

      <Card title="Register Complaint" style={{ marginBottom: 16, maxWidth: 560 }}>
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            name="complaintType"
            label="Complaint Type"
            rules={[{ required: true, message: 'Select a complaint type' }]}
          >
            <Select placeholder="Select type" options={TYPES.map((t) => ({ label: t, value: t }))} />
          </Form.Item>
          <Form.Item
            name="complaintDetails"
            label="Details"
            rules={[{ required: true, message: 'Describe the issue' }]}
          >
            <Input.TextArea rows={3} placeholder="Describe the issue" />
          </Form.Item>
          <Form.Item label="Attachment (optional)">
            <Upload
              fileList={fileList}
              maxCount={1}
              accept=".png,.jpg,.jpeg,.gif,.webp,.pdf"
              beforeUpload={beforeUpload}
              onChange={({ fileList: next }) => setFileList(next)}
              onRemove={() => setFileList([])}
            >
              <Button icon={<UploadOutlined />}>Choose file</Button>
            </Upload>
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={submitting}>
            Register Complaint
          </Button>
        </Form>
      </Card>

      <Card
        title="My Complaints"
        extra={<TableSearchBar query={query} onQuery={setQuery} placeholder="Search..." />}
      >
        <DataTable rowKey="id" loading={loading} dataSource={filtered} columns={columns} />
      </Card>

      <Drawer
        title={`Complaint #${viewing?.complainNumber || ''}`}
        open={!!viewing}
        onClose={() => setViewing(null)}
        width={520}
      >
        {viewing && (
          <>
            <Descriptions column={1} bordered size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="Type">{viewing.complaintType}</Descriptions.Item>
              <Descriptions.Item label="Status">
                <StatusTag status={viewing.complaintStatus} />
              </Descriptions.Item>
              <Descriptions.Item label="Registered On">
                {formatDateTime(viewing.registrationDate)}
              </Descriptions.Item>
              <Descriptions.Item label="Details">{viewing.complaintDetails}</Descriptions.Item>
              <Descriptions.Item label="Attachment">
                <AttachmentLink doc={viewing.complaintDoc} />
              </Descriptions.Item>
            </Descriptions>

            <Typography.Title level={5}>Action History</Typography.Title>
            {historyLoading ? (
              <Typography.Text type="secondary">Loading...</Typography.Text>
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
          </>
        )}
      </Drawer>
    </>
  )
}
