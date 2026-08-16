import { Card, Table, Tag } from 'antd'
import { useResource } from '../../hooks/useResource'
import PageHeader from '../../components/PageHeader'

export default function StudentMessMenu() {
  const { data, loading } = useResource('/mess-menu')

  const columns = [
    { title: 'Day', dataIndex: 'day', fixed: 'left', render: (v) => <strong>{v}</strong> },
    { title: 'Breakfast', dataIndex: 'breakfast', render: (v) => <Tag color="blue">{v}</Tag> },
    { title: 'Lunch', dataIndex: 'lunch', render: (v) => <Tag color="green">{v}</Tag> },
    { title: 'Dinner', dataIndex: 'dinner', render: (v) => <Tag color="purple">{v}</Tag> },
  ]

  return (
    <>
      <PageHeader title="Mess Menu" subtitle="This week's mess menu." />
      <Card>
        <Table
          rowKey="id"
          loading={loading}
          dataSource={data}
          columns={columns}
          pagination={false}
          size="middle"
          bordered
          scroll={{ x: 'max-content' }}
        />
      </Card>
    </>
  )
}
