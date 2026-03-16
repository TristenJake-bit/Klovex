'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { ArrowLeft, Home, DollarSign, FileText, Clock } from 'lucide-react'

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  contract: 'bg-blue-100 text-blue-700',
  inspection: 'bg-purple-100 text-purple-700',
  closed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
}

export default function TransactionDetailPage() {
  const params = useParams()
  const id = params.id as string
  const [tx, setTx] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [note, setNote] = useState('')
  const [savingNote, setSavingNote] = useState(false)
  const [timeline, setTimeline] = useState<any[]>([])

  useEffect(() => {
    const supabase = createClient()
    supabase.from('transactions').select('*').eq('id', id).single().then(({ data }) => {
      setTx(data); setLoading(false)
    })
    supabase.from('timeline_events').select('*').eq('transaction_id', id).order('created_at', { ascending: false }).then(({ data }) => {
      setTimeline(data || [])
    })
  }, [id])

  async function handleStatusChange(status: string) {
    const supabase = createClient()
    await (supabase as any).from('transactions').update({ status }).eq('id', id)
    setTx((t: any) => ({ ...t, status }))
  }

  async function addNote(e: React.FormEvent) {
    e.preventDefault()
    if (!note.trim()) return
    setSavingNote(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const { data } = await (supabase as any).from('timeline_events').insert({
      transaction_id: id, author_id: user?.id, type: 'note', content: note,
    }).select().single()
    if (data) setTimeline((t) => [data, ...t])
    setNote(''); setSavingNote(false)
  }

  if (loading) return <div className="p-8 text-gray-400">Loading...</div>
  if (!tx) return <div className="p-8 text-gray-400">Transaction not found</div>

  const fmt = (d: string) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'
  const fmtMoney = (n: number) => n ? `$${n.toLocaleString()}` : '—'

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex items-center gap-3 mb-8">
        <Link href="/dashboard/transactions" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft className="w-4 h-4 text-gray-500" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-gray-900">{tx.property_address}</h1>
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full capitalize ${STATUS_COLORS[tx.status] || 'bg-gray-100 text-gray-600'}`}>{tx.status}</span>
          </div>
          <p className="text-gray-500 text-sm mt-0.5 capitalize">{tx.transaction_type} · Created {fmt(tx.created_at)}</p>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="card p-5"><p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-1">Purchase Price</p><p className="text-2xl font-semibold text-gray-900">{fmtMoney(tx.purchase_price)}</p></div>
        <div className="card p-5"><p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-1">Close Date</p><p className="text-2xl font-semibold text-gray-900">{fmt(tx.closing_date)}</p></div>
        <div className="card p-5"><p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-1">Status</p>
          <select className="text-sm font-medium bg-transparent border-0 p-0 text-gray-900 cursor-pointer focus:outline-none w-full" value={tx.status} onChange={e => handleStatusChange(e.target.value)}>
            <option value="pending">Pending</option><option value="contract">Contract</option><option value="inspection">Inspection</option><option value="closed">Closed</option><option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-6">
        <div className="card p-6">
          <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2"><Home className="w-4 h-4 text-brand-500" /> Property Details</h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">Address</span><span className="text-gray-900 font-medium">{tx.property_address}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Type</span><span className="text-gray-900 font-medium capitalize">{tx.transaction_type}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Purchase price</span><span className="text-gray-900 font-medium">{fmtMoney(tx.purchase_price)}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Close date</span><span className="text-gray-900 font-medium">{fmt(tx.closing_date)}</span></div>
          </div>
        </div>
        <div className="card p-6">
          <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2"><Clock className="w-4 h-4 text-brand-500" /> Timeline</h2>
          <form onSubmit={addNote} className="flex gap-2 mb-5">
            <input type="text" className="input text-sm flex-1" placeholder="Add a note..." value={note} onChange={e => setNote(e.target.value)} />
            <button type="submit" className="btn-primary px-4 py-2 text-sm" disabled={savingNote}>Add</button>
          </form>
          <div className="space-y-3">
            {timeline.length === 0 ? <p className="text-sm text-gray-400 text-center py-4">No timeline events yet</p> : timeline.map((event) => (
              <div key={event.id} className="flex gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-brand-400 mt-2 flex-shrink-0" />
                <div><p className="text-sm text-gray-700">{event.content}</p><p className="text-xs text-gray-400 mt-0.5">{fmt(event.created_at)}</p></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
