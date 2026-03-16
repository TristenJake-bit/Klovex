import { createServerClient2 } from "@/lib/supabase-server"
import { formatCurrency, formatDate, STATUS_LABELS, STATUS_COLORS } from '@/lib/utils'
import Link from 'next/link'
import { ArrowRight, Plus, TrendingUp, FileText, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

export default async function DashboardPage() {
  const supabase = await createServerClient2()
  const { data: { session } } = await supabase.auth.getSession()
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', session!.user.id).single<{ role: string; full_name: string; email: string }>()

  const isAdmin = profile?.role === 'admin'

  // Fetch transactions
  const txQuery = supabase
    .from('transactions')
    .select('*, profiles(full_name, email, company)')
    .order('created_at', { ascending: false })
    .limit(5)

  if (!isAdmin) txQuery.eq('client_id', session!.user.id)

  const { data: transactionsRaw } = await txQuery
  const transactions = transactionsRaw as any[]

  // Fetch invoice stats (admin only)
  let revenueThisMonth = 0
  let unpaidCount = 0
  if (isAdmin) {
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    const { data: paidInvoices } = await supabase
      .from('invoices')
      .select('amount_cents')
      .eq('status', 'paid')
      .gte('paid_at', startOfMonth.toISOString()).returns<{ amount_cents: number }[]>()

    revenueThisMonth = (paidInvoices || []).reduce((sum, i) => sum + i.amount_cents, 0)

    const { count } = await supabase
      .from('invoices')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'unpaid')

    unpaidCount = count || 0
  }

  const activeCount = (transactions || []).filter(t => !['closed', 'cancelled'].includes(t.status)).length

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-medium">
            Good morning, {profile?.full_name?.split(' ')[0]} 👋
          </h1>
          <p className="text-gray-400 text-sm mt-1">Here's what's happening with your transactions.</p>
        </div>
        {isAdmin && (
          <Link href="/dashboard/transactions/new" className="btn-primary inline-flex items-center gap-2">
            <Plus size={16} /> New transaction
          </Link>
        )}
      </div>

      {/* STATS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="card p-5">
          <div className="text-xs text-gray-400 mb-1">Active transactions</div>
          <div className="text-2xl font-medium">{activeCount}</div>
        </div>
        {isAdmin && (
          <>
            <div className="card p-5">
              <div className="text-xs text-gray-400 mb-1">Revenue this month</div>
              <div className="text-2xl font-medium text-brand-500">{formatCurrency(revenueThisMonth)}</div>
            </div>
            <div className="card p-5">
              <div className="text-xs text-gray-400 mb-1">Unpaid invoices</div>
              <div className="text-2xl font-medium">{unpaidCount}</div>
            </div>
            <div className="card p-5">
              <div className="text-xs text-gray-400 mb-1">Total transactions</div>
              <div className="text-2xl font-medium">{transactions?.length || 0}</div>
            </div>
          </>
        )}
        {!isAdmin && (
          <div className="card p-5">
            <div className="text-xs text-gray-400 mb-1">Total transactions</div>
            <div className="text-2xl font-medium">{transactions?.length || 0}</div>
          </div>
        )}
      </div>

      {/* RECENT TRANSACTIONS */}
      <div className="card">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-medium">Recent transactions</h2>
          <Link href="/dashboard/transactions" className="text-sm text-brand-500 hover:underline inline-flex items-center gap-1">
            View all <ArrowRight size={13} />
          </Link>
        </div>

        {!transactions?.length ? (
          <div className="px-6 py-12 text-center text-gray-400 text-sm">
            {isAdmin ? (
              <>
                <FileText size={32} className="mx-auto mb-3 opacity-30" />
                <p>No transactions yet.</p>
                <Link href="/dashboard/transactions/new" className="text-brand-500 hover:underline mt-1 inline-block">
                  Create your first one
                </Link>
              </>
            ) : (
              <>
                <Clock size={32} className="mx-auto mb-3 opacity-30" />
                <p>No transactions yet. Your TC will create one when you have an active deal.</p>
              </>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {transactions.map((tx: any) => (
              <Link
                key={tx.id}
                href={`/dashboard/transactions/${tx.id}`}
                className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors"
              >
                <div>
                  <div className="font-medium text-sm">{tx.property_address}</div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    {isAdmin ? tx.profiles?.full_name : ''}{tx.closing_date ? ` · Closes ${formatDate(tx.closing_date)}` : ''}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={cn('text-xs font-medium px-2.5 py-1 rounded-full', STATUS_COLORS[tx.status])}>
                    {STATUS_LABELS[tx.status]}
                  </span>
                  <ArrowRight size={14} className="text-gray-300" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
