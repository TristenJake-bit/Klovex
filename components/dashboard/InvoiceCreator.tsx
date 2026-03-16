'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Plus } from 'lucide-react'

interface Props {
  transactionId: string
  clientId: string
}

export default function InvoiceCreator({ transactionId, clientId }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ amount: '', description: '', due_date: '' })
  const [error, setError] = useState('')

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!form.amount) return
    setLoading(true)
    setError('')

    const amountCents = Math.round(parseFloat(form.amount) * 100)

    // Create payment intent via API
    const res = await fetch('/api/stripe/create-payment-intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amountCents, transactionId, clientId }),
    })

    if (!res.ok) {
      setError('Failed to create payment intent')
      setLoading(false)
      return
    }

    const { paymentIntentId } = await res.json()

    await (supabase as any).from('invoices').insert({
      transaction_id: transactionId,
      client_id: clientId,
      amount_cents: amountCents,
      stripe_payment_intent: paymentIntentId,
      due_date: form.due_date || null,
      description: form.description || null,
      status: 'unpaid',
    })

    setLoading(false)
    setOpen(false)
    setForm({ amount: '', description: '', due_date: '' })
    router.refresh()
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-secondary text-xs py-1 px-2.5 inline-flex items-center gap-1">
        <Plus size={11} /> Invoice
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm">
            <h3 className="font-medium mb-4">Create invoice</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="label">Amount ($)</label>
                <input type="number" step="0.01" className="input" placeholder="450.00" value={form.amount} onChange={set('amount')} required />
              </div>
              <div>
                <label className="label">Description <span className="text-gray-400 font-normal">(optional)</span></label>
                <input type="text" className="input" placeholder="Transaction coordination services" value={form.description} onChange={set('description')} />
              </div>
              <div>
                <label className="label">Due date <span className="text-gray-400 font-normal">(optional)</span></label>
                <input type="date" className="input" value={form.due_date} onChange={set('due_date')} />
              </div>
              {error && <p className="text-red-500 text-sm">{error}</p>}
              <div className="flex gap-2 pt-1">
                <button type="submit" className="btn-primary flex-1" disabled={loading}>
                  {loading ? 'Creating...' : 'Create invoice'}
                </button>
                <button type="button" className="btn-secondary" onClick={() => setOpen(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
