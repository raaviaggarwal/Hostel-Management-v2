import { useState } from 'react'
import { App as AntApp, Button, Card, Descriptions, Space } from 'antd'
import { EditOutlined, PlusOutlined } from '@ant-design/icons'
import { useResource } from '../../hooks/useResource'
import { useTableFilter } from '../../hooks/useTableFilter'
import { resourceApi } from '../../api/client'
import PageHeader from '../../components/PageHeader'
import DataTable from '../../components/DataTable'
import EntityModal from '../../components/EntityModal'
import StatusTag from '../../components/StatusTag'
import TableSearchBar from '../../components/TableSearchBar'

export default function Medical() {
  const { message } = AntApp.useApp()
  const [dispensaryOpen, setDispensaryOpen] = useState(false)
  const [incidentOpen, setIncidentOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const { data, loading, reload } = useResource('/medical')
  const { data: students } = useResource('/students')

  const nameOf = (id) => students.find((s) => s.id === id)?.name || `#${id}`
  const dispensary = data?.dispensary
  const incidents = data?.incidents || []
  const { query, setQuery, filterValue, setFilterValue, filtered } = useTableFilter(
    incidents,
    ['studentId', 'type', 'description'],
    'status'
  )
  const statusOptions = [...new Set(incidents.map((r) => r.status).filter(Boolean))].map((v) => ({
    label: v,
    value: v,
  }))

  const saveDispensary = async (values) => {
    setSaving(true)
    try {
      await resourceApi.put('/medical/dispensary', values)
      message.success('Dispensary updated')
      setDispensaryOpen(false)
      reload()
    } catch (error) {
      message.error(error.message)
    } finally {
      setSaving(false)
    }
  }

  const saveIncident = async (values) => {
    setSaving(true)
    try {
      await resourceApi.post('/medical/incidents', values)
      message.success('Incident recorded')
      setIncidentOpen(false)
      reload()
    } catch (error) {
      message.error(error.message)
    } finally {
      setSaving(false)
    }
  }

  const columns = [
    { title: 'Student', dataIndex: 'studentId', render: (v) => nameOf(v) },
    { title: 'Date', dataIndex: 'date' },
    { title: 'Type', dataIndex: 'type' },
    { title: 'Description', dataIndex: 'description', ellipsis: true },
    { title: 'Status', dataIndex: 'status', render: (v) => <StatusTag status={v} /> },
    {
      title: 'Parent Notified',
      dataIndex: 'parentNotified',
      render: (v) => (v ? 'Yes' : 'No'),
    },
  ]

  return (
    <>
      <PageHeader
        title="Medical"
        subtitle="Dispensary details and recorded incidents."
      />

      <Card
        title="Dispensary"
        style={{ marginBottom: 16 }}
        extra={
          <Button icon={<EditOutlined />} onClick={() => setDispensaryOpen(true)}>
            Edit
          </Button>
        }
        loading={!dispensary}
      >
        {dispensary && (
          <Descriptions column={2} bordered size="small">
            <Descriptions.Item label="Doctor">{dispensary.doctor}</Descriptions.Item>
            <Descriptions.Item label="Nurse">{dispensary.nurse}</Descriptions.Item>
            <Descriptions.Item label="Contact">{dispensary.contactno}</Descriptions.Item>
            <Descriptions.Item label="Ambulance">{dispensary.ambulance}</Descriptions.Item>
          </Descriptions>
        )}
      </Card>

      <Card
        title="Incidents"
        extra={
          <Space wrap>
            <TableSearchBar
              query={query}
              onQuery={setQuery}
              placeholder="Search..."
              filterOptions={statusOptions}
              filterValue={filterValue}
              onFilter={setFilterValue}
            />
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setIncidentOpen(true)}>
              Record Incident
            </Button>
          </Space>
        }
      >
        <DataTable rowKey="id" loading={loading} dataSource={filtered} columns={columns} />
      </Card>

      <EntityModal
        open={dispensaryOpen}
        title="Edit Dispensary"
        initialValues={dispensary}
        fields={[
          { name: 'doctor', label: 'Doctor', rules: [{ required: true }] },
          { name: 'nurse', label: 'Nurse', rules: [{ required: true }] },
          { name: 'contactno', label: 'Contact No', rules: [{ required: true }] },
          { name: 'ambulance', label: 'Ambulance', rules: [{ required: true }] },
        ]}
        loading={saving}
        onCancel={() => setDispensaryOpen(false)}
        onSubmit={saveDispensary}
      />

      <EntityModal
        open={incidentOpen}
        title="Record Incident"
        fields={[
          {
            name: 'studentId',
            label: 'Student',
            input: 'select',
            showSearch: true,
            options: students.map((s) => ({ label: `${s.name} (${s.roomno || 'no room'})`, value: s.id })),
            rules: [{ required: true }],
          },
          { name: 'type', label: 'Type', rules: [{ required: true }] },
          { name: 'description', label: 'Description', input: 'textarea', rows: 3, rules: [{ required: true }] },
          { name: 'parentNotified', label: 'Parent Notified', input: 'switch' },
        ]}
        loading={saving}
        onCancel={() => setIncidentOpen(false)}
        onSubmit={saveIncident}
      />
    </>
  )
}