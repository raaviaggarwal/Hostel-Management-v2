import { useMemo, useState } from 'react'
import {
  App as AntApp,
  Button,
  Card,
  Descriptions,
  Drawer,
  Form,
  Input,
  InputNumber,
  Select,
  Space,
} from 'antd'
import { EyeOutlined, SwapOutlined, PlusOutlined } from '@ant-design/icons'
import { useResource } from '../../hooks/useResource'
import { useAuth } from '../../context/auth'
import { resourceApi } from '../../api/client'
import PageHeader from '../../components/PageHeader'
import DataTable from '../../components/DataTable'
import EntityModal from '../../components/EntityModal'

export default function WardenStudents() {
  const { message } = AntApp.useApp()
  const { user } = useAuth()

  const { data, loading, reload } = useResource('/students')
  const { data: rooms = [] } = useResource('/rooms')
  const { data: blocks = [] } = useResource('/blocks')

  const [search, setSearch] = useState('')
  const [viewing, setViewing] = useState(null)
  const [assignOpen, setAssignOpen] = useState(false)
  const [assigning, setAssigning] = useState(null)
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
  })

  const roomOptions = rooms.map((room) => ({
    label: `${room.roomNo} — ${
      blocks.find((b) => b.id === room.blockId)?.name || '-'
    } (${room.seater}-seater, ${room.status})`,
    value: room.id,
  }))

  const blockName = (id) =>
    blocks.find((b) => b.id === id)?.name || '-'

  const filtered = useMemo(() => {
    const q = search.toLowerCase()

    return data.filter(
      (s) =>
        String(s.hostelId) === String(user?.hostelId) &&
        (!q ||
          s.name?.toLowerCase().includes(q) ||
          String(s.regNo || '').includes(q) ||
          s.emailid?.toLowerCase().includes(q))
    )
  }, [data, search, user])

  const openAssign = (student) => {
    setAssigning(student)
    setAssignOpen(true)
  }

  const handleAssign = async (values) => {
    const room = rooms.find((r) => r.id === values.roomId)

    if (!room) {
      message.error('Please select a valid room')
      return
    }

    setSaving(true)

    try {
      await resourceApi.update(`/students/${assigning.id}/room`, {
        roomno: room.roomNo,
        blockId: room.blockId,
        hostelId: blocks.find((b) => b.id === room.blockId)?.hostelId,
      })

      message.success('Room assigned successfully')
      setAssignOpen(false)
      setAssigning(null)
      reload()
    } catch (error) {
      message.error(error.message || 'Failed to assign room')
    } finally {
      setSaving(false)
    }
  }

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
    })
  }

  const handleAddStudent = async (e) => {
    e.preventDefault()

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
      title: 'Block',
      render: (_, record) => blockName(record.blockId),
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
      title: 'Contact',
      dataIndex: 'contactno',
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
            icon={<SwapOutlined />}
            onClick={() => openAssign(record)}
          />
        </Space>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        title="Students"
        subtitle="Students registered in your hostel."
        extra={
          <Space>
            <Input.Search
              placeholder="Search by name, reg no or email"
              allowClear
              style={{ width: 250 }}
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
          dataSource={filtered}
          columns={columns}
        />
      </Card>

      {/* VIEW STUDENT DRAWER */}
      <Drawer
        title={`${viewing?.name || 'Student'} — Details`}
        open={!!viewing}
        onClose={() => setViewing(null)}
        width={520}
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

            <Descriptions.Item label="Block">
              {blockName(viewing.blockId)}
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

            <Descriptions.Item label="Guardian">
              {viewing.guardianName} ({viewing.guardianRelation}) —{' '}
              {viewing.guardianContactno}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Drawer>

      {/* ASSIGN ROOM MODAL */}
      <EntityModal
        open={assignOpen}
        title={`Assign room for ${assigning?.name || ''}`}
        initialValues={null}
        fields={[
          {
            name: 'roomId',
            label: 'Room',
            input: 'select',
            rules: [{ required: true }],
            options: roomOptions,
          },
        ]}
        loading={saving}
        onCancel={() => {
          setAssignOpen(false)
          setAssigning(null)
        }}
        onSubmit={handleAssign}
      />

      {/* ADD STUDENT DRAWER */}
      <Drawer
        title="Add Student"
        open={addStudentOpen}
        onClose={() => {
          setAddStudentOpen(false)
          resetStudentForm()
        }}
        width={560}
      >
        <Form layout="vertical" onSubmitCapture={handleAddStudent}>
          <Form.Item label="Registration Number" required>
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

          <Form.Item label="Full Name" required>
            <Input
              placeholder="Enter student name"
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
                { label: 'Male', value: 'male' },
                { label: 'Female', value: 'female' },
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
              placeholder="e.g. Father, Mother, Guardian"
              value={newStudent.guardianRelation}
              onChange={(e) =>
                setNewStudent({
                  ...newStudent,
                  guardianRelation: e.target.value,
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