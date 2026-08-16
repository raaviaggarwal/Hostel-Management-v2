const API_BASE = '/api'

function readToken() {
  return localStorage.getItem('token')
}

export async function apiFetch(path, options = {}) {
  const token = readToken()
  const headers = { ...(options.headers || {}) }
  if (token) headers.Authorization = `Bearer ${token}`
  if (!(options.body instanceof FormData)) headers['Content-Type'] = 'application/json'

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  })

  if (!response.ok) {
    let message = `Request failed (${response.status})`
    try {
      const body = await response.json()
      if (body && body.message) message = body.message
    } catch {
      // ignore non-JSON error bodies
    }
    const error = new Error(message)
    error.status = response.status
    throw error
  }

  return response.json()
}

export const authApi = {
  login: (payload) =>
    apiFetch('/auth/login', { method: 'POST', body: JSON.stringify(payload) }),
  me: () => apiFetch('/auth/me'),
}

export const resourceApi = {
  get: (path) => apiFetch(path),
  getById: (path, id) => apiFetch(`${path}/${id}`),
  post: (path, payload) =>
    apiFetch(path, { method: 'POST', body: JSON.stringify(payload) }),
  create: (path, payload) =>
    apiFetch(path, { method: 'POST', body: JSON.stringify(payload) }),
  patch: (path, id, payload) =>
    apiFetch(`${path}/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  put: (path, payload) =>
    apiFetch(path, { method: 'PUT', body: JSON.stringify(payload) }),
  update: (path, id, payload) =>
    apiFetch(`${path}/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  remove: (path, id) => apiFetch(`${path}/${id}`, { method: 'DELETE' }),
  upload: (path, file) => {
    const form = new FormData()
    form.append('file', file)
    return apiFetch(path, { method: 'POST', body: form })
  },
}
