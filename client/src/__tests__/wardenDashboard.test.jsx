import { act, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { resourceApi } = vi.hoisted(() => ({
  resourceApi: { get: vi.fn() },
}))

vi.mock('../api/client', () => ({ resourceApi }))
vi.mock('../components/PageHeader', () => ({ default: () => null }))
vi.mock('antd', () => ({
  Alert: ({ message, description }) => <div role="alert">{message} {description}</div>,
  Card: ({ children, title }) => <section>{title}{children}</section>,
  Col: ({ children }) => <div>{children}</div>,
  Progress: () => null,
  Row: ({ children }) => <div>{children}</div>,
  Skeleton: () => <div data-testid="skeleton" />,
  Statistic: ({ title, value }) => <div>{title}: {value}</div>,
}))
vi.mock('@ant-design/icons', () => ({
  TeamOutlined: () => null,
  AppstoreOutlined: () => null,
  BugOutlined: () => null,
  FileDoneOutlined: () => null,
  CalendarOutlined: () => null,
}))
vi.mock('recharts', () => ({
  Bar: () => null,
  BarChart: ({ children }) => <div>{children}</div>,
  CartesianGrid: () => null,
  Cell: () => null,
  Legend: () => null,
  Pie: () => null,
  PieChart: ({ children }) => <div>{children}</div>,
  ResponsiveContainer: ({ children }) => <div>{children}</div>,
  Tooltip: () => null,
  XAxis: () => null,
  YAxis: () => null,
}))

const { default: WardenDashboard } = await import('../pages/warden/WardenDashboard')

const dashboardData = {
  stats: {
    totalStudents: 8,
    totalRooms: 4,
    occupiedRooms: 2,
    pendingAllocations: 1,
    newComplaints: 0,
    pendingLeaves: 0,
    waitlisted: 0,
    occupancy: 50,
    totalComplaints: 0,
  },
  charts: {
    complaintsByStatus: { New: 0 },
    leavesByStatus: {},
    blockOccupancy: [],
  },
}

describe('WardenDashboard refresh lifecycle', () => {
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

  it('refreshes dashboard stats on focus and every 30 seconds', async () => {
    const { unmount } = render(<WardenDashboard />)

    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
    })
    expect(screen.getByText('Students: 8')).toBeInTheDocument()
    expect(resourceApi.get).toHaveBeenCalledTimes(1)

    await act(async () => {
      window.dispatchEvent(new Event('focus'))
      await Promise.resolve()
    })
    expect(resourceApi.get).toHaveBeenCalledTimes(2)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(30000)
    })
    expect(resourceApi.get).toHaveBeenCalledTimes(3)
    expect(screen.queryByTestId('skeleton')).not.toBeInTheDocument()
    unmount()
  })
})
