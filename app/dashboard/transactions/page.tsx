import { createServerClient2 } from "@/lib/supabase-server"
import { formatDate, STATUS_LABELS, STATUS_COLORS, formatCurrency, cn } from '@/lib/utils'
import Link from 'next/link'
import { Plus, ArrowRight } from 'lucide-react'

export default async function TransactionsPage() {
  const supabase = await createServerClient2()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user!.id).single<any>()
  const isAdmin = profile?.role === 'admin'
  const query = supabase.from('transactions').select('*, profiles(full_name, email, company), invoices(amount_cents, status)').order('created_at', { ascending: false })
  if (!isAdmin) query.eq('client_id', user!.id)
  const { data: transactions } = await query

  return (
    <div className="p-4 md:p-8">
      <div className="flex items-center justify-between mb-6 md:mb-8">
        <div>
          <h1 className="text-xl md:text-2xl font-medium">Transactions</h1>
          <p className="text-gray-400 text-sm mt-1">{transactions?.length || 0} total</p>
        </div>
        {isAdmin && (
          <Link href="/dashboard/transactions/new" className="btn-primary inline-flex items-center gap-2 text-sm px-3 py-2 md:px-4 md:py-2">
            <Plus size={16} /><span className="hidden sm:inline">New transaction</span><span className="sm:hidden">New</span>
          </Link>
        )}
      </div>
      <div className="md:hidden space-y-3">
        {!transactions?.length ? (
          <div className="card px-6 py-16 text-center text-gray-400 text-sm">No transactions yet.</div>
        ) : transactions.map((tx: any) => {
          const totalInvoiced = (tx.invoices || []).reduce((s: number, i: any) => s + i.amount_cents, 0)
          return (
            <Link key={tx.id} href={'/dashboard/transactions/' + tx.id} className="card block px-4 py-4 active:bg-gray-50 transition-colors">
              <div className="flex items-start justify-between gap-2 mb-2">
                <p className="font-medium text-sm text-gray-900 leading-snug">{tx.property_address}</p>
                <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0', STATUS_COLORS[tx.status])}>{STATUS_LABELS[tx.status]}</span>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-400">{tx.closing_date ? 'Closes ' + formatDate(tx.closing_date) : 'No close date'}</p>
                {totalInvoiced ? <p className="text-xs font-medium text-gray-600">{formatCurrency(totalInvoiced)}</p> : null}
              </div>
            </Link>
          )
        })}
      </div>
      <div data-tour="transaction-list" className="hidden md:block card divide-y divide-gray-100">
        {!transactions?.length ? (
          <div className="px-6 py-16 text-center text-gray-400 text-sm">No transactions yet.</div>
        ) : transactions.map((tx: any) => {
          const totalInvoiced = (tx.invoices || []).reduce((s: number, i: any) => s + i.amount_cents, 0)
          return (
            <Link key={tx.id} href={'/dashboard/transactions/' + tx.id} className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors">
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate">{tx.property_address}</div>
                <div className="text-xs text-gray-400 mt-0.5">{isAdmin && <span className="mr-2">{tx.profiles?.full_name}</span>}{tx.transaction_type} · {tx.closing_date ? 'Closes ' + formatDate(tx.closing_date) : 'No close date'}</div>
              </div>
              <div className="text-sm text-gray-500">{totalInvoiced ? formatCurrency(totalInvoiced) : '-'}</div>
              <span className={cn('text-xs font-medium px-2.5 py-1 rounded-full', STATUS_COLORS[tx.status])}>{STATUS_LABELS[tx.status]}</span>
              <ArrowRight size={14} className="text-gray-300 flex-shrink-0" />
            </Link>
          )
        })}
      </div>
    </div>
  )
}
