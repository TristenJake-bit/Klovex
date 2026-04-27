import { createServerClient2 } from "@/lib/supabase-server"
import { formatCurrency, formatDate, STATUS_LABELS, STATUS_COLORS } from '@/lib/utils'
import Link from 'next/link'
import { ArrowRight, Plus, FileText, Clock, AlertTriangle, CheckCircle, Calendar, Phone, Zap, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import SeedDemoButton from '@/components/dashboard/SeedDemoButton'

export default async function DashboardPage() {
  const supabase = await createServerClient2()
  const { data: { session } } = await supabase.auth.getSession()
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', session!.user.id).single<any>()
  const isAdmin = profile?.role === 'admin'

  const plan = profile?.plan || 'starter'
  const txUsed = profile?.transactions_used || 0
  const planLimit = plan === 'growth' ? 4 : plan === 'custom' ? 10 : null
  const planLabel = plan === 'starter' ? 'Starter' : plan === 'growth' ? 'Growth' : 'Custom'
  const addonPrice = plan === 'growth' ? 249 : plan === 'custom' ? 199 : 299

  // Admin needs service role to see all transactions (RLS scopes to own data)
  let transactionsRaw: any[] | null = null
  if (isAdmin) {
    const { createClient } = await import('@supabase/supabase-js')
    const adminDb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
    const { data } = await adminDb.from('transactions').select('*, profiles(full_name, email)').order('created_at', { ascending: false })
    transactionsRaw = data
  } else {
    const { data } = await supabase.from('transactions').select('*, profiles(full_name, email)').eq('client_id', session!.user.id).order('created_at', { ascending: false })
    transactionsRaw = data
  }
  const transactions = (transactionsRaw as any[]) || []
  const active = transactions.filter(t => !['closed', 'cancelled'].includes(t.status))

  const activeIds = active.map(t => t.id)
  let overdueTasks: any[] = []
  let upcomingTasks: any[] = []
  if (activeIds.length > 0) {
    const today = new Date().toISOString().split('T')[0]
    const in7days = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const { data: overdueRaw } = await (supabase as any).from('transaction_checklists').select('*, transactions(property_address)').in('transaction_id', activeIds).eq('completed', false).lt('due_date', today).order('due_date', { ascending: true }).limit(5)
    overdueTasks = overdueRaw || []
    const { data: upcomingRaw } = await (supabase as any).from('transaction_checklists').select('*, transactions(property_address)').in('transaction_id', activeIds).eq('completed', false).gte('due_date', today).lte('due_date', in7days).order('due_date', { ascending: true }).limit(5)
    upcomingTasks = upcomingRaw || []
  }

  let docsNeedingAnalysis: any[] = []
  if (activeIds.length > 0) {
    const { data: allDocs } = await (supabase as any).from('documents').select('*, transactions(property_address)').in('transaction_id', activeIds).order('created_at', { ascending: false })
    const { data: allAnalyses } = await (supabase as any).from('document_analyses').select('document_id')
    const analyzedIds = new Set((allAnalyses || []).map((a: any) => a.document_id))
    docsNeedingAnalysis = (allDocs || []).filter((d: any) => !analyzedIds.has(d.id)).slice(0, 5)
  }

  const closingSoon = active.filter(t => {
    if (!t.closing_date) return false
    const days = Math.ceil((new Date(t.closing_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    return days >= 0 && days <= 14
  }).sort((a, b) => new Date(a.closing_date).getTime() - new Date(b.closing_date).getTime())

  let revenueThisMonth = 0
  if (isAdmin) {
    const startOfMonth = new Date(); startOfMonth.setDate(1); startOfMonth.setHours(0,0,0,0)
    const { data: paid } = await supabase.from('invoices').select('amount_cents').eq('status', 'paid').gte('paid_at', startOfMonth.toISOString()).returns<{ amount_cents: number }[]>()
    revenueThisMonth = (paid || []).reduce((s, i) => s + i.amount_cents, 0)
  }

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <div className="p-4 md:p-8 max-w-6xl">
      <div className="flex items-center justify-between mb-6 md:mb-8">
        <div>
          <h1 className="text-lg md:text-2xl font-medium">{greeting}, {profile?.full_name?.split(' ')[0] || 'there'} </h1>
          <p className="text-gray-400 text-sm mt-1">Here is what needs your attention today.</p>
        </div>
        <Link href="/dashboard/transactions/new" data-tour="new-transaction" className="btn-primary inline-flex items-center gap-1.5 text-sm px-3 py-2 md:px-4 md:py-2 md:text-base whitespace-nowrap">
          <Plus size={16} /> New transaction
        </Link>
      </div>

      <div className="mb-6 card p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-brand-50 rounded-xl flex items-center justify-center flex-shrink-0">
            <Zap className="w-4 h-4 text-brand-500" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-900">{planLabel} Plan</span>
              <span className="text-xs bg-brand-100 text-brand-700 px-2 py-0.5 rounded-full font-medium">Active</span>
            </div>
            {planLimit !== null ? (
              <p className="text-xs text-gray-400 mt-0.5">
                {txUsed} of {planLimit} transactions used this month
                {txUsed >= planLimit && <span className="text-orange-500 font-medium ml-1">Add-ons at ${addonPrice} each</span>}
              </p>
            ) : (
              <p className="text-xs text-gray-400 mt-0.5">Unlimited transactions included</p>
            )}
          </div>
        </div>
        {planLimit !== null ? (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              {Array.from({ length: planLimit }).map((_, i) => (
                <div key={i} className={cn("w-5 h-5 md:w-6 md:h-6 rounded-md md:rounded-lg flex items-center justify-center text-xs font-bold border", i < txUsed ? "bg-brand-500 border-brand-500 text-white" : "bg-gray-50 border-gray-200 text-gray-300")}>
                  {i + 1}
                </div>
              ))}
            </div>
            <Link href="/dashboard/plans" className="text-xs text-brand-500 hover:underline whitespace-nowrap">View plans</Link>
          </div>
        ) : (
          <Link href="/dashboard/plans" className="text-xs text-brand-500 hover:underline whitespace-nowrap">View plans</Link>
        )}
      </div>

      {/* Getting Started — shows when user has no transactions */}
      {transactions.length === 0 && (
        <div className="mb-6 card p-6 border-2 border-brand-100 bg-brand-50/30">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Get started in 3 steps</h2>
          <p className="text-sm text-gray-500 mb-5">Klovex handles the paperwork so you can focus on closing deals.</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { step: '1', title: 'Create a transaction', desc: 'Enter the property address, price, and close date.', action: '/dashboard/transactions/new', actionLabel: 'Create transaction', done: false },
              { step: '2', title: 'Upload your first document', desc: 'Upload the purchase agreement — AI reads it instantly.', action: null, actionLabel: null, done: false },
              { step: '3', title: 'Let AI do the rest', desc: 'Checklist auto-generates, deadlines are tracked, and you get reminders.', action: null, actionLabel: null, done: false },
            ].map((item) => (
              <div key={item.step} className="bg-white rounded-xl p-4 border border-gray-200">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-7 h-7 rounded-full bg-brand-500 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">{item.step}</div>
                  <p className="text-sm font-semibold text-gray-900">{item.title}</p>
                </div>
                <p className="text-xs text-gray-500 leading-relaxed ml-10">{item.desc}</p>
                {item.action && (
                  <Link href={item.action} className="mt-3 ml-10 inline-flex items-center gap-1.5 text-xs font-medium text-brand-600 hover:text-brand-700">
                    {item.actionLabel} <ArrowRight size={12} />
                  </Link>
                )}
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-center gap-3 bg-purple-50 rounded-xl p-4 border border-purple-200">
            <Sparkles className="w-4 h-4 text-purple-500 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-800">Or explore with sample data first</p>
              <p className="text-xs text-gray-500 mt-0.5">Load a realistic demo transaction to see how everything works</p>
            </div>
            <SeedDemoButton />
          </div>
        </div>
      )}

      {isAdmin && plan === 'starter' && transactions.filter((t: any) => { const m = new Date(); m.setDate(1); m.setHours(0,0,0,0); return new Date(t.created_at) >= m }).length >= 6 && (
        <div className="mb-6 bg-brand-50 border border-brand-200 rounded-xl px-5 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Phone className="w-4 h-4 text-brand-600 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-brand-900">You are doing high volume - let us talk</p>
              <p className="text-xs text-brand-600 mt-0.5">You have completed 6+ transactions this month. We offer custom plans with better per-deal pricing.</p>
            </div>
          </div>
          <a href="mailto:support@klovex.app?subject=Custom Plan Inquiry" className="btn-primary text-sm px-4 py-2 flex-shrink-0 whitespace-nowrap">Contact us</a>
        </div>
      )}

      <div data-tour="stats" className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6 md:mb-8">
        <div className="card p-4 md:p-5"><div className="text-xs text-gray-400 mb-1">Active transactions</div><div className="text-2xl font-medium">{active.length}</div></div>
        <div className="card p-4 md:p-5"><div className="text-xs text-gray-400 mb-1">Closing within 14 days</div><div className={cn("text-xl md:text-2xl font-medium", closingSoon.length > 0 ? "text-orange-500" : "")}>{closingSoon.length}</div></div>
        <div className="card p-4 md:p-5"><div className="text-xs text-gray-400 mb-1">Overdue tasks</div><div className={cn("text-xl md:text-2xl font-medium", overdueTasks.length > 0 ? "text-red-500" : "")}>{overdueTasks.length}</div></div>
        {isAdmin ? (
          <div className="card p-4 md:p-5"><div className="text-xs text-gray-400 mb-1">Revenue this month</div><div className="text-2xl font-medium text-brand-500">{formatCurrency(revenueThisMonth)}</div></div>
        ) : (
          <div className="card p-4 md:p-5"><div className="text-xs text-gray-400 mb-1">Total transactions</div><div className="text-2xl font-medium">{transactions.length}</div></div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-4 md:mb-6">
        <div className="card">
          <div data-tour="overdue" className="flex items-center gap-2 px-5 py-4 border-b border-gray-100">
            <AlertTriangle size={15} className="text-red-500" />
            <h2 className="font-medium text-sm">Overdue tasks</h2>
            {overdueTasks.length > 0 && <span className="ml-auto text-xs bg-red-100 text-red-600 font-medium px-2 py-0.5 rounded-full">{overdueTasks.length}</span>}
          </div>
          {overdueTasks.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-gray-400"><CheckCircle size={24} className="mx-auto mb-2 text-green-400" />All caught up!</div>
          ) : (
            <div className="divide-y divide-gray-100">
              {overdueTasks.map((t: any) => {
                const daysOverdue = Math.ceil((Date.now() - new Date(t.due_date).getTime()) / (1000 * 60 * 60 * 24))
                return (
                  <Link key={t.id} href={`/dashboard/transactions/${t.transaction_id}`} className="block px-5 py-3 hover:bg-gray-50 transition-colors">
                    <p className="text-sm text-gray-800 font-medium truncate">{t.task}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{t.transactions?.property_address} <span className="text-red-500 font-medium">{daysOverdue}d overdue</span></p>
                  </Link>
                )
              })}
            </div>
          )}
        </div>
        <div className="card">
          <div data-tour="due-this-week" className="flex items-center gap-2 px-5 py-4 border-b border-gray-100">
            <Calendar size={15} className="text-orange-400" />
            <h2 className="font-medium text-sm">Due this week</h2>
            {upcomingTasks.length > 0 && <span className="ml-auto text-xs bg-orange-100 text-orange-600 font-medium px-2 py-0.5 rounded-full">{upcomingTasks.length}</span>}
          </div>
          {upcomingTasks.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-gray-400">Nothing due this week.</div>
          ) : (
            <div className="divide-y divide-gray-100">
              {upcomingTasks.map((t: any) => {
                const daysUntil = Math.ceil((new Date(t.due_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                return (
                  <Link key={t.id} href={`/dashboard/transactions/${t.transaction_id}`} className="block px-5 py-3 hover:bg-gray-50 transition-colors">
                    <p className="text-sm text-gray-800 font-medium truncate">{t.task}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{t.transactions?.property_address} <span className="text-orange-500 font-medium">{daysUntil === 0 ? 'Today' : `${daysUntil}d away`}</span></p>
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        <div className="card">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100">
            <Clock size={15} className="text-brand-500" />
            <h2 className="font-medium text-sm">Closing soon</h2>
          </div>
          {closingSoon.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-gray-400">No closings in the next 14 days.</div>
          ) : (
            <div className="divide-y divide-gray-100">
              {closingSoon.map((t: any) => {
                const days = Math.ceil((new Date(t.closing_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                return (
                  <Link key={t.id} href={`/dashboard/transactions/${t.id}`} className="block px-5 py-3 hover:bg-gray-50 transition-colors">
                    <p className="text-sm text-gray-800 font-medium">{t.property_address}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{formatDate(t.closing_date)} <span className={cn("font-medium", days <= 3 ? "text-red-500" : "text-orange-500")}>{days === 0 ? 'Closing today' : `${days}d away`}</span></p>
                  </Link>
                )
              })}
            </div>
          )}
        </div>
        <div className="card">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2"><FileText size={15} className="text-brand-500" /><h2 className="font-medium text-sm">Recent transactions</h2></div>
            <Link href="/dashboard/transactions" className="text-xs text-brand-500 hover:underline inline-flex items-center gap-1">View all <ArrowRight size={12} /></Link>
          </div>
          {transactions.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-gray-400">No transactions yet.</div>
          ) : (
            <div className="divide-y divide-gray-100">
              {transactions.slice(0,5).map((tx: any) => (
                <Link key={tx.id} href={`/dashboard/transactions/${tx.id}`} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors">
                  <div>
                    <p className="text-sm font-medium text-gray-800 truncate max-w-48">{tx.property_address}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{tx.closing_date ? `Closes ${formatDate(tx.closing_date)}` : 'No closing date'}</p>
                  </div>
                  <span className={cn('text-xs font-medium px-2.5 py-1 rounded-full', STATUS_COLORS[tx.status])}>{STATUS_LABELS[tx.status]}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
