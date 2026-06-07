/**
 * Timezone-safe date utilities for calendar dates (YYYY-MM-DD).
 *
 * The problem: `new Date("2025-06-10")` parses as UTC midnight.
 * In US timezones (negative UTC offset), calling `.toLocaleDateString()`
 * or `.toISOString()` on a Date constructed with `.setDate()` can roll
 * the day backward by one — the classic off-by-one date bug.
 *
 * These helpers treat date strings as timezone-agnostic calendar dates.
 */

/**
 * Parse a YYYY-MM-DD (or any date string) into a local-midnight Date.
 * This ensures .getDate(), .getMonth(), .getFullYear() return the
 * calendar day the user intended, regardless of timezone.
 */
export function parseDateOnly(dateStr: string): Date {
  // For YYYY-MM-DD strings, split and construct with local components
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (match) {
    return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
  }
  // For ISO timestamps or other formats, still normalize to local midnight
  const d = new Date(dateStr)
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

/**
 * Format a date string as a YYYY-MM-DD string, timezone-safe.
 * Use this instead of `.toISOString().split('T')[0]`.
 */
export function toDateString(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/**
 * Format a date string for display: "Jun 10, 2025" (default).
 * Accepts YYYY-MM-DD strings or Date objects.
 * Uses local date components — never shifts the day.
 */
export function formatDateOnly(
  dateStr: string | Date,
  options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' }
): string {
  if (!dateStr) return '—'
  const d = typeof dateStr === 'string' ? parseDateOnly(dateStr) : dateStr
  return d.toLocaleDateString('en-US', options)
}

/**
 * Add days to a YYYY-MM-DD date string, returning a new YYYY-MM-DD string.
 * Timezone-safe: uses local date components throughout.
 */
export function addDaysToDate(dateStr: string | Date, days: number): string {
  const d = typeof dateStr === 'string' ? parseDateOnly(dateStr) : new Date(dateStr.getFullYear(), dateStr.getMonth(), dateStr.getDate())
  d.setDate(d.getDate() + days)
  return toDateString(d)
}

/**
 * Get the number of calendar days between a date string and today.
 * Positive = future, negative = past.
 */
export function daysFromToday(dateStr: string): number {
  const d = parseDateOnly(dateStr)
  const today = new Date()
  const todayLocal = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  return Math.ceil((d.getTime() - todayLocal.getTime()) / (1000 * 60 * 60 * 24))
}

/**
 * Get today's date as a YYYY-MM-DD string in local time.
 */
export function todayDateString(): string {
  return toDateString(new Date())
}
