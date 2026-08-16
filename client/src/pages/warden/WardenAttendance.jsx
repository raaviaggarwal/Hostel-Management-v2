import { useEffect, useMemo, useState } from 'react'
import { App as AntApp, Button, Card, DatePicker, Radio, Select, Space, Tag, Typography } from 'antd'
import { SaveOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { apiFetch, resourceApi } from '../../api/client'
import { useResource } from '../../hooks/useResource'
import { useAuth } from '../../context/auth'
import { useTableFilter } from '../../hooks/useTableFilter'
import PageHeader from '../../components/PageHeader'
import DataTable from '../../components/DataTable'
import TableSearchBar from '../../components/TableSearchBar'

export default function WardenAttendance() {
  const { message } = AntApp.useApp()
  const { user } = useAuth()
  const { data: blocks } = useResource('/blocks')

  const [date, setDate] = useState(dayjs())
  const [blockId, setBlockId] = useState(undefined)
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  const dateStr = date.format('YYYY-MM-DD')

  const hostelBlocks = useMemo(
    () => blocks.filter((b) => String(b.hostelId) === String(user?.hostelId)),
    [blocks, user]
  )

  const load = () => {
    setLoading(true)
    const params = new URLSearchParams({ date: dateStr })
    if (blockId) params.set('blockId', blockId)
    resourceApi
      .get(`/warden/attendance/register?${params.toString()}`)
      .then((result) => setRecords(result.records || []))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateStr, blockId])

  const { query, setQuery, filtered } = useTableFilter(records, ['regNo', 'name'])

  const setStatus = (studentId, status) => {
    setRecords((prev) => prev.map((r) => (r.studentId === studentId ? { ...r, status } : r)))
  }

  const save = async () => {
    setSaving(true)
    try {
      await apiFetch('/warden/attendance/register', {
        method: 'PUT',
        body: JSON.stringify({
          date: dateStr,
          records: records.map(({ studentId, status }) => ({ studentId, status })),
        }),
      })
      message.success('Attendance saved')
      load()
    } catch (error) {
      message.error(error.message)
    } finally {
      setSaving(false)
    }
  }

  const counts = useMemo(
    () => ({
      present: records.filter((r) => r.status === 'present').length,
      absent: records.filter((r) => r.status === 'absent').length,
      leave: records.filter((r) => r.status === 'leave').length,
    }),
    [records]
  )

  const columns = [
    { title: 'Reg No', dataIndex: 'regNo' },
    { title: 'Name', dataIndex: 'name' },
    { title: 'Room', dataIndex: 'roomno' },
    {
      title: 'Status',
      dataIndex: 'status',
      render: (status, record) => (
        <Radio.Group value={status} onChange={(e) => setStatus(record.studentId, e.target.value)}>
          <Radio.Button value="present">Present</Radio.Button>
          <Radio.Button value="absent">Absent</Radio.Button>
          <Radio.Button value="leave">Leave</Radio.Button>
        </Radio.Group>
      ),
    },
  ]

  return (
    <>
      <PageHeader
        title="Attendance"
        subtitle="Mark daily attendance for students in your hostel."
        extra={
          <Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={save}>
            Save Attendance
          </Button>
        }
      />

      <Card style={{ marginBottom: 16 }}>
        <Space wrap>
          <DatePicker value={date} onChange={(d) => d && setDate(d)} allowClear={false} />
          <Select
            placeholder="All blocks"
            allowClear
            style={{ width: 200 }}
            value={blockId}
            onChange={setBlockId}
            options={hostelBlocks.map((b) => ({ label: b.name, value: b.id }))}
          />
          <Typography.Text type="secondary">
            Present: <Tag color="green">{counts.present}</Tag>
            Absent: <Tag color="red">{counts.absent}</Tag>
            Leave: <Tag color="blue">{counts.leave}</Tag>
          </Typography.Text>
        </Space>
      </Card>

      <Card>
        <TableSearchBar query={query} onQuery={setQuery} placeholder="Search..." />
        <DataTable
          rowKey="studentId"
          loading={loading}
          dataSource={filtered}
          columns={columns}
          pagination={false}
        />
      </Card>
    </>
  )
}
