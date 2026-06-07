import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { formatDistanceToNow } from 'date-fns'
import { formatDateOnly, parseDateOnly } from '@/lib/dates'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100)
}

export function formatDate(date: string | Date): string {
  return formatDateOnly(date)
}

export function formatRelative(date: string | Date): string {
  const d = typeof date === 'string' ? parseDateOnly(date) : date
  return formatDistanceToNow(d, { addSuffix: true })
}

export const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  contract: 'Under Contract',
  inspection: 'Inspection',
  appraisal: 'Appraisal',
  loan_approval: 'Loan Approval',
  clear_to_close: 'Clear to Close',
  closing: 'Closing',
  closed: 'Closed',
  cancelled: 'Cancelled',
}

export const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-700',
  contract: 'bg-blue-50 text-blue-700',
  inspection: 'bg-yellow-50 text-yellow-700',
  appraisal: 'bg-orange-50 text-orange-700',
  loan_approval: 'bg-purple-50 text-purple-700',
  clear_to_close: 'bg-brand-50 text-brand-600',
  closing: 'bg-brand-100 text-brand-600',
  closed: 'bg-green-50 text-green-700',
  cancelled: 'bg-red-50 text-red-700',
}

export const TRANSACTION_STEPS = [
  'pending',
  'contract',
  'inspection',
  'appraisal',
  'loan_approval',
  'clear_to_close',
  'closing',
  'closed',
]
