const timestampFormatter = new Intl.DateTimeFormat('en-GB', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'UTC',
})

const dateFormatter = new Intl.DateTimeFormat('en-GB', {
  dateStyle: 'medium',
  timeZone: 'UTC',
})

export function formatTimestamp(value: string) {
  return timestampFormatter.format(new Date(value))
}

export function formatDate(value: string) {
  return dateFormatter.format(new Date(`${value}T00:00:00Z`))
}

export function formatHour(value: string) {
  return new Date(value).toISOString().slice(11, 16)
}

export function formatMw(value: number | null) {
  return value === null ? null : value.toLocaleString('en-GB', { maximumFractionDigits: 1 })
}

export function formatError(value: number | null) {
  if (value === null) return null
  if (value === 0) return '0'
  const magnitude = Math.abs(value).toLocaleString('en-GB', { maximumFractionDigits: 1 })
  return value > 0 ? `+${magnitude}` : `−${magnitude}`
}

export function formatMetric(value: number | null, signed = false) {
  if (value === null) return 'Unavailable'
  const rounded = Math.round(value * 10) / 10
  const normalized = Object.is(rounded, -0) ? 0 : rounded
  const formatted = Math.abs(normalized).toLocaleString('en-GB', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })
  if (!signed || normalized === 0) return `${formatted} MW`
  return `${normalized > 0 ? '+' : '−'}${formatted} MW`
}
