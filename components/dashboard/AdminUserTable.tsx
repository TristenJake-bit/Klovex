'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { CheckCircle, Loader2 } from 'lucide-react'

const PLAN_COLORS: Record<string, string> = {
  starter: 'bg-gray-100 text-gray-600',
  growth: 'bg-blue-100 text-blue-700',
  custom: 'bg-purple-100 text-purple-700',
}
const PLAN_LIMITS: Record<string, number | null> = {
  starter: null, growth: 4, custom: 10,
}

export default function AdminUserTable({ users }: { users: any[] }) {
  const [saving, setSaving] = useState<string | null>(null)
  const [saved, setSaved] = useState<string | null>(null)
  const [localUsers, setLocalUsers] = useState(users)

  async function updateUser(userId: string, field: 'plan' | 'transactions_used', value: string | number) {
    setSaving(userId + field)
    const updateData: any = { [field]: value }
    if (field === 'plan' && (value === 'growth' || value === 'custom')) {
      updateData.plan_period_start = new Date().toISOString()
      updateData.transactions_used = 0
    }
    await fetch('/api/admin/update-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, updateData }),
    })
    setLocalUsers(prev => prev.map(u => u.id === userId ? { ...u, ...updateData } : u))
    setSaving(null)
    setSaved(userId + field)
    setTimeout(() => setSaved(null), 2000)
  }

  const fmt = (d: string) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

  return (
    <div className="divide-y divide-gray-100">
      {localUsers.map((user) => {
        const planLimit = PLAN_LIMITS[user.plan || 'starter']
        return (
          <div key={user.id} className="px-6 py-4 flex items-center gap-6">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-gray-900 truncate">{user.full_name || 'No name'}</p>
                {user.role === 'admin' && <span className="text-xs bg-brand-50 text-brand-600 font-medium px-1.5 py-0.5 rounded">Admin</span>}
              </div>
              <p className="text-xs text-gray-400 truncate">{user.email}</p>
              <p className="text-xs text-gray-300 mt-0.5">Joined {fmt(user.created_at)}</p>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-gray-400 font-medium">Plan</label>
              <div className="flex items-center gap-2">
                <select
                  value={user.plan || 'starter'}
                  onChange={e => updateUser(user.id, 'plan', e.target.value)}
                  className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 cursor-pointer"
                >
                  <option value="starter">Starter</option>
                  <option value="growth">Growth</option>
                  <option value="custom">Custom</option>
                </select>
                {saving === user.id + 'plan' && <Loader2 className="w-3 h-3 animate-spin text-brand-500" />}
                {saved === user.id + 'plan' && <CheckCircle className="w-3 h-3 text-green-500" />}
              </div>
              <span className={'text-xs font-medium px-2 py-0.5 rounded-full ' + (PLAN_COLORS[user.plan || 'starter'])}>
                {(user.plan || 'starter').charAt(0).toUpperCase() + (user.plan || 'starter').slice(1)}
              </span>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-gray-400 font-medium">Tx used</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  value={user.transactions_used || 0}
                  onChange={e => setLocalUsers(prev => prev.map(u => u.id === user.id ? { ...u, transactions_used: parseInt(e.target.value) || 0 } : u))}
                  onBlur={e => updateUser(user.id, 'transactions_used', parseInt(e.target.value) || 0)}
                  className="w-16 text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 text-center"
                />
                {planLimit !== null && <span className="text-xs text-gray-400">of {planLimit}</span>}
                {saving === user.id + 'transactions_used' && <Loader2 className="w-3 h-3 animate-spin text-brand-500" />}
                {saved === user.id + 'transactions_used' && <CheckCircle className="w-3 h-3 text-green-500" />}
              </div>
              {planLimit !== null && (
                <div className="flex gap-0.5 w-24">
                  {Array.from({ length: planLimit }).map((_, i) => (
                    <div key={i} className={'h-1 flex-1 rounded-full ' + (i < (user.transactions_used || 0) ? 'bg-brand-500' : 'bg-gray-200')} />
                  ))}
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
