'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, FileText, FolderOpen, Receipt, LogOut, Settings, Users, Home, Zap, Shield } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import type { Profile } from '@/types/database'

interface SidebarProps {
  profile: Profile | null
}

export default function Sidebar({ profile }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const isAdmin = profile?.role === 'admin'

  const navItems = [
    { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', tour: 'dashboard' },
    { href: '/dashboard/transactions', icon: FileText, label: 'Transactions', tour: 'transactions' },
    { href: '/dashboard/documents', icon: FolderOpen, label: 'Documents', tour: 'documents' },
    { href: '/dashboard/billing', icon: Receipt, label: 'Billing', tour: 'billing' },
    { href: '/dashboard/plans', icon: Zap, label: 'Plans' },
    ...(isAdmin
      ? [{ href: '/dashboard/clients', icon: Users, label: 'Clients' }, { href: '/dashboard/admin', icon: Shield, label: 'Admin' }]
      : [{ href: '/dashboard/portal', icon: Home, label: 'My Transaction' }]),
  ]

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  return (
    <aside className="w-56 bg-white border-r border-gray-100 flex flex-col h-full">
      <div className="px-5 py-5 border-b border-gray-100">
        <span className="font-serif text-xl">Klovex<span className="text-brand-500">.</span></span>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {navItems.map(({ href, icon: Icon, label, tour }: any) => {
          const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
          return (
            <Link key={href} href={href} data-tour={tour} className={cn('flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors', active ? 'bg-brand-50 text-brand-600 font-medium' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900')}>
              <Icon size={16} />
              {label}
            </Link>
          )
        })}
      </nav>
      <div className="px-3 py-4 border-t border-gray-100 space-y-0.5">
        <Link href="/dashboard/settings" className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors">
          <Settings size={16} /> Settings
        </Link>
        <button onClick={handleLogout} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors">
          <LogOut size={16} /> Sign out
        </button>
        <div className="px-3 pt-3">
          <p className="text-xs font-medium text-gray-700 truncate">{profile?.full_name}</p>
          <p className="text-xs text-gray-400 truncate">{profile?.email}</p>
          {isAdmin && <span className="inline-block mt-1 text-xs bg-brand-50 text-brand-600 font-medium px-1.5 py-0.5 rounded">Admin</span>}
        </div>
      </div>
    </aside>
  )
}
