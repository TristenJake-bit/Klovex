import { createServerClient2 } from "@/lib/supabase-server"
import { formatDate, STATUS_LABELS, STATUS_COLORS, formatCurrency, cn } from '@/lib/utils'
import Link from 'next/link'
import { Plus, ArrowRight } from 'lucide-react'

export default async function TransactionsPage() {
  const supabase = await createServerClient2()
  const { data: { session } } = await supabase.auth.getSession()
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', session!.user.id).single<{ role: string; full_name: string; email: string; company: string; phone: string }>()

  const isAdmin = profile?.role === 'admin'

  const query = supabase
    .from('transactions')
    .select('*, profiles(full_name, email, company), invoices(amount_cents, status)')
    .order('created_at', { ascending: false })

  if (!isAdmin) query.eq('client_id', session!.user.id)

  const { data: transactions } = await query

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-medium">Transactions</h1>
          <p className="text-gray-400 text-sm mt-1">{transactions?.length || 0} total</p>
        </div>
        {isAdmin && (
          <Link href="/dashboard/transactions/new" className="btn-primary inline-flex items-center gap-2">
            <Plus size={16} /> New transaction
          </Link>
        )}
      </div>

      <div className="card divide-y divide-gray-100">
        {!transactions?.length ? (
          <div className="px-6 py-16 text-center text-gray-400 text-sm">
            No transactions yet.
          </div>
        ) : (
          transactions.map((tx: any) => {
            const totalInvoiced = (tx.invoices || []).reduce((s: number, i: any) => s + i.amount_cents, 0)
            return (
              <Link
                key={tx.id}
                href={`/dashboard/transactions/${tx.id}`}
                className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{tx.property_address}</div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    {isAdmin && <span className="mr-2">{tx.profiles?.full_name}</span>}
                    {tx.transaction_type} · {tx.closing_date ? `Closes ${formatDate(tx.closing_date)}` : 'No close date'}
                  </div>
                </div>
                <div className="text-sm text-gray-500">{totalInvoiced ? formatCurrency(totalInvoiced) : '—'}</div>
                <span className={cn('text-xs font-medium px-2.5 py-1 rounded-full', STATUS_COLORS[tx.status])}>
                  {STATUS_LABELS[tx.status]}
                </span>
                <ArrowRight size={14} className="text-gray-300 flex-shrink-0" />
              </Link>
            )
          })
        )}
      </div>
    </div>
  )
}
