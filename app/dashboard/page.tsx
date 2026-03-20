import { createServerClient2 } from "@/lib/supabase-server"
import { formatCurrency, formatDate, STATUS_LABELS, STATUS_COLORS } from '@/lib/utils'
import Link from 'next/link'
import { ArrowRight, Plus, FileText, Clock, AlertTriangle, CheckCircle, Calendar, Phone } from 'lucide-react'
import { cn } from '@/lib/utils'

export default async function DashboardPage() {
  const supabase = await createServerClient2()
  const { data: { session } } = await supabase.auth.getSession()
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', session!.user.id).single<{ role: string; full_name: string; email: string }>()
  const isAdmin = profile?.role === 'admin'

  const txQuery = supabase.from('transactions').select('*, profiles(full_name, email)').order('created_at', { ascending: false })
  if (!isAdmin) txQuery.eq('client_id', session!.user.id)
  const { data: transactionsRaw } = await txQuery
  const transactions = (transactionsRaw as any[]) || []
  const active = transactions.filter(t => !['closed', 'cancelled'].includes(t.status))

  // Fetch overdue + upcoming checklist tasks across all active transactions
  const activeIds = active.map(t => t.id)
  let overdueTasks: any[] = []
  let upcomingTasks: any[] = []
  if (activeIds.length > 0) {
    const today = new Date().toISOString().split('T')[0]
    const in7days = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    const { data: overdueRaw } = await (supabase as any)
      .from('transaction_checklists')
      .select('*, transactions(property_address)')
      .in('transaction_id', activeIds)
      .eq('completed', false)
      .lt('due_date', today)
      .order('due_date', { ascending: true })
      .limit(5)
    overdueTasks = overdueRaw || []

    const { data: upcomingRaw } = await (supabase as any)
      .from('transaction_checklists')
      .select('*, transactions(property_address)')
      .in('transaction_id', activeIds)
      .eq('completed', false)
      .gte('due_date', today)
      .lte('due_date', in7days)
      .order('due_date', { ascending: true })
      .limit(5)
    upcomingTasks = upcomingRaw || []
  }

  // Fetch docs with no analysis (need attention)
  let docsNeedingAnalysis: any[] = []
  if (activeIds.length > 0) {
    const { data: allDocs } = await (supabase as any)
      .from('documents')
      .select('*, transactions(property_address)')
      .in('transaction_id', activeIds)
      .order('created_at', { ascending: false })
    const { data: allAnalyses } = await (supabase as any)
      .from('document_analyses')
      .select('document_id')
    const analyzedIds = new Set((allAnalyses || []).map((a: any) => a.document_id))
    docsNeedingAnalysis = (allDocs || []).filter((d: any) => !analyzedIds.has(d.id)).slice(0, 5)
  }

  // Closing soon (within 14 days)
  const closingSoon = active.filter(t => {
    if (!t.closing_date) return false
    const days = Math.ceil((new Date(t.closing_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    return days >= 0 && days <= 14
  }).sort((a, b) => new Date(a.closing_date).getTime() - new Date(b.closing_date).getTime())

  // Revenue
  let revenueThisMonth = 0, unpaidCount = 0
  if (isAdmin) {
    const startOfMonth = new Date(); startOfMonth.setDate(1); startOfMonth.setHours(0,0,0,0)
    const { data: paid } = await supabase.from('invoices').select('amount_cents').eq('status', 'paid').gte('paid_at', startOfMonth.toISOString()).returns<{ amount_cents: number }[]>()
    revenueThisMonth = (paid || []).reduce((s, i) => s + i.amount_cents, 0)
    const { count } = await supabase.from('invoices').select('*', { count: 'exact', head: true }).eq('status', 'unpaid')
    unpaidCount = count || 0
  }

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <div className="p-8 max-w-6xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-medium">{greeting}, {profile?.full_name?.split(' ')[0]} 👋</h1>
          <p className="text-gray-400 text-sm mt-1">Here's what needs your attention today.</p>
        </div>
        {isAdmin && (
          <Link href="/dashboard/transactions/new" data-tour="new-transaction" className="btn-primary inline-flex items-center gap-2">
            <Plus size={16} /> New transaction
          </Link>
        )}
      </div>

      {/* HIGH VOLUME BANNER */}
      {isAdmin && transactions.filter((t: any) => {
        const thisMonth = new Date(); thisMonth.setDate(1); thisMonth.setHours(0,0,0,0)
        return new Date(t.created_at) >= thisMonth
      }).length >= 6 && (
        <div className="mb-6 bg-brand-50 border border-brand-200 rounded-xl px-5 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Phone className="w-4 h-4 text-brand-600 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-brand-900">You are doing high volume — let's talk</p>
              <p className="text-xs text-brand-600 mt-0.5">You have completed 6+ transactions this month. We offer custom plans with better per-deal pricing for teams and brokerages.</p>
            </div>
          </div>
          <a href="mailto:hello@klovex.app?subject=Custom Plan Inquiry" className="btn-primary text-sm px-4 py-2 flex-shrink-0 whitespace-nowrap">
            Contact us →
          </a>
        </div>
      )}

      {/* STATS */}
      <div data-tour="stats" className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="card p-5">
          <div className="text-xs text-gray-400 mb-1">Active transactions</div>
          <div className="text-2xl font-medium">{active.length}</div>
        </div>
        <div className="card p-5">
          <div className="text-xs text-gray-400 mb-1">Closing within 14 days</div>
          <div className={cn("text-2xl font-medium", closingSoon.length > 0 ? "text-orange-500" : "")}>{closingSoon.length}</div>
        </div>
        <div className="card p-5">
          <div className="text-xs text-gray-400 mb-1">Overdue tasks</div>
          <div className={cn("text-2xl font-medium", overdueTasks.length > 0 ? "text-red-500" : "")}>{overdueTasks.length}</div>
        </div>
        {isAdmin ? (
          <div className="card p-5">
            <div className="text-xs text-gray-400 mb-1">Revenue this month</div>
            <div className="text-2xl font-medium text-brand-500">{formatCurrency(revenueThisMonth)}</div>
          </div>
        ) : (
          <div className="card p-5">
            <div className="text-xs text-gray-400 mb-1">Total transactions</div>
            <div className="text-2xl font-medium">{transactions.length}</div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-6 mb-6">
        {/* OVERDUE TASKS */}
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
                    <p className="text-xs text-gray-400 mt-0.5">{t.transactions?.property_address} · <span className="text-red-500 font-medium">{daysOverdue}d overdue</span></p>
                  </Link>
                )
              })}
            </div>
          )}
        </div>

        {/* DUE THIS WEEK */}
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
                    <p className="text-xs text-gray-400 mt-0.5">{t.transactions?.property_address} · <span className="text-orange-500 font-medium">{daysUntil === 0 ? 'Today' : `${daysUntil}d away`}</span></p>
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* CLOSING SOON */}
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
                    <p className="text-xs text-gray-400 mt-0.5">{formatDate(t.closing_date)} · <span className={cn("font-medium", days <= 3 ? "text-red-500" : "text-orange-500")}>{days === 0 ? 'Closing today' : `${days}d away`}</span></p>
                  </Link>
                )
              })}
            </div>
          )}
        </div>

        {/* RECENT TRANSACTIONS */}
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
