import { createServerClient2 } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { formatDate } from '@/lib/utils'
import { Users, ArrowRight, FileText } from 'lucide-react'

export default async function ClientsPage() {
  const supabase = await createServerClient2()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/auth/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single() as any
  if (profile?.role !== 'admin') redirect('/dashboard')

  const { data: clients } = await supabase
    .from('profiles')
    .select('*')
    .neq('role', 'admin')
    .order('created_at', { ascending: false }) as any

  const { data: transactions } = await supabase
    .from('transactions')
    .select('*')
    .order('created_at', { ascending: false }) as any

  const txByClient = (transactions || []).reduce((acc: any, tx: any) => {
    if (!acc[tx.client_id]) acc[tx.client_id] = []
    acc[tx.client_id].push(tx)
    return acc
  }, {})

  return (
    <div className="p-8 max-w-5xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Clients</h1>
          <p className="text-gray-400 text-sm mt-1">{(clients || []).length} total clients</p>
        </div>
      </div>

      {!clients || clients.length === 0 ? (
        <div className="card p-16 text-center">
          <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 font-medium">No clients yet</p>
          <p className="text-gray-400 text-sm mt-1">Clients will appear here when they sign up and create transactions</p>
        </div>
      ) : (
        <div className="card divide-y divide-gray-100">
          {clients.map((client: any) => {
            const clientTxs = txByClient[client.id] || []
            const activeTxs = clientTxs.filter((t: any) => !['closed', 'cancelled'].includes(t.status))
            return (
              <div key={client.id} className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center text-brand-600 font-semibold text-sm flex-shrink-0">
                    {client.full_name?.charAt(0) || client.email?.charAt(0) || '?'}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 text-sm">{client.full_name || '—'}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{client.email} · Joined {formatDate(client.created_at)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-center">
                    <p className="text-sm font-semibold text-gray-900">{clientTxs.length}</p>
                    <p className="text-xs text-gray-400">total</p>
                  </div>
                  <div className="text-center">
                    <p className={`text-sm font-semibold ${activeTxs.length > 0 ? 'text-brand-600' : 'text-gray-400'}`}>{activeTxs.length}</p>
                    <p className="text-xs text-gray-400">active</p>
                  </div>
                  {clientTxs.length > 0 && (
                    <Link href={`/dashboard/transactions?client=${client.id}`} className="flex items-center gap-1.5 text-xs text-brand-600 hover:underline">
                      <FileText className="w-3.5 h-3.5" /> View deals
                    </Link>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
