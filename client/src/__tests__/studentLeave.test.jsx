import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import dayjs from 'dayjs'

const { resourceApi, mockState } = vi.hoisted(() => ({
  resourceApi: { get: vi.fn(), post: vi.fn() },
  mockState: { requestType: 'LEAVE', success: vi.fn(), error: vi.fn() },
}))

vi.mock('../api/client', () => ({ resourceApi }))
vi.mock('../hooks/useResource', () => ({
  useResource: () => ({ data: [], loading: false, reload: vi.fn(), error: null }),
}))
vi.mock('../components/PageHeader', () => ({ default: () => null }))
vi.mock('../components/DataTable', () => ({ default: () => null }))
vi.mock('../components/StatusTag', () => ({ default: () => null }))
vi.mock('../components/TableSearchBar', () => ({ default: () => null }))
vi.mock('../hooks/useTableFilter', () => ({
  useTableFilter: (data) => ({ query: '', setQuery: vi.fn(), filtered: data }),
}))
vi.mock('antd', () => {
  const Form = ({ children, onFinish }) => (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        onFinish({
          outpassTimes: [
            new Date('2026-11-15T14:00:00+05:30'),
            new Date('2026-11-15T20:30:00+05:30'),
          ],
          reason: 'Medical appointment',
          destination: 'Solan',
        })
      }}
    >
      {children}
    </form>
  )
  Form.useForm = () => [{ resetFields: vi.fn() }]
  Form.Item = ({ children, label }) => <label>{label}{children}</label>

  const Button = ({ children, htmlType, onClick, disabled, loading }) => (
    <button
      type={htmlType === 'submit' ? 'submit' : 'button'}
      onClick={onClick}
      disabled={disabled || loading}
    >
      {children}
    </button>
  )
  const Radio = {
    Group: ({ onChange, options }) => (
      <div>
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => {
              mockState.requestType = option.value
              onChange({ target: { value: option.value } })
            }}
          >
            {option.label}
          </button>
        ))}
      </div>
    ),
  }
  const Input = () => <input />
  Input.TextArea = () => <textarea />

  return {
    Alert: ({ message }) => <div role="alert">{message}</div>,
    App: { useApp: () => ({ message: { success: mockState.success, error: mockState.error } }) },
    Button,
    Card: ({ children, title }) => <section>{title}{children}</section>,
    Col: ({ children }) => <div>{children}</div>,
    DatePicker: { RangePicker: () => <div /> },
    Form,
    Input,
    Radio,
    Row: ({ children }) => <div>{children}</div>,
    Statistic: ({ title }) => <div>{title}</div>,
    Tabs: () => null,
  }
})

const { default: StudentLeave } = await import('../pages/student/StudentLeave')

describe('Student Out-Pass submission', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockState.requestType = 'LEAVE'
    resourceApi.get.mockResolvedValue({ leaveTotal: 12 })
    resourceApi.post.mockResolvedValue({ id: 8 })
  })

  it('submits the explicit type and timezone-aware requested date/time fields', async () => {
    render(<StudentLeave />)

    fireEvent.click(screen.getByRole('button', { name: 'Out-Pass' }))
    fireEvent.click(screen.getByRole('button', { name: 'Submit Request' }))

    await waitFor(() => expect(resourceApi.post).toHaveBeenCalled())
    const [path, payload] = resourceApi.post.mock.calls[0]
    expect(path).toBe('/leaves')
    expect(payload).toMatchObject({
      requestType: 'OUTPASS',
      from: '2026-11-15',
      to: '2026-11-15',
      reason: 'Medical appointment',
      destination: 'Solan',
      requestedDepartureAt: dayjs(new Date('2026-11-15T14:00:00+05:30')).format('YYYY-MM-DDTHH:mm:ssZ'),
      expectedReturnAt: dayjs(new Date('2026-11-15T20:30:00+05:30')).format('YYYY-MM-DDTHH:mm:ssZ'),
    })
  })
})
