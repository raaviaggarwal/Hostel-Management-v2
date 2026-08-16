import { useMemo } from 'react'
import { App as AntApp, Button, Card, Popconfirm, Statistic, Row, Col, Tag } from 'antd'
import { CheckOutlined } from '@ant-design/icons'
import { useResource } from '../../hooks/useResource'
import { resourceApi } from '../../api/client'
import PageHeader from '../../components/PageHeader'
import DataTable from '../../components/DataTable'
import StatusTag from '../../components/StatusTag'
import { formatCurrency } from '../../utils/format'

export default function StudentFees() {
  const { message } = AntApp.useApp()
  const { data, loading, reload } = useResource('/student/fees')

  const summary = useMemo(
    () => ({
      total: data.reduce((sum, f) => sum + f.amount, 0),
      paid: data.filter((f) => f.status === 'paid').reduce((sum, f) => sum + f.amount, 0),
      pending: data.filter((f) => f.status !== 'paid').reduce((sum, f) => sum + f.amount, 0),
    }),
    [data]
  )

  const pay = async (record) => {
    try {
      await resourceApi.post(`/student/fees/${record.id}/pay`, {})
      message.success('Fee paid successfully')
      reload()
    } catch (error) {
      message.error(error.message)
    }
  }

  const columns = [
    { title: 'Amount', dataIndex: 'amount', render: (v) => formatCurrency(v) },
    { title: 'Due Date', dataIndex: 'dueDate' },
    { title: 'Paid On', dataIndex: 'paidDate', render: (v) => v || '-' },
    { title: 'Status', dataIndex: 'status', render: (v) => <StatusTag status={v} /> },
    {
      title: 'Actions',
      fixed: 'right',
      render: (_, record) =>
        record.status !== 'paid' ? (
          <Popconfirm title="Pay this fee?" onConfirm={() => pay(record)}>
            <Button type="primary" size="small" icon={<CheckOutlined />}>
              Pay Now
            </Button>
          </Popconfirm>
        ) : (
          <Tag color="green">Settled</Tag>
        ),
    },
  ]

  return (
    <>
      <PageHeader title="Fees" subtitle="View and pay your hostel fees." />

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={8}>
          <Card size="small">
            <Statistic title="Total Fees" value={summary.total} />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card size="small">
            <Statistic title="Paid" value={summary.paid} valueStyle={{ color: '#1B8A6B' }} />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card size="small">
            <Statistic title="Pending" value={summary.pending} valueStyle={{ color: '#C0392B' }} />
          </Card>
        </Col>
      </Row>

      <Card>
        {data.length === 0 ? (
          <Card size="small" style={{ textAlign: 'center' }}>
            <Tag color="default">No fee records for this account</Tag>
          </Card>
        ) : (
          <DataTable rowKey="id" loading={loading} dataSource={data} columns={columns} />
        )}
      </Card>
    </>
  )
}
