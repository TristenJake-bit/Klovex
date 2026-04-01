'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { STATUS_LABELS, TRANSACTION_STEPS } from '@/lib/utils'
import { ChevronDown } from 'lucide-react'

interface Props {
  transactionId: string
  currentStatus: string
}

export default function StatusUpdater({ transactionId, currentStatus }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [updating, setUpdating] = useState(false)
  const [open, setOpen] = useState(false)

  async function updateStatus(newStatus: string) {
    if (newStatus === currentStatus) return setOpen(false)
    setUpdating(true)
    setOpen(false)

    const { data: { session } } = await supabase.auth.getSession()

    await (supabase as any).from('transactions').update({ status: newStatus }).eq('id', transactionId)
    await (supabase as any).from('timeline_events').insert({
      transaction_id: transactionId,
      author_id: session!.user.id,
      type: 'status_change',
      content: `Status updated to: ${STATUS_LABELS[newStatus]}`,
    })

    // Auto-send closing confirmation email
    if (newStatus === 'closing') {
      fetch('/api/send-template-email', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ template: 'closing_confirmation', transactionId }) }).catch(() => {})
    }

    setUpdating(false)
    router.refresh()
  }

  const allStatuses = [...TRANSACTION_STEPS, 'cancelled']

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="btn-secondary inline-flex items-center gap-2"
        disabled={updating}
      >
        {updating ? 'Updating...' : 'Update status'}
        <ChevronDown size={14} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 bg-white rounded-xl border border-gray-100 shadow-lg z-20 min-w-44 py-1">
            {allStatuses.map(status => (
              <button
                key={status}
                onClick={() => updateStatus(status)}
                className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors ${status === currentStatus ? 'text-brand-500 font-medium' : 'text-gray-700'}`}
              >
                {STATUS_LABELS[status]}
                {status === currentStatus && ' ✓'}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
