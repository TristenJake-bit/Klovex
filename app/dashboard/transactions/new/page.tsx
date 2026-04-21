'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { ArrowLeft, Home, DollarSign, FileText, Zap, Info } from 'lucide-react'

const US_STATES = [
  { code: 'AL', name: 'Alabama' }, { code: 'AK', name: 'Alaska' }, { code: 'AZ', name: 'Arizona' }, { code: 'AR', name: 'Arkansas' },
  { code: 'CA', name: 'California' }, { code: 'CO', name: 'Colorado' }, { code: 'CT', name: 'Connecticut' }, { code: 'DE', name: 'Delaware' },
  { code: 'FL', name: 'Florida' }, { code: 'GA', name: 'Georgia' }, { code: 'HI', name: 'Hawaii' }, { code: 'ID', name: 'Idaho' },
  { code: 'IL', name: 'Illinois' }, { code: 'IN', name: 'Indiana' }, { code: 'IA', name: 'Iowa' }, { code: 'KS', name: 'Kansas' },
  { code: 'KY', name: 'Kentucky' }, { code: 'LA', name: 'Louisiana' }, { code: 'ME', name: 'Maine' }, { code: 'MD', name: 'Maryland' },
  { code: 'MA', name: 'Massachusetts' }, { code: 'MI', name: 'Michigan' }, { code: 'MN', name: 'Minnesota' }, { code: 'MS', name: 'Mississippi' },
  { code: 'MO', name: 'Missouri' }, { code: 'MT', name: 'Montana' }, { code: 'NE', name: 'Nebraska' }, { code: 'NV', name: 'Nevada' },
  { code: 'NH', name: 'New Hampshire' }, { code: 'NJ', name: 'New Jersey' }, { code: 'NM', name: 'New Mexico' }, { code: 'NY', name: 'New York' },
  { code: 'NC', name: 'North Carolina' }, { code: 'ND', name: 'North Dakota' }, { code: 'OH', name: 'Ohio' }, { code: 'OK', name: 'Oklahoma' },
  { code: 'OR', name: 'Oregon' }, { code: 'PA', name: 'Pennsylvania' }, { code: 'RI', name: 'Rhode Island' }, { code: 'SC', name: 'South Carolina' },
  { code: 'SD', name: 'South Dakota' }, { code: 'TN', name: 'Tennessee' }, { code: 'TX', name: 'Texas' }, { code: 'UT', name: 'Utah' },
  { code: 'VT', name: 'Vermont' }, { code: 'VA', name: 'Virginia' }, { code: 'WA', name: 'Washington' }, { code: 'WV', name: 'West Virginia' },
  { code: 'WI', name: 'Wisconsin' }, { code: 'WY', name: 'Wyoming' }, { code: 'DC', name: 'Washington D.C.' },
]

const SUPPORTED_STATES = ['CA', 'TX', 'FL']

export default function NewTransactionPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [profile, setProfile] = useState<any>(null)
  const [form, setForm] = useState({
    address: '', city: '', state: 'CA', zip: '',
    transaction_type: 'purchase', status: 'active',
    purchase_price: '', closing_date: '', notes: '',
  })

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        supabase.from('profiles').select('plan, transactions_used, id').eq('id', user.id).single().then(({ data }) => {
          setProfile(data)
        })
      }
    })
  }, [])

  const plan = profile?.plan || 'starter'
  const txUsed = profile?.transactions_used || 0
  const planLimit = plan === 'growth' ? 4 : plan === 'custom' ? 10 : null
  const hasIncluded = planLimit !== null && txUsed < planLimit
  const addonPrice = plan === 'growth' ? 249 : plan === 'custom' ? 199 : 299

  const buttonLabel = loading
    ? (hasIncluded ? 'Creating transaction...' : 'Redirecting to payment...')
    : hasIncluded
      ? 'Create transaction — included (' + (txUsed + 1) + '/' + planLimit + ')'
      : plan === 'starter'
        ? 'Create transaction — $299'
        : 'Create transaction — $' + addonPrice + ' add-on'

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const property_address = form.address + ', ' + form.city + ', ' + form.state + ' ' + form.zip
    const transactionData = {
      property_address,
      transaction_type: form.transaction_type,
      status: form.status,
      purchase_price: form.purchase_price ? parseFloat(form.purchase_price) : null,
      closing_date: form.closing_date || null,
      notes: form.notes,
      state: form.state,
    }

    if (hasIncluded) {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      const { data: tx, error: txError } = await (supabase as any).from('transactions').insert({ ...transactionData, client_id: user?.id }).select().single()
      if (txError || !tx) { setError('Failed to create transaction. Please try again.'); setLoading(false); return }
      await (supabase as any).from('profiles').update({ transactions_used: txUsed + 1 }).eq('id', user?.id)
      // Send welcome email
      fetch('/api/send-template-email', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ template: 'welcome', transactionId: tx.id }) }).catch(() => {})
      router.push('/dashboard/transactions/' + tx.id + '?created=true&used=' + (txUsed + 1) + '&limit=' + planLimit)
      return
    }

    const res = await fetch('/api/stripe/create-checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ propertyAddress: property_address, transactionData }),
    })
    const data = await res.json()
    if (data.url) { window.location.href = data.url } else { setError(data.error || 'Failed to create checkout session'); setLoading(false) }
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

      {profile && (
        <div className="mb-6 flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
          <Zap className="w-4 h-4 text-brand-500 flex-shrink-0" />
          {planLimit !== null ? (
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-700">
                {hasIncluded
                  ? (planLimit - txUsed) + ' transaction' + (planLimit - txUsed !== 1 ? 's' : '') + ' remaining on your ' + plan.charAt(0).toUpperCase() + plan.slice(1) + ' plan'
                  : 'All ' + planLimit + ' included transactions used — this will be billed at $' + addonPrice}
              </p>
              <div className="flex items-center gap-1 mt-2">
                {Array.from({ length: planLimit }).map((_, i) => (
                  <div key={i} className={'h-1.5 flex-1 rounded-full ' + (i < txUsed ? 'bg-brand-500' : 'bg-gray-200')} />
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-1">{txUsed} of {planLimit} used this month</p>
            </div>
          ) : (
            <p className="text-sm text-gray-600">Unlimited transactions on your Starter plan — $299 per transaction</p>
          )}
        </div>
      )}

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
                <label className="label">State *</label>
                <select className="input" value={form.state} onChange={set('state')} required>
                  {US_STATES.map(s => (
                    <option key={s.code} value={s.code}>{s.name}</option>
                  ))}
                </select>
                {!SUPPORTED_STATES.includes(form.state) && (
                  <p className="text-xs text-amber-600 mt-1 flex items-center gap-1"><Info className="w-3 h-3" />Checklist will use general US real estate guidelines</p>
                )}
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
            <DollarSign className="w-4 h-4 text-brand-500" /> Financials and Timeline
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
          <button type="submit" className="btn-primary px-8 py-3 text-base" disabled={loading || !profile}>
            {buttonLabel}
          </button>
          <Link href="/dashboard/transactions" className="btn-secondary px-6 py-3">Cancel</Link>
        </div>
      </form>
    </div>
  )
}
