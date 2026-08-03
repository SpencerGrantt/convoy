import { format, parseISO, differenceInDays, isToday, isValid } from 'date-fns'

// date-fns' format()/differenceInDays()/isToday() throw a hard RangeError on
// an invalid Date instead of degrading gracefully. Any date sourced from an
// external API (SAM.gov) or free-form DB input is not guaranteed parseable —
// one bad value here used to blank the entire app (no ErrorBoundary caught
// it). Always go through these guards instead of calling date-fns directly
// on unverified input.

function toDate(value) {
  if (!value) return null
  const d = value instanceof Date ? value : parseISO(value)
  return isValid(d) ? d : null
}

export function safeFormatDate(value, fmt, fallback = '—') {
  const d = toDate(value)
  return d ? format(d, fmt) : fallback
}

export function safeDifferenceInDays(value, base = new Date()) {
  const d = toDate(value)
  return d ? differenceInDays(d, base) : null
}

export function safeIsToday(value) {
  const d = toDate(value)
  return d ? isToday(d) : false
}
