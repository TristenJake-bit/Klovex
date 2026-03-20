import { createServerClient2 } from '@/lib/supabase-server'
import { formatCurrency, formatDate, cn } from '@/lib/utils'

export default async function BillingPage() {
  const supabase = await createServerClient2()
  const { data: { session } } = await supabase.auth.getSession()
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', session!.user.id).single<{ role: string }>()
  const isAdmin = profile?.role === 'admin'

  const query = supabase
    .from('invoices')
    .select('*, transactions(property_address), profiles(full_name)')
    .order('created_at', { ascending: false })

  if (!isAdmin) query.eq('client_id', session!.user.id)

  const { data: invoicesRaw } = await query
  const invoices = invoicesRaw as any[]

  const total = (invoices || []).reduce((s, i) => s + i.amount_cents, 0)
  const paid = (invoices || []).filter(i => i.status === 'paid').reduce((s, i) => s + i.amount_cents, 0)
  const unpaid = (invoices || []).filter(i => i.status === 'unpaid').reduce((s, i) => s + i.amount_cents, 0)

  return (
    <div className="p-8">
      <h1 className="text-2xl font-medium mb-2">Billing</h1>
      <p className="text-gray-400 text-sm mb-8">All invoices and payment history</p>

      {/* Stats */}
      <div data-tour="billing-stats" className="grid grid-cols-3 gap-4 mb-8">
        <div className="card p-5">
          <div className="text-xs text-gray-400 mb-1">Total invoiced</div>
          <div className="text-2xl font-medium">{formatCurrency(total)}</div>
        </div>
        <div className="card p-5">
          <div className="text-xs text-gray-400 mb-1">Collected</div>
          <div className="text-2xl font-medium text-brand-500">{formatCurrency(paid)}</div>
        </div>
        <div className="card p-5">
          <div className="text-xs text-gray-400 mb-1">Outstanding</div>
          <div className="text-2xl font-medium text-amber-500">{formatCurrency(unpaid)}</div>
        </div>
      </div>

      {/* Invoice table */}
      <div className="card divide-y divide-gray-100">
        <div className="grid grid-cols-5 px-5 py-3 text-xs text-gray-400 font-medium uppercase tracking-wide">
          <div className="col-span-2">Property</div>
          {isAdmin && <div>Client</div>}
          <div>Amount</div>
          <div>Due</div>
          <div>Status</div>
        </div>

        {!invoices?.length ? (
          <div className="px-5 py-10 text-center text-sm text-gray-400">No invoices yet.</div>
        ) : (
          invoices.map((inv: any) => (
            <div key={inv.id} className={`grid px-5 py-3.5 text-sm items-center ${isAdmin ? 'grid-cols-5' : 'grid-cols-4'}`}>
              <div className={isAdmin ? 'col-span-2' : 'col-span-1'}>
                <div className="font-medium text-sm">{inv.transactions?.property_address || '—'}</div>
                <div className="text-xs text-gray-400">Created {formatDate(inv.created_at)}</div>
              </div>
              {isAdmin && <div className="text-gray-600 truncate">{inv.profiles?.full_name}</div>}
              <div className="font-medium">{formatCurrency(inv.amount_cents)}</div>
              <div className="text-gray-500">{inv.due_date ? formatDate(inv.due_date) : '—'}</div>
              <div>
                <span className={cn(
                  'text-xs font-medium px-2.5 py-1 rounded-full',
                  inv.status === 'paid' ? 'bg-green-50 text-green-700' :
                  inv.status === 'unpaid' ? 'bg-amber-50 text-amber-700' :
                  'bg-gray-100 text-gray-500'
                )}>
                  {inv.status}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
