import { createServerClient2 } from "@/lib/supabase-server"
import { createClient } from "@supabase/supabase-js"
import { redirect } from "next/navigation"
import { Shield, Users } from "lucide-react"
import AdminUserTable from "@/components/dashboard/AdminUserTable"

export default async function AdminPage() {
  const supabase = await createServerClient2()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect("/auth/login")
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', session.user.id).single<{ role: string }>()
  if (profile?.role !== 'admin') redirect("/dashboard")
  // Use service role to see all users (RLS restricts profiles to own user)
  const adminDb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { data: users } = await adminDb.from('profiles').select('id, full_name, email, role, plan, transactions_used, created_at').order('created_at', { ascending: false })
  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <Shield className="w-5 h-5 text-brand-500" />
          <h1 className="text-2xl font-semibold text-gray-900">Admin Console</h1>
        </div>
        <p className="text-gray-400 text-sm">Manage user plans and accounts.</p>
      </div>
      <div className="card">
        <div className="flex items-center gap-2 px-6 py-4 border-b border-gray-100">
          <Users size={15} className="text-brand-500" />
          <h2 className="font-medium text-sm">All Users</h2>
          <span className="ml-auto text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{users?.length || 0} total</span>
        </div>
        <AdminUserTable users={users || []} />
      </div>
    </div>
  )
}
