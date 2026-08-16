import { useMemo, useState } from 'react'
import { App as AntApp, Button, Card, Drawer, Descriptions, Input, Space, Tag } from 'antd'
import { EyeOutlined, EditOutlined } from '@ant-design/icons'
import { useResource } from '../../hooks/useResource'
import { resourceApi } from '../../api/client'
import PageHeader from '../../components/PageHeader'
import DataTable from '../../components/DataTable'
import EntityModal from '../../components/EntityModal'
import ConfirmDelete from '../../components/ConfirmDelete'
import { formatCurrency } from '../../utils/format'

export default function Students() {
  const { message } = AntApp.useApp()
  const { data, loading, reload } = useResource('/students')
  const { data: hostels } = useResource('/hostels')
  const { data: blocks } = useResource('/blocks')

  const [search, setSearch] = useState('')
  const [viewing, setViewing] = useState(null)
  const [editing, setEditing] = useState(null)
  const [editingOpen, setEditingOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  const hostelName = (id) => hostels.find((h) => h.id === id)?.name || '-'
  const blockName = (id) => blocks.find((b) => b.id === id)?.name || '-'

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    if (!q) return data
    return data.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        String(s.regNo).includes(q) ||
        s.emailid.toLowerCase().includes(q)
    )
  }, [data, search])

  const handleEdit = async (values) => {
    setSaving(true)
    try {
      await resourceApi.update(`/students/${editing.id}`, values)
      message.success('Student updated')
      setEditingOpen(false)
      reload()
    } catch (error) {
      message.error(error.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (student) => {
    try {
      await resourceApi.remove('/students', student.id)
      message.success('Student deleted')
      reload()
    } catch (error) {
      message.error(error.message)
    }
  }

  const columns = [
    { title: 'Reg No', dataIndex: 'regNo' },
    { title: 'Name', dataIndex: 'name' },
    { title: 'Gender', dataIndex: 'gender', render: (v) => <Tag>{v}</Tag> },
    { title: 'Contact', dataIndex: 'contactno' },
    { title: 'Email', dataIndex: 'emailid' },
    { title: 'Course', dataIndex: 'course' },
    { title: 'Room', dataIndex: 'roomno' },
    { title: 'Seater', dataIndex: 'seater' },
    { title: 'Fees PM', dataIndex: 'feespm', render: (v) => formatCurrency(v) },
    {
      title: 'Actions',
      fixed: 'right',
      render: (_, record) => (
        <Space>
          <Button type="text" icon={<EyeOutlined />} onClick={() => setViewing(record)} />
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => {
              setEditing(record)
              setEditingOpen(true)
            }}
          />
          <ConfirmDelete onConfirm={() => handleDelete(record)} />
        </Space>
      ),
    },
  ]

  const editFields = [
    { name: 'name', label: 'Full Name', rules: [{ required: true }] },
    { name: 'gender', label: 'Gender', input: 'radio', options: [{ label: 'Male', value: 'male' }, { label: 'Female', value: 'female' }] },
    { name: 'contactno', label: 'Contact No' },
    { name: 'emailid', label: 'Email', rules: [{ type: 'email' }] },
    { name: 'course', label: 'Course' },
    { name: 'feespm', label: 'Fees Per Month', input: 'number' },
    { name: 'guardianName', label: 'Guardian Name' },
    { name: 'guardianRelation', label: 'Guardian Relation' },
    { name: 'guardianContactno', label: 'Guardian Contact' },
    { name: 'stayfrom', label: 'Stay From' },
  ]

  return (
    <>
      <PageHeader
        title="Students"
        subtitle="View, edit or remove registered students."
        extra={
          <Input.Search
            placeholder="Search by name, reg no or email"
            allowClear
            style={{ width: 280 }}
            onChange={(e) => setSearch(e.target.value)}
          />
        }
      />

      <Card>
        <DataTable rowKey="id" loading={loading} dataSource={filtered} columns={columns} />
      </Card>

      <Drawer
        title={`${viewing?.name || 'Student'} — Details`}
        open={!!viewing}
        onClose={() => setViewing(null)}
        width={560}
      >
        {viewing && (
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="Reg No">{viewing.regNo}</Descriptions.Item>
            <Descriptions.Item label="Full Name">{viewing.name}</Descriptions.Item>
            <Descriptions.Item label="Gender">{viewing.gender}</Descriptions.Item>
            <Descriptions.Item label="Contact">{viewing.contactno}</Descriptions.Item>
            <Descriptions.Item label="Email">{viewing.emailid}</Descriptions.Item>
            <Descriptions.Item label="Course">{viewing.course}</Descriptions.Item>
            <Descriptions.Item label="Room">{viewing.roomno}</Descriptions.Item>
            <Descriptions.Item label="Seater">{viewing.seater}</Descriptions.Item>
            <Descriptions.Item label="Fees / Month">{formatCurrency(viewing.feespm)}</Descriptions.Item>
            <Descriptions.Item label="Stay From">{viewing.stayfrom}</Descriptions.Item>
            <Descriptions.Item label="Hostel">{hostelName(viewing.hostelId)}</Descriptions.Item>
            <Descriptions.Item label="Block">{blockName(viewing.blockId)}</Descriptions.Item>
            <Descriptions.Item label="Guardian">
              {viewing.guardianName} ({viewing.guardianRelation}) — {viewing.guardianContactno}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Drawer>

      <EntityModal
        open={editingOpen}
        title="Edit Student"
        initialValues={editing}
        fields={editFields}
        loading={saving}
        onCancel={() => setEditingOpen(false)}
        onSubmit={handleEdit}
      />
    </>
  )
}
