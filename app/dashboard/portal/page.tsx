import { createServerClient2 } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle, Clock, FileText, Calendar, Home, AlertTriangle } from 'lucide-react'

const STATUS_STEPS = ['pending', 'contract', 'inspection', 'closed']
const STATUS_LABELS: Record<string,string> = { pending: 'Pending', contract: 'Under Contract', inspection: 'Inspection', closed: 'Closed', cancelled: 'Cancelled' }

function fmt(d: string) { return d ? new Date(d).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '—' }
function fmtMoney(n: number) { return n ? `$${Number(n).toLocaleString()}` : '—' }

export default async function ClientPortalPage() {
  const supabase = await createServerClient2()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/auth/login')

  const { data: profile } = await (supabase as any).from('profiles').select('*').eq('id', session.user.id).single() as any
  if (profile?.role === 'admin') redirect('/dashboard')

  const { data: transactions } = await (supabase as any)
    .from('transactions')
    .select('*')
    .eq('client_id', session.user.id)
    .not('status', 'eq', 'cancelled')
    .order('created_at', { ascending: false })

  if (!transactions || transactions.length === 0) {
    return (
      <div className="p-8 max-w-2xl mx-auto text-center">
        <div className="card p-16">
          <Home className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">No active transactions</h2>
          <p className="text-gray-500 text-sm">Your transaction coordinator will set up your deal here once you have an active contract.</p>
        </div>
      </div>
    )
  }

  const tx = transactions[0]
  const stepIndex = STATUS_STEPS.indexOf(tx.status)

  const { data: documents } = await supabase.from('documents').select('*').eq('transaction_id', tx.id).order('created_at', { ascending: false })
  const { data: timeline } = await (supabase as any).from('timeline_events').select('*').eq('transaction_id', tx.id).order('created_at', { ascending: false }).limit(10)
  const { data: checklist } = await (supabase as any).from('transaction_checklists').select('*').eq('transaction_id', tx.id).order('due_date', { ascending: true })

  const completedTasks = (checklist || []).filter((t: any) => t.completed).length
  const totalTasks = (checklist || []).length
  const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

  const daysToClose = tx.closing_date
    ? Math.ceil((new Date(tx.closing_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="mb-8">
        <p className="text-sm text-gray-400 mb-1">Welcome back, {profile?.full_name?.split(' ')[0]}</p>
        <h1 className="text-2xl font-semibold text-gray-900">{tx.property_address}</h1>
        <p className="text-gray-500 text-sm mt-1 capitalize">{tx.transaction_type} · {STATUS_LABELS[tx.status]}</p>
      </div>

      {/* Progress bar */}
      <div className="card p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900">Transaction Progress</h2>
          <span className="text-sm font-medium text-brand-600">{progress}% complete</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2 mb-6">
          <div className="bg-brand-500 h-2 rounded-full transition-all" style={{ width: `${progress}%` }} />
        </div>
        <div className="flex items-center justify-between">
          {STATUS_STEPS.map((step, i) => (
            <div key={step} className="flex flex-col items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-colors ${
                i < stepIndex ? 'bg-brand-500 text-white' :
                i === stepIndex ? 'bg-brand-500 text-white ring-4 ring-brand-100' :
                'bg-gray-100 text-gray-400'
              }`}>
                {i < stepIndex ? '✓' : i + 1}
              </div>
              <span className={`text-xs font-medium ${i <= stepIndex ? 'text-brand-600' : 'text-gray-400'}`}>
                {STATUS_LABELS[step]}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Key stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="card p-5">
          <p className="text-xs text-gray-400 mb-1">Purchase Price</p>
          <p className="text-xl font-semibold text-gray-900">{fmtMoney(tx.purchase_price)}</p>
        </div>
        <div className="card p-5">
          <p className="text-xs text-gray-400 mb-1">Closing Date</p>
          <p className="text-xl font-semibold text-gray-900">{tx.closing_date ? new Date(tx.closing_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'TBD'}</p>
        </div>
        <div className="card p-5">
          <p className="text-xs text-gray-400 mb-1">Days to Close</p>
          <p className={`text-xl font-semibold ${daysToClose !== null && daysToClose <= 7 ? 'text-red-500' : 'text-gray-900'}`}>
            {daysToClose !== null ? (daysToClose === 0 ? 'Today' : daysToClose < 0 ? 'Closed' : `${daysToClose}d`) : 'TBD'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6 mb-6">
        {/* Documents */}
        <div className="card p-5">
          <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <FileText className="w-4 h-4 text-brand-500" /> Documents
          </h2>
          {!documents || documents.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">No documents yet</p>
          ) : (
            <div className="space-y-2">
              {documents.slice(0, 5).map((doc: any) => (
                <a key={doc.id} href={doc.url} target="_blank" rel="noreferrer"
                  className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded-lg transition-colors group">
                  <FileText className="w-4 h-4 text-brand-500 flex-shrink-0" />
                  <span className="text-sm text-gray-700 truncate group-hover:text-brand-600">{doc.name}</span>
                </a>
              ))}
              {documents.length > 5 && <p className="text-xs text-gray-400 text-center pt-1">+{documents.length - 5} more</p>}
            </div>
          )}
        </div>

        {/* Timeline */}
        <div className="card p-5">
          <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4 text-brand-500" /> Recent Updates
          </h2>
          {!timeline || timeline.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">No updates yet</p>
          ) : (
            <div className="space-y-3">
              {timeline.slice(0, 5).map((event: any) => (
                <div key={event.id} className="flex gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-brand-400 mt-2 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-gray-700">{event.content}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{fmt(event.created_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Checklist summary */}
      {checklist && checklist.length > 0 && (
        <div className="card p-5">
          <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-brand-500" /> Checklist Summary
          </h2>
          <div className="flex items-center gap-4 mb-4">
            <div className="flex-1 bg-gray-100 rounded-full h-1.5">
              <div className="bg-brand-500 h-1.5 rounded-full" style={{ width: `${progress}%` }} />
            </div>
            <span className="text-sm text-gray-500 flex-shrink-0">{completedTasks}/{totalTasks} tasks done</span>
          </div>
          <div className="space-y-1">
            {checklist.filter((t: any) => !t.completed).slice(0, 5).map((task: any) => {
              const isOverdue = new Date(task.due_date) < new Date()
              return (
                <div key={task.id} className="flex items-center gap-2 p-2 rounded-lg">
                  <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isOverdue ? 'bg-red-400' : 'bg-gray-300'}`} />
                  <p className="text-sm text-gray-600 flex-1 truncate">{task.task}</p>
                  {task.due_date && <span className={`text-xs flex-shrink-0 ${isOverdue ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
                    {new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {transactions.length > 1 && (
        <div className="mt-6">
          <p className="text-sm text-gray-400 mb-3">Other transactions</p>
          <div className="space-y-2">
            {transactions.slice(1).map((t: any) => (
              <div key={t.id} className="card px-4 py-3 flex items-center justify-between">
                <p className="text-sm font-medium text-gray-700">{t.property_address}</p>
                <span className="text-xs text-gray-400 capitalize">{STATUS_LABELS[t.status]}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
