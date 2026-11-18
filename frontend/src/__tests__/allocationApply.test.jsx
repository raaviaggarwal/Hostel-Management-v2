import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { resourceApi, message, reloads } = vi.hoisted(() => ({
  resourceApi: { post: vi.fn() },
  message: { success: vi.fn(), error: vi.fn() },
  reloads: { hostels: vi.fn(), students: vi.fn(), allocations: vi.fn() },
}))

vi.mock('antd', () => {
  const Form = ({ children, onFinish }) => (
    <form
      data-testid="apply-form"
      onSubmit={(event) => {
        event.preventDefault()
        onFinish({ hostelPrefs: [2], roomType: 'double' })
      }}
    >
      {children}
    </form>
  )
  Form.useForm = () => [{}]
  Form.Item = ({ children }) => <div>{children}</div>

  const Button = ({ children, onClick, htmlType }) => (
    <button type={htmlType || 'button'} onClick={onClick}>{children}</button>
  )
  const Radio = () => null
  Radio.Group = () => null
  Radio.Button = () => null

  return {
    App: { useApp: () => ({ message }) },
    Alert: ({ message: text }) => <div role="alert">{text}</div>,
    Button,
    Card: ({ children }) => <section>{children}</section>,
    Form,
    Radio,
    Result: ({ title }) => <div>{title}</div>,
    Select: () => null,
    Skeleton: () => <div>Loading</div>,
    Space: ({ children }) => <div>{children}</div>,
    Typography: { Paragraph: ({ children }) => <p>{children}</p> },
  }
})

vi.mock('../hooks/useResource', () => ({
  useResource: (path) => {
    if (path === '/hostels') {
      return { data: [{ id: 2, gender: 'male', type: 'freshers', name: 'North' }], loading: false, error: null, reload: reloads.hostels }
    }
    if (path === '/students') {
      return { data: [{ regNo: 'STU-1', gender: 'male', year: 1 }], loading: false, error: null, reload: reloads.students }
    }
    if (path === '/student/allocation') {
      return { data: [], loading: false, error: null, reload: reloads.allocations }
    }
    throw new Error(`Unexpected resource path: ${path}`)
  },
}))
vi.mock('../api/client', () => ({ resourceApi }))
vi.mock('../context/auth', () => ({ useAuth: () => ({ user: { regNo: 'STU-1' } }) }))
vi.mock('../components/PageHeader', () => ({ default: () => null }))
vi.mock('../components/StatusTag', () => ({ default: ({ status }) => <span>{status}</span> }))
vi.mock('react-router-dom', () => ({ useNavigate: () => vi.fn() }))

const { default: AllocationApply } = await import('../pages/student/AllocationApply')

describe('Student Allocation Apply', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resourceApi.post.mockResolvedValue({ id: 31 })
  })

  it('refreshes the related resources without reporting an error after a successful submit', async () => {
    render(<AllocationApply />)
    fireEvent.submit(screen.getByTestId('apply-form'))

    await waitFor(() => {
      expect(resourceApi.post).toHaveBeenCalledWith('/allocations', {
        hostelPrefs: [2],
        roomType: 'double',
      })
    })
    expect(await screen.findByText('Application submitted')).toBeInTheDocument()
    expect(reloads.students).toHaveBeenCalledOnce()
    expect(reloads.allocations).toHaveBeenCalledOnce()
    expect(message.success).toHaveBeenCalledOnce()
    expect(message.error).not.toHaveBeenCalled()
  })
})
