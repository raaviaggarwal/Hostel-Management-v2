export const formatCurrency = (value) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value || 0)

export const formatDate = (value) =>
  value ? String(value).slice(0, 10) : '-'

export const formatDateTime = (value) =>
  value ? String(value).slice(0, 16) : '-'

const escape = (cell) => {
  const value = String(cell ?? '')
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value
}

export function buildCsv(rows, columns) {
  const cols = columns && columns.length ? columns : Object.keys(rows[0] || {})
  const header = (key) => {
    if (!columns) return key
    return cols.find((c) => c.key === key)?.label || key
  }
  const lines = [
    cols.map((c) => header(c.key ?? c)).join(','),
    ...rows.map((row) => cols.map((c) => escape(row[c.key ?? c])).join(',')),
  ]
  return `\uFEFF${lines.join('\n')}`
}

export function downloadCsv(filename, rows, columns) {
  if (!rows.length) return
  const blob = new Blob([buildCsv(rows, columns)], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
