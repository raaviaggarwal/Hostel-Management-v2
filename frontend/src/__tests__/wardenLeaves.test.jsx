import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import dayjs from 'dayjs'

const { resourceApi, requestData } = vi.hoisted(() => ({
  resourceApi: { post: vi.fn() },
  requestData: {
    leaves: [
      {
        id: 1,
        studentId: 10,
        requestType: 'OUTPASS',
        status: 'pending',
        studentName: 'Aarav Sharma',
        student: { regNo: '231030101', hostelId: 1 },
        reason: 'Medical appointment',
        from: '2026-11-15',
        to: '2026-11-15',
        requestedDepartureAt: '2026-11-15T08:30:00.000Z',
        expectedReturnAt: '2026-11-15T15:00:00.000Z',
      },
      {
        id: 2,
        studentId: 11,
        requestType: 'LEAVE',
        status: 'pending',
        studentName: 'Hostel Student',
        student: { regNo: '231030102', hostelId: 1 },
        reason: 'Regular leave',
        from: '2026-11-15',
        to: '2026-11-16',
      },
      {
        id: 4,
        studentId: 13,
        requestType: 'OUTPASS',
        status: 'rejected',
        studentName: 'Rejected Student',
        student: { regNo: '231030103', hostelId: 1 },
        reason: 'Already decided',
        from: '2026-11-15',
        to: '2026-11-15',
      },
    ],
  },
}))

vi.mock('../api/client', () => ({ resourceApi }))
vi.mock('../hooks/useResource', () => ({
  useResource: (path) => ({
    data: path === '/leaves' ? requestData.leaves : [],
    loading: false,
    reload: vi.fn(),
    error: null,
  }),
}))
vi.mock('../context/auth', () => ({
  useAuth: () => ({ user: { hostelId: 1 } }),
}))
vi.mock('../components/PageHeader', () => ({ default: () => null }))
vi.mock('../components/DataTable', () => ({
  default: ({ columns, dataSource }) => {
    const requestType = columns.find((column) => column.title === 'Request Type')
    const departure = columns.find((column) => column.title === 'Requested Departure')
    const expectedReturn = columns.find((column) => column.title === 'Expected Return')
    return (
      <pre data-testid="request-rows">
        {JSON.stringify(dataSource.map((record) => ({
          type: requestType.render(record.requestType),
          name: record.studentName,
          regNo: record.student.regNo,
          reason: record.reason,
          departure: departure.render(record.requestedDepartureAt, record),
          expectedReturn: expectedReturn.render(record.expectedReturnAt, record),
        })))}
      </pre>
    )
  },
}))
vi.mock('../components/StatusTag', () => ({ default: () => null }))
vi.mock('../components/TableSearchBar', () => ({ default: () => null }))
vi.mock('../hooks/useTableFilter', () => ({
  useTableFilter: (data) => ({ query: '', setQuery: vi.fn(), filtered: data }),
}))
vi.mock('antd', () => {
  const Button = ({ children, onClick }) => (
    <button type="button" onClick={onClick}>{children}</button>
  )
  const Tabs = ({ items, onChange }) => (
    <nav>
      {items.map((item) => (
        <button key={item.key} type="button" onClick={() => onChange(item.key)}>
          {item.label}
        </button>
      ))}
    </nav>
  )
  return {
    Alert: () => null,
    App: { useApp: () => ({ message: { success: vi.fn(), error: vi.fn() } }) },
    Button,
    Card: ({ children }) => <section>{children}</section>,
    Popconfirm: ({ children }) => children,
    Space: ({ children }) => <div>{children}</div>,
    Tabs,
  }
})
vi.mock('@ant-design/icons', () => ({
  CheckOutlined: () => null,
  CloseOutlined: () => null,
  LogoutOutlined: () => null,
  UndoOutlined: () => null,
}))

const { default: WardenLeaves } = await import('../pages/warden/Leaves')

describe('Warden pending Out-Passes', () => {
  it('shows only this hostel’s pending Out-Passes with Student identity and requested times', () => {
    render(<WardenLeaves />)

    fireEvent.click(screen.getByRole('button', { name: 'Pending Out-Passes' }))

    const rows = screen.getByTestId('request-rows').textContent
    expect(rows).toContain('"type":"Out-Pass"')
    expect(rows).toContain('"name":"Aarav Sharma"')
    expect(rows).toContain('"regNo":"231030101"')
    expect(rows).toContain('"reason":"Medical appointment"')
    expect(rows).toContain(dayjs(requestData.leaves[0].requestedDepartureAt).format('YYYY-MM-DD HH:mm'))
    expect(rows).toContain(dayjs(requestData.leaves[0].expectedReturnAt).format('YYYY-MM-DD HH:mm'))
    expect(rows).not.toContain('Regular leave')
    expect(rows).not.toContain('Rejected Student')
  })
})
