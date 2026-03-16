'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { User, Building2, Phone, Mail, Save } from 'lucide-react'

export default function SettingsPage() {
  const [profile, setProfile] = useState({ full_name: '', email: '', company: '', phone: '' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase.from('profiles').select('*').eq('id', user.id).single<{ full_name: string; email: string; company: string; phone: string }>().then(({ data }) => {
        if (data) setProfile({ full_name: data.full_name || '', email: data.email || '', company: data.company || '', phone: data.phone || '' })
        setLoading(false)
      })
    })
  }, [])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await (supabase as any).from('profiles').update({ full_name: profile.full_name, company: profile.company, phone: profile.phone }).eq('id', user.id)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const set = (k: keyof typeof profile) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setProfile(p => ({ ...p, [k]: e.target.value }))

  if (loading) return <div className="p-8 text-gray-400">Loading...</div>

  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-2xl font-semibold text-gray-900 mb-8">Settings</h1>

      <div className="card p-6 mb-6">
        <h2 className="font-semibold text-gray-900 mb-5 flex items-center gap-2">
          <User className="w-4 h-4 text-brand-500" /> Profile
        </h2>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Full name</label>
              <input type="text" className="input" value={profile.full_name} onChange={set('full_name')} placeholder="Your name" />
            </div>
            <div>
              <label className="label">Email</label>
              <input type="email" className="input" value={profile.email} disabled placeholder="Email" />
              <p className="text-xs text-gray-400 mt-1">Email cannot be changed here</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Company</label>
              <input type="text" className="input" value={profile.company} onChange={set('company')} placeholder="Keller Williams" />
            </div>
            <div>
              <label className="label">Phone</label>
              <input type="tel" className="input" value={profile.phone} onChange={set('phone')} placeholder="(555) 000-0000" />
            </div>
          </div>
          <div className="flex items-center gap-3 pt-2">
            <button type="submit" className="btn-primary flex items-center gap-2" disabled={saving}>
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save changes'}
            </button>
            {saved && <span className="text-brand-600 text-sm font-medium">✓ Saved!</span>}
          </div>
        </form>
      </div>

      <div className="card p-6">
        <h2 className="font-semibold text-gray-900 mb-2">Account</h2>
        <p className="text-sm text-gray-500 mb-4">Manage your Klovex account</p>
        <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-600">
          <p><span className="font-medium">Plan:</span> Klovex TC Platform</p>
          <p className="mt-1"><span className="font-medium">Role:</span> Admin</p>
        </div>
      </div>
    </div>
  )
}
