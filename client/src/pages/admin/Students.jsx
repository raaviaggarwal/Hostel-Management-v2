import { useMemo, useState } from 'react'
import {
  App as AntApp,
  Button,
  Card,
  Drawer,
  Descriptions,
  Form,
  Input,
  InputNumber,
  Select,
  Space,
  Tag,
} from 'antd'
import {
  EyeOutlined,
  EditOutlined,
  PlusOutlined,
} from '@ant-design/icons'

import { useResource } from '../../hooks/useResource'
import { resourceApi } from '../../api/client'
import PageHeader from '../../components/PageHeader'
import DataTable from '../../components/DataTable'
import EntityModal from '../../components/EntityModal'
import ConfirmDelete from '../../components/ConfirmDelete'

export default function Students() {
  const { message } = AntApp.useApp()

  const { data = [], loading, reload } = useResource('/students')
  const { data: hostels = [] } = useResource('/hostels')
  const { data: blocks = [] } = useResource('/blocks')

  const [search, setSearch] = useState('')
  const [viewing, setViewing] = useState(null)
  const [editing, setEditing] = useState(null)
  const [editingOpen, setEditingOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [addStudentOpen, setAddStudentOpen] = useState(false)

  const [newStudent, setNewStudent] = useState({
    regNo: '',
    name: '',
    gender: 'male',
    year: 1,
    course: '',
    contactno: '',
    emailid: '',
    guardianName: '',
    guardianRelation: '',
    guardianContactno: '',
  })

  const hostelName = (id) => {
    return hostels.find((h) => h.id === id)?.name || '-'
  }

  const blockName = (id) => {
    return blocks.find((b) => b.id === id)?.name || '-'
  }

  const filteredData = useMemo(() => {
    const q = search.toLowerCase().trim()

    if (!q) return data

    return data.filter((s) => {
      return (
        s.name?.toLowerCase().includes(q) ||
        String(s.regNo || '').toLowerCase().includes(q) ||
        s.emailid?.toLowerCase().includes(q)
      )
    })
  }, [data, search])

  const resetStudentForm = () => {
    setNewStudent({
      regNo: '',
      name: '',
      gender: 'male',
      year: 1,
      course: '',
      contactno: '',
      emailid: '',
      guardianName: '',
      guardianRelation: '',
      guardianContactno: '',
    })
  }

  const handleEdit = async (values) => {
    if (!editing?.id) return

    setSaving(true)

    try {
      await resourceApi.update(`/students/${editing.id}`, values)

      message.success('Student updated successfully')
      setEditingOpen(false)
      setEditing(null)
      reload()
    } catch (error) {
      message.error(error.message || 'Failed to update student')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (student) => {
    try {
      await resourceApi.remove('/students', student.id)

      message.success('Student deleted successfully')
      reload()
    } catch (error) {
      message.error(error.message || 'Failed to delete student')
    }
  }

  const handleAddStudent = async () => {
    if (!newStudent.regNo || !newStudent.name) {
      message.error('Registration number and name are required')
      return
    }

    setSaving(true)

    try {
      await resourceApi.post('/students', newStudent)

      message.success('Student added successfully')
      setAddStudentOpen(false)
      resetStudentForm()
      reload()
    } catch (error) {
      message.error(error.message || 'Failed to add student')
    } finally {
      setSaving(false)
    }
  }

  const editFields = [
    {
      name: 'name',
      label: 'Full Name',
      rules: [{ required: true }],
    },
    {
      name: 'gender',
      label: 'Gender',
      input: 'radio',
      options: [
        { label: 'Male', value: 'male' },
        { label: 'Female', value: 'female' },
      ],
    },
    {
      name: 'contactno',
      label: 'Contact No',
    },
    {
      name: 'emailid',
      label: 'Email',
      rules: [{ type: 'email' }],
    },
    {
      name: 'course',
      label: 'Course',
    },
    {
      name: 'guardianName',
      label: 'Guardian Name',
    },
    {
      name: 'guardianRelation',
      label: 'Guardian Relation',
    },
    {
      name: 'guardianContactno',
      label: 'Guardian Contact',
    },
    {
      name: 'stayfrom',
      label: 'Stay From',
    },
  ]

  const columns = [
    {
      title: 'Reg No',
      dataIndex: 'regNo',
    },
    {
      title: 'Name',
      dataIndex: 'name',
    },
    {
      title: 'Gender',
      dataIndex: 'gender',
      render: (value) => <Tag>{value}</Tag>,
    },
    {
      title: 'Contact',
      dataIndex: 'contactno',
    },
    {
      title: 'Email',
      dataIndex: 'emailid',
    },
    {
      title: 'Course',
      dataIndex: 'course',
    },
    {
      title: 'Room',
      dataIndex: 'roomno',
    },
    {
      title: 'Seater',
      dataIndex: 'seater',
    },
    {
      title: 'Actions',
      fixed: 'right',
      render: (_, record) => (
        <Space>
          <Button
            type="text"
            icon={<EyeOutlined />}
            onClick={() => setViewing(record)}
          />

          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => {
              setEditing(record)
              setEditingOpen(true)
            }}
          />

          <ConfirmDelete
            onConfirm={() => handleDelete(record)}
          />
        </Space>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        title="Students"
        subtitle="View, edit or remove registered students."
        extra={
          <Space>
            <Input.Search
              placeholder="Search by name, reg no or email"
              allowClear
              style={{ width: 280 }}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setAddStudentOpen(true)}
              disabled={saving}
            >
              Add Student
            </Button>
          </Space>
        }
      />

      <Card>
        <DataTable
          rowKey="id"
          loading={loading}
          dataSource={filteredData}
          columns={columns}
        />
      </Card>

      <Drawer
        title={`${viewing?.name || 'Student'} — Details`}
        open={!!viewing}
        onClose={() => setViewing(null)}
        width={560}
      >
        {viewing && (
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="Reg No">
              {viewing.regNo}
            </Descriptions.Item>

            <Descriptions.Item label="Full Name">
              {viewing.name}
            </Descriptions.Item>

            <Descriptions.Item label="Gender">
              {viewing.gender}
            </Descriptions.Item>

            <Descriptions.Item label="Contact">
              {viewing.contactno}
            </Descriptions.Item>

            <Descriptions.Item label="Email">
              {viewing.emailid}
            </Descriptions.Item>

            <Descriptions.Item label="Course">
              {viewing.course}
            </Descriptions.Item>

            <Descriptions.Item label="Room">
              {viewing.roomno}
            </Descriptions.Item>

            <Descriptions.Item label="Seater">
              {viewing.seater}
            </Descriptions.Item>

            <Descriptions.Item label="Stay From">
              {viewing.stayfrom}
            </Descriptions.Item>

            <Descriptions.Item label="Hostel">
              {hostelName(viewing.hostelId)}
            </Descriptions.Item>

            <Descriptions.Item label="Block">
              {blockName(viewing.blockId)}
            </Descriptions.Item>

            <Descriptions.Item label="Guardian">
              {viewing.guardianName || '-'}
              {viewing.guardianRelation
                ? ` (${viewing.guardianRelation})`
                : ''}
              {viewing.guardianContactno
                ? ` — ${viewing.guardianContactno}`
                : ''}
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
        onCancel={() => {
          setEditingOpen(false)
          setEditing(null)
        }}
        onSubmit={handleEdit}
      />

      <Drawer
        title="Add Student"
        open={addStudentOpen}
        onClose={() => {
          setAddStudentOpen(false)
          resetStudentForm()
        }}
        width={560}
      >
        <Form
          layout="vertical"
          onFinish={handleAddStudent}
        >
          <Form.Item
            label="Registration Number"
            required
          >
            <Input
              placeholder="Enter registration number"
              value={newStudent.regNo}
              onChange={(e) =>
                setNewStudent({
                  ...newStudent,
                  regNo: e.target.value,
                })
              }
            />
          </Form.Item>

          <Form.Item
            label="Full Name"
            required
          >
            <Input
              placeholder="Enter full name"
              value={newStudent.name}
              onChange={(e) =>
                setNewStudent({
                  ...newStudent,
                  name: e.target.value,
                })
              }
            />
          </Form.Item>

          <Form.Item label="Gender">
            <Select
              value={newStudent.gender}
              onChange={(value) =>
                setNewStudent({
                  ...newStudent,
                  gender: value,
                })
              }
              options={[
                {
                  label: 'Male',
                  value: 'male',
                },
                {
                  label: 'Female',
                  value: 'female',
                },
              ]}
            />
          </Form.Item>

          <Form.Item label="Year">
            <InputNumber
              min={1}
              max={10}
              style={{ width: '100%' }}
              value={newStudent.year}
              onChange={(value) =>
                setNewStudent({
                  ...newStudent,
                  year: value || 1,
                })
              }
            />
          </Form.Item>

          <Form.Item label="Course">
            <Input
              placeholder="Enter course"
              value={newStudent.course}
              onChange={(e) =>
                setNewStudent({
                  ...newStudent,
                  course: e.target.value,
                })
              }
            />
          </Form.Item>

          <Form.Item label="Contact Number">
            <Input
              placeholder="Enter contact number"
              value={newStudent.contactno}
              onChange={(e) =>
                setNewStudent({
                  ...newStudent,
                  contactno: e.target.value,
                })
              }
            />
          </Form.Item>

          <Form.Item label="Email">
            <Input
              type="email"
              placeholder="Enter email address"
              value={newStudent.emailid}
              onChange={(e) =>
                setNewStudent({
                  ...newStudent,
                  emailid: e.target.value,
                })
              }
            />
          </Form.Item>

          <Form.Item label="Guardian Name">
            <Input
              placeholder="Enter guardian name"
              value={newStudent.guardianName}
              onChange={(e) =>
                setNewStudent({
                  ...newStudent,
                  guardianName: e.target.value,
                })
              }
            />
          </Form.Item>

          <Form.Item label="Guardian Relation">
            <Input
              placeholder="Father, Mother, etc."
              value={newStudent.guardianRelation}
              onChange={(e) =>
                setNewStudent({
                  ...newStudent,
                  guardianRelation: e.target.value,
                })
              }
            />
          </Form.Item>

          <Form.Item label="Guardian Contact">
            <Input
              placeholder="Enter guardian contact number"
              value={newStudent.guardianContactno}
              onChange={(e) =>
                setNewStudent({
                  ...newStudent,
                  guardianContactno: e.target.value,
                })
              }
            />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button
                onClick={() => {
                  setAddStudentOpen(false)
                  resetStudentForm()
                }}
              >
                Cancel
              </Button>

              <Button
                type="primary"
                htmlType="submit"
                loading={saving}
              >
                Add Student
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Drawer>
    </div>
  )
}   