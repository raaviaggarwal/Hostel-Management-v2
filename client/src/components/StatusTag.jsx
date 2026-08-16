import { Tag } from 'antd'

const STATUS_COLOR = {
  pending: 'gold',
  approved: 'green',
  rejected: 'red',
  applied: 'cyan',
  under_review: 'geekblue',
  waitlisted: 'gold',
  waitlist: 'gold',
  allocated: 'blue',
  occupied: 'blue',
  cancelled: 'default',
  paid: 'green',
  due: 'orange',
  overdue: 'red',
  available: 'green',
  partially_occupied: 'cyan',
  full: 'purple',
  maintenance: 'orange',
  medical_reserved: 'magenta',
  reserved: 'volcano',
  blocked: 'dark',
  cleaning: 'geekblue',
  present: 'green',
  absent: 'red',
  leave: 'blue',
  active: 'green',
  inactive: 'default',
  completed: 'blue',
  normal: 'green',
  late: 'orange',
  violation: 'red',
  'In Process': 'gold',
  Closed: 'green',
  'checked-in': 'blue',
  male: 'blue',
  female: 'magenta',
}

export default function StatusTag({ status }) {
  const color = STATUS_COLOR[status] || 'default'
  return <Tag color={color}>{status || 'New'}</Tag>
}
