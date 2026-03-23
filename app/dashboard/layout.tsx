import { redirect } from 'next/navigation'
import { createServerClient2 } from '@/lib/supabase-server'
import Sidebar from '@/components/dashboard/Sidebar'
import ProductTour from '@/components/dashboard/ProductTour'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerClient2()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar profile={profile} />
      <main className="flex-1 overflow-y-auto pt-14 md:pt-0">{children}</main>
      <ProductTour />
    </div>
  )
}
