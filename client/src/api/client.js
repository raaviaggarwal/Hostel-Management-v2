const API_BASE = '/api'

function readToken() {
  return localStorage.getItem('token')
}

export async function apiFetch(path, options = {}) {
  const token = readToken()

  const headers = {
    ...(options.headers || {}),
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json'
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  })

  if (!response.ok) {
    let message = `Request failed (${response.status})`

    try {
      const body = await response.json()

      if (body && body.message) {
        message = body.message
      }
    } catch {
      // Ignore non-JSON error responses
    }

    const error = new Error(message)
    error.status = response.status

    throw error
  }

  // Safely handle empty responses such as DELETE requests
  if (response.status === 204) {
    return null
  }

  const contentType = response.headers.get('content-type')

  if (contentType && contentType.includes('application/json')) {
    return response.json()
  }

  return null
}

export const authApi = {
  login: (payload) =>
    apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  me: () => apiFetch('/auth/me'),

  logout: () =>
    apiFetch('/auth/logout', {
      method: 'POST',
    }),
}

export const resourceApi = {
  get: (path) => apiFetch(path),

  getById: (path, id) =>
    apiFetch(`${path}/${id}`),

  post: (path, payload) =>
    apiFetch(path, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  create: (path, payload) =>
    apiFetch(path, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  patch: (path, id, payload) =>
    apiFetch(`${path}/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  put: (path, payload) =>
    apiFetch(path, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  // UPDATE WITH COMPLETE PATH
  update: (path, payload) =>
    apiFetch(path, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  remove: (path, id) =>
    apiFetch(`${path}/${id}`, {
      method: 'DELETE',
    }),
}