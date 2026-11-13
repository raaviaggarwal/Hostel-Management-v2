import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { resourceApi } = vi.hoisted(() => ({
  resourceApi: { get: vi.fn() },
}))

vi.mock('../api/client', () => ({ resourceApi }))

const { useResource } = await import('../hooks/useResource')

function Probe({ path, options }) {
  const { data, error, loading, reload } = useResource(path, options)
  return (
    <>
      <span data-testid="data">{data.map((item) => item.id).join(',')}</span>
      <span data-testid="loading">{String(loading)}</span>
      <span data-testid="error">{error?.message || ''}</span>
      <button onClick={reload}>Reload</button>
    </>
  )
}

describe('useResource', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('loads data and shows loading while a reload is pending', async () => {
    let finishReload
    resourceApi.get
      .mockResolvedValueOnce([{ id: 'initial' }])
      .mockImplementationOnce(() => new Promise((resolve) => { finishReload = resolve }))

    render(<Probe path="/students" />)

    await waitFor(() => expect(screen.getByTestId('data')).toHaveTextContent('initial'))
    expect(screen.getByTestId('loading')).toHaveTextContent('false')

    fireEvent.click(screen.getByText('Reload'))
    expect(screen.getByTestId('loading')).toHaveTextContent('true')

    await act(async () => finishReload([{ id: 'reloaded' }]))
    expect(screen.getByTestId('data')).toHaveTextContent('reloaded')
    expect(screen.getByTestId('loading')).toHaveTextContent('false')
  })

  it('ignores a stale response after the resource path changes', async () => {
    const pending = {}
    resourceApi.get.mockImplementation((path) => new Promise((resolve) => {
      pending[path] = resolve
    }))

    const { rerender } = render(<Probe path="/students" />)
    await waitFor(() => expect(pending['/students']).toBeTruthy())

    rerender(<Probe path="/rooms" />)
    await waitFor(() => expect(pending['/rooms']).toBeTruthy())

    await act(async () => pending['/students']([{ id: 'stale' }]))
    expect(screen.getByTestId('data')).toBeEmptyDOMElement()
    expect(screen.getByTestId('loading')).toHaveTextContent('true')

    await act(async () => pending['/rooms']([{ id: 'current' }]))
    expect(screen.getByTestId('data')).toHaveTextContent('current')
    expect(screen.getByTestId('loading')).toHaveTextContent('false')
  })

  it('refreshes on focus and at the configured interval while visible', async () => {
    vi.useFakeTimers()
    const visibility = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible')
    resourceApi.get.mockResolvedValue([{ id: 'refreshed' }])
    let unmount

    try {
      const rendered = render(
        <Probe
          path="/leaves"
          options={{ refreshIntervalMs: 30000, refreshOnFocus: true }}
        />
      )
      unmount = rendered.unmount

      await act(async () => Promise.resolve())
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
    } finally {
      unmount?.()
      visibility.mockRestore()
      vi.useRealTimers()
    }
  })
})
