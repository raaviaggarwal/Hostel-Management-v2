import { Table } from 'antd'

export default function DataTable({ rowKey = 'id', loading, dataSource, columns, ...rest }) {
  return (
    <Table
      rowKey={rowKey}
      loading={loading}
      dataSource={dataSource}
      columns={columns}
      pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (t) => `${t} records` }}
      size="middle"
      bordered
      scroll={{ x: 'max-content' }}
      {...rest}
    />
  )
}
