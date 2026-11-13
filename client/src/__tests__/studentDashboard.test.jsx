import { act, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { resourceApi, useNavigate } = vi.hoisted(() => ({
  resourceApi: { get: vi.fn() },
  useNavigate: vi.fn(() => vi.fn()),
}))

vi.mock('../api/client', () => ({ resourceApi }))
vi.mock('../context/auth', () => ({ useAuth: () => ({ user: { name: 'Nivi Jha' } }) }))
vi.mock('../components/PageHeader', () => ({ default: () => null }))
vi.mock('../components/StatusTag', () => ({ default: ({ status }) => <span>{status}</span> }))
vi.mock('react-router-dom', () => ({ useNavigate }))
vi.mock('antd', () => {
  const Empty = ({ description }) => <div>{description}</div>
  Empty.PRESENTED_IMAGE_SIMPLE = 'simple'

  return {
    Alert: ({ message, description }) => <div role="alert">{message} {description}</div>,
    Card: ({ children, extra, title }) => <section>{title}{extra}{children}</section>,
    Col: ({ children }) => <div>{children}</div>,
    Empty,
    Row: ({ children }) => <div>{children}</div>,
    Skeleton: () => <div data-testid="skeleton" />,
    Statistic: ({ title, value }) => <div>{title}: {value}</div>,
    Tag: ({ children }) => <span>{children}</span>,
    Typography: {
      Link: ({ children }) => <span>{children}</span>,
      Paragraph: ({ children }) => <p>{children}</p>,
      Text: ({ children }) => <span>{children}</span>,
    },
  }
})

const { default: StudentDashboard } = await import('../pages/student/StudentDashboard')

const dashboardData = {
  stats: {
    complaintsOpen: 0,
    leavesPending: 1,
    attendancePresent: 0,
    attendanceAbsent: 0,
    attendancePct: 0,
    leavesLeft: 12,
  },
  student: {},
  allocation: null,
  todayMess: null,
  recentComplaints: [],
  recentRequests: [
    {
      id: 1,
      requestType: 'OUTPASS',
      status: 'pending',
      reason: 'Medical appointment',
      from: '2026-11-15',
      to: '2026-11-15',
      requestedDepartureAt: '2026-11-15T08:30:00.000Z',
    },
  ],
  recentNotices: [],
}

describe('StudentDashboard refresh lifecycle', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible')
    resourceApi.get.mockResolvedValue(dashboardData)
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it('shows a request decision and refreshes it on focus and every five seconds', async () => {
    const approvedData = {
      ...dashboardData,
      recentRequests: dashboardData.recentRequests.map((request) => ({
        ...request,
        status: 'approved',
      })),
    }
    resourceApi.get.mockResolvedValueOnce(dashboardData).mockResolvedValue(approvedData)
    const { unmount } = render(<StudentDashboard />)

    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
    })
    expect(screen.getByText('Pending Leaves: 1')).toBeInTheDocument()
    expect(screen.getByText('pending')).toBeInTheDocument()
    expect(resourceApi.get).toHaveBeenCalledTimes(1)

    await act(async () => {
      window.dispatchEvent(new Event('focus'))
      await Promise.resolve()
    })
    expect(screen.getByText('approved')).toBeInTheDocument()
    expect(resourceApi.get).toHaveBeenCalledTimes(2)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000)
    })
    expect(resourceApi.get).toHaveBeenCalledTimes(3)

    unmount()
  })
})
