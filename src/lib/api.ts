const BASE = ''

export async function apiFetch(url: string, options?: RequestInit) {
  const res = await fetch(`${BASE}${url}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options
  })
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Request failed' }))
    throw new Error(error.error || 'Request failed')
  }
  return res.json()
}

export const auth = {
  login: (email: string, password: string) =>
    apiFetch('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  logout: () =>
    apiFetch('/api/auth/logout', { method: 'POST' }),
  me: () =>
    apiFetch('/api/auth/me'),
}

export const students = {
  list: (params?: Record<string, string>) =>
    apiFetch(`/api/students?${new URLSearchParams(params || {})}`),
  get: (id: string) =>
    apiFetch(`/api/students/${id}`),
  create: (data: any) =>
    apiFetch('/api/students', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: any) =>
    apiFetch(`/api/students/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) =>
    apiFetch(`/api/students/${id}`, { method: 'DELETE' }),
  ledger: (id: string) =>
    apiFetch(`/api/students/${id}/ledger`),
  balance: (id: string) =>
    apiFetch(`/api/students/${id}/balance`),
}

export const billings = {
  list: (params?: Record<string, string>) =>
    apiFetch(`/api/billings?${new URLSearchParams(params || {})}`),
  get: (id: string) =>
    apiFetch(`/api/billings/${id}`),
  create: (data: any) =>
    apiFetch('/api/billings', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: any) =>
    apiFetch(`/api/billings/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) =>
    apiFetch(`/api/billings/${id}`, { method: 'DELETE' }),
  toggle: (id: string) =>
    apiFetch(`/api/billings/${id}/toggle`, { method: 'PATCH' }),
  assign: (data: any) =>
    apiFetch('/api/billings/assign', { method: 'POST', body: JSON.stringify(data) }),
  assignments: (id: string) =>
    apiFetch(`/api/billings/${id}/assignments`),
}

export const feeCategories = {
  list: () =>
    apiFetch('/api/fee-categories'),
  create: (data: any) =>
    apiFetch('/api/fee-categories', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: any) =>
    apiFetch(`/api/fee-categories/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) =>
    apiFetch(`/api/fee-categories/${id}`, { method: 'DELETE' }),
}

export const receipts = {
  list: (params?: Record<string, string>) =>
    apiFetch(`/api/receipts?${new URLSearchParams(params || {})}`),
  get: (id: string) =>
    apiFetch(`/api/receipts/${id}`),
  upload: (data: any) =>
    apiFetch('/api/receipts', { method: 'POST', body: JSON.stringify(data) }),
  review: (id: string, data: any) =>
    apiFetch(`/api/receipts/${id}/review`, { method: 'PATCH', body: JSON.stringify(data) }),
}

export const payments = {
  list: (params?: Record<string, string>) =>
    apiFetch(`/api/payments?${new URLSearchParams(params || {})}`),
}

export const reportsApi = {
  summary: () =>
    apiFetch('/api/reports/summary'),
  unpaid: (params?: Record<string, string>) =>
    apiFetch(`/api/reports/unpaid-students?${new URLSearchParams(params || {})}`),
  export: (params?: Record<string, string>) =>
    fetch(`/api/reports/export?${new URLSearchParams(params || {})}`, { credentials: 'include' }),
}

export const notifications = {
  list: (params?: Record<string, string>) =>
    apiFetch(`/api/notifications?${new URLSearchParams(params || {})}`),
  markRead: (id: string) =>
    apiFetch(`/api/notifications/${id}/read`, { method: 'PATCH' }),
  markAllRead: () =>
    apiFetch('/api/notifications/read-all', { method: 'PATCH' }),
}

export const settings = {
  get: () =>
    apiFetch('/api/settings'),
  update: (data: any) =>
    apiFetch('/api/settings', { method: 'PUT', body: JSON.stringify(data) }),
}

export const academicYears = {
  list: () =>
    apiFetch('/api/academic-years'),
  create: (data: any) =>
    apiFetch('/api/academic-years', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: any) =>
    apiFetch(`/api/academic-years/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id: string) =>
    apiFetch(`/api/academic-years/${id}`, { method: 'DELETE' }),
}

export const auditLogs = {
  list: (params?: Record<string, string>) =>
    apiFetch(`/api/audit-logs?${new URLSearchParams(params || {})}`),
}

export const dashboard = {
  stats: () =>
    apiFetch('/api/dashboard/stats'),
}
