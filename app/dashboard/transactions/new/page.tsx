'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { ArrowLeft, Home, DollarSign, FileText } from 'lucide-react'

export default function NewTransactionPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    address: '',
    city: '',
    state: 'CA',
    zip: '',
    transaction_type: 'purchase',
    status: 'active',
    purchase_price: '',
    closing_date: '',
    notes: '',
  })

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setError('Not logged in'); setLoading(false); return }

    const property_address = `${form.address}, ${form.city}, ${form.state} ${form.zip}`

    const { data, error: err } = await (supabase as any).from('transactions').insert({
      property_address,
      transaction_type: form.transaction_type,
      status: form.status,
      purchase_price: form.purchase_price ? parseFloat(form.purchase_price) : null,
      closing_date: form.closing_date || null,
      notes: form.notes,
      client_id: user.id,
    }).select().single()

    if (err) { setError(err.message); setLoading(false); return }
    router.push(`/dashboard/transactions/${data.id}`)
  }

  return (
    <div className="p-8 max-w-3xl">
      <div className="flex items-center gap-3 mb-8">
        <Link href="/dashboard/transactions" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft className="w-4 h-4 text-gray-500" />
        </Link>
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">New Transaction</h1>
          <p className="text-gray-500 text-sm mt-0.5">Fill in the property details</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="card p-6">
          <h2 className="font-semibold text-gray-900 mb-5 flex items-center gap-2">
            <Home className="w-4 h-4 text-brand-500" /> Property
          </h2>
          <div className="space-y-4">
            <div>
              <label className="label">Street address *</label>
              <input type="text" className="input" placeholder="123 Main St" value={form.address} onChange={set('address')} required />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-1">
                <label className="label">City *</label>
                <input type="text" className="input" placeholder="Los Angeles" value={form.city} onChange={set('city')} required />
              </div>
              <div>
                <label className="label">State</label>
                <input type="text" className="input" value={form.state} onChange={set('state')} maxLength={2} />
              </div>
              <div>
                <label className="label">ZIP</label>
                <input type="text" className="input" placeholder="90210" value={form.zip} onChange={set('zip')} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Transaction type</label>
                <select className="input" value={form.transaction_type} onChange={set('transaction_type')}>
                  <option value="purchase">Purchase</option>
                  <option value="sale">Sale</option>
                  <option value="refinance">Refinance</option>
                  <option value="lease">Lease</option>
                </select>
              </div>
              <div>
                <label className="label">Status</label>
                <select className="input" value={form.status} onChange={set('status')}>
                  <option value="pending">Pending</option>
                  <option value="contract">Contract</option>
                  <option value="inspection">Inspection</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <h2 className="font-semibold text-gray-900 mb-5 flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-brand-500" /> Financials & Timeline
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Purchase price</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                <input type="number" className="input pl-7" placeholder="500,000" value={form.purchase_price} onChange={set('purchase_price')} />
              </div>
            </div>
            <div>
              <label className="label">Est. close date</label>
              <input type="date" className="input" value={form.closing_date} onChange={set('closing_date')} />
            </div>
          </div>
        </div>

        <div className="card p-6">
          <h2 className="font-semibold text-gray-900 mb-5 flex items-center gap-2">
            <FileText className="w-4 h-4 text-brand-500" /> Notes
          </h2>
          <textarea className="input min-h-[100px] resize-none" placeholder="Any special instructions, contingencies, or notes..." value={form.notes} onChange={set('notes')} />
        </div>

        {error && <div className="text-red-500 text-sm bg-red-50 border border-red-100 rounded-lg px-4 py-3">{error}</div>}

        <div className="flex items-center gap-3 pb-8">
          <button type="submit" className="btn-primary px-8 py-3 text-base" disabled={loading}>
            {loading ? 'Creating...' : 'Create transaction'}
          </button>
          <Link href="/dashboard/transactions" className="btn-secondary px-6 py-3">Cancel</Link>
        </div>
      </form>
    </div>
  )
}
