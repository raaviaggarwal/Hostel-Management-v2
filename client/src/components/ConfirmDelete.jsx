import { Popconfirm, Button } from 'antd'
import { DeleteOutlined } from '@ant-design/icons'

export default function ConfirmDelete({ onConfirm, title = 'Delete this record?', children }) {
  return (
    <Popconfirm
      title={title}
      okText="Delete"
      okButtonProps={{ danger: true }}
      onConfirm={onConfirm}
    >
      {children || <Button type="text" danger icon={<DeleteOutlined />} />}
    </Popconfirm>
  )
}
