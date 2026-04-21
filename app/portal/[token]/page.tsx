'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Home, CheckCircle, Calendar, Clock, User, Building2, AlertTriangle, Loader2 } from 'lucide-react'

const STATUS_LABELS: Record<string, string> = { pending: 'Pending', contract: 'Under Contract', inspection: 'Inspection', loan: 'Loan & Appraisal', closing: 'Closing', closed: 'Closed', cancelled: 'Cancelled' }
const STATUS_COLORS: Record<string, string> = { pending: 'bg-yellow-100 text-yellow-700', contract: 'bg-blue-100 text-blue-700', inspection: 'bg-purple-100 text-purple-700', loan: 'bg-indigo-100 text-indigo-700', closing: 'bg-teal-100 text-teal-700', closed: 'bg-green-100 text-green-700', cancelled: 'bg-red-100 text-red-700' }

export default function PortalPage() {
  const params = useParams()
  const token = params.token as string
  const [data, setData] = useState<any>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/portal/view?token=${token}`)
      .then(res => res.json())
      .then(d => {
        if (d.error) setError(d.error)
        else setData(d)
        setLoading(false)
      })
      .catch(() => { setError('Failed to load portal'); setLoading(false) })
  }, [token])

  const fmt = (d: string) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'
  const fmtMoney = (n: number) => n ? `$${n.toLocaleString()}` : '—'

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-8 h-8 text-brand-500 animate-spin mx-auto mb-3" />
        <p className="text-gray-500 text-sm">Loading transaction portal...</p>
      </div>
    </div>
  )

  if (error) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <AlertTriangle className="w-10 h-10 text-orange-400 mx-auto mb-4" />
        <h1 className="text-xl font-semibold text-gray-900 mb-2">{error}</h1>
        <p className="text-gray-500 text-sm">This link may have expired or been revoked. Contact your agent for an updated link.</p>
      </div>
    </div>
  )

  const tx = data.transaction
  const { progress, upcomingDeadlines, contacts, timeline } = data

  const closingDays = tx.closing_date ? Math.ceil((new Date(tx.closing_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 py-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-serif text-lg">Klovex<span className="text-brand-500">.</span></span>
                <span className="text-xs text-gray-400">Transaction Portal</span>
              </div>
              <h1 className="text-xl font-semibold text-gray-900">{tx.property_address}</h1>
              <p className="text-sm text-gray-500 capitalize mt-0.5">{tx.transaction_type} · {tx.state || 'CA'}</p>
            </div>
            <span className={`text-xs font-medium px-3 py-1.5 rounded-full ${STATUS_COLORS[tx.status] || 'bg-gray-100 text-gray-600'}`}>
              {STATUS_LABELS[tx.status] || tx.status}
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {/* Progress + Key Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="card p-5 md:col-span-2">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-900">Transaction Progress</h2>
              <span className="text-2xl font-bold text-brand-500">{progress.percent}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
              <div className={`h-3 rounded-full transition-all ${progress.percent === 100 ? 'bg-green-500' : 'bg-brand-500'}`} style={{ width: `${progress.percent}%` }} />
            </div>
            <p className="text-xs text-gray-500">{progress.completed} of {progress.total} tasks completed</p>
          </div>
          <div className="card p-5">
            <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-1">Closing Date</p>
            <p className="text-lg font-semibold text-gray-900">{fmt(tx.closing_date)}</p>
            {closingDays !== null && (
              <p className={`text-xs font-medium mt-1 ${closingDays <= 0 ? 'text-green-600' : closingDays <= 7 ? 'text-red-500' : closingDays <= 14 ? 'text-orange-500' : 'text-gray-400'}`}>
                {closingDays <= 0 ? 'Closing day!' : `${closingDays} days remaining`}
              </p>
            )}
          </div>
        </div>

        {/* Upcoming Deadlines */}
        {upcomingDeadlines.length > 0 && (
          <div className="card p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-brand-500" /> Upcoming Deadlines
            </h2>
            <div className="space-y-2">
              {upcomingDeadlines.map((d: any, i: number) => {
                const urgencyColor = d.daysUntil <= 0 ? 'bg-red-50 border-red-200 text-red-800' : d.daysUntil <= 3 ? 'bg-orange-50 border-orange-200 text-orange-800' : d.daysUntil <= 7 ? 'bg-yellow-50 border-yellow-200 text-yellow-800' : 'bg-green-50 border-green-200 text-green-800'
                const urgencyLabel = d.daysUntil <= 0 ? (d.daysUntil === 0 ? 'Due today' : `${Math.abs(d.daysUntil)}d overdue`) : `${d.daysUntil}d left`
                return (
                  <div key={i} className={`flex items-center justify-between p-3 rounded-lg border ${urgencyColor}`}>
                    <div>
                      <p className="text-sm font-medium">{d.task}</p>
                      <p className="text-xs opacity-75 mt-0.5">{d.phase}</p>
                    </div>
                    <div className="text-right flex-shrink-0 ml-4">
                      <p className="text-xs font-semibold">{fmt(d.dueDate)}</p>
                      <p className="text-xs font-medium opacity-75">{urgencyLabel}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Transaction Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="card p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Home className="w-4 h-4 text-brand-500" /> Transaction Details
            </h2>
            <div className="space-y-2.5 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Property</span><span className="text-gray-900 font-medium text-right max-w-48 truncate">{tx.property_address}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Type</span><span className="text-gray-900 font-medium capitalize">{tx.transaction_type}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Purchase Price</span><span className="text-gray-900 font-medium">{fmtMoney(tx.purchase_price)}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Status</span><span className="text-gray-900 font-medium">{STATUS_LABELS[tx.status] || tx.status}</span></div>
            </div>
          </div>

          {/* Contacts */}
          {contacts.length > 0 && (
            <div className="card p-5">
              <h2 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <User className="w-4 h-4 text-brand-500" /> Transaction Parties
              </h2>
              <div className="space-y-2.5">
                {contacts.map((c: any, i: number) => (
                  <div key={i} className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-brand-50 flex items-center justify-center flex-shrink-0">
                      <User className="w-3.5 h-3.5 text-brand-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{c.name}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-brand-600">{c.role}</span>
                        {c.company && <span className="text-xs text-gray-400 flex items-center gap-0.5"><Building2 className="w-3 h-3" />{c.company}</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Recent Activity */}
        {timeline.length > 0 && (
          <div className="card p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Clock className="w-4 h-4 text-brand-500" /> Recent Activity
            </h2>
            <div className="space-y-3">
              {timeline.map((event: any, i: number) => (
                <div key={i} className="flex gap-3">
                  <div className={`w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0 ${event.type === 'ai_analysis' ? 'bg-purple-400' : event.type === 'email' ? 'bg-blue-400' : event.type === 'status_change' ? 'bg-green-400' : 'bg-gray-400'}`} />
                  <div>
                    <p className="text-sm text-gray-700">{event.content}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{fmt(event.created_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center py-4">
          <p className="text-xs text-gray-400">Powered by <span className="font-serif">Klovex</span> · AI Transaction Coordination</p>
          <p className="text-xs text-gray-300 mt-1">This portal link expires {fmt(data.expiresAt)}</p>
        </div>
      </div>
    </div>
  )
}
