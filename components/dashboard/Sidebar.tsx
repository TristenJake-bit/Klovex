'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, FileText, FolderOpen, Receipt, LogOut, Settings, Users, Home, Zap, Shield, Menu, X } from 'lucide-react'
import NotificationBell from '@/components/dashboard/NotificationBell'
import { createClient } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import type { Profile } from '@/types/database'
import { useState } from 'react'

interface SidebarProps { profile: Profile | null }

export default function Sidebar({ profile }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const isAdmin = profile?.role === 'admin'
  const [mobileOpen, setMobileOpen] = useState(false)

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

  const NavLinks = ({ onClose }: { onClose?: () => void }) => (
    <>
      {navItems.map(({ href, icon: Icon, label, tour }: any) => {
        const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
        return (
          <Link key={href} href={href} data-tour={tour} onClick={onClose}
            className={cn('flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors', active ? 'bg-brand-50 text-brand-600 font-medium' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900')}>
            <Icon size={16} />{label}
          </Link>
        )
      })}
    </>
  )

  return (
    <>
      <aside className="hidden md:flex w-56 bg-white border-r border-gray-100 flex-col h-full">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <span className="font-serif text-xl">Klovex<span className="text-brand-500">.</span></span>
          <NotificationBell />
        </div>
        <nav className="flex-1 px-3 py-4 space-y-0.5"><NavLinks /></nav>
        <div className="px-3 py-4 border-t border-gray-100 space-y-0.5">
          <Link href="/dashboard/settings" className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"><Settings size={16} /> Settings</Link>
          <button onClick={handleLogout} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"><LogOut size={16} /> Sign out</button>
          <div className="px-3 pt-3">
            <p className="text-xs font-medium text-gray-700 truncate">{profile?.full_name}</p>
            <p className="text-xs text-gray-400 truncate">{profile?.email}</p>
            {isAdmin && <span className="inline-block mt-1 text-xs bg-brand-50 text-brand-600 font-medium px-1.5 py-0.5 rounded">Admin</span>}
          </div>
        </div>
      </aside>

      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-100 flex items-center justify-between px-4 py-3">
        <span className="font-serif text-lg">Klovex<span className="text-brand-500">.</span></span>
        <div className="flex items-center gap-1">
          <NotificationBell />
          <button onClick={() => setMobileOpen(true)} className="p-2 rounded-lg hover:bg-gray-100"><Menu size={20} className="text-gray-600" /></button>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/30" onClick={() => setMobileOpen(false)} />
          <div className="relative w-64 bg-white h-full flex flex-col shadow-xl">
            <div className="px-5 py-5 border-b border-gray-100 flex items-center justify-between">
              <span className="font-serif text-xl">Klovex<span className="text-brand-500">.</span></span>
              <button onClick={() => setMobileOpen(false)} className="p-1.5 rounded-lg hover:bg-gray-100"><X size={18} className="text-gray-500" /></button>
            </div>
            <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto"><NavLinks onClose={() => setMobileOpen(false)} /></nav>
            <div className="px-3 py-4 border-t border-gray-100 space-y-0.5">
              <Link href="/dashboard/settings" onClick={() => setMobileOpen(false)} className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"><Settings size={16} /> Settings</Link>
              <button onClick={handleLogout} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"><LogOut size={16} /> Sign out</button>
              <div className="px-3 pt-3">
                <p className="text-xs font-medium text-gray-700 truncate">{profile?.full_name}</p>
                <p className="text-xs text-gray-400 truncate">{profile?.email}</p>
                {isAdmin && <span className="inline-block mt-1 text-xs bg-brand-50 text-brand-600 font-medium px-1.5 py-0.5 rounded">Admin</span>}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
