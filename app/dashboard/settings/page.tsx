'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { User, Save, Zap, AlertTriangle, Gift } from 'lucide-react'

const PLAN_LABELS: Record<string, string> = {
  starter: 'Starter - $299/mo',
  growth: 'Growth - $799/mo',
  custom: 'Custom - $1,499/mo',
}

const PLAN_PERKS: Record<string, string[]> = {
  growth: [
    '4 transactions included per month',
    'Advanced AI document comparison',
    'Priority support',
    'Monthly performance report',
  ],
  custom: [
    '10 transactions included per month',
    'Dedicated account manager',
    'Custom checklist templates',
    'Team access and custom branding',
  ],
}

export default function SettingsPage() {
  const [profile, setProfile] = useState<any>({ full_name: '', email: '', company: '', phone: '', plan: 'starter' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [cancelStep, setCancelStep] = useState<'idle' | 'confirm' | 'incentive' | 'final'>('idle')
  const [cancelling, setCancelling] = useState(false)
  const [cancelDone, setCancelDone] = useState(false)
  const [claimingCredit, setClaimingCredit] = useState(false)
  const [creditClaimed, setCreditClaimed] = useState(false)
  const [retentionEligible, setRetentionEligible] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      ;(supabase as any).from('profiles').select('*').eq('id', user.id).single().then(({ data }: any) => {
        if (data) {
          setProfile({
            full_name: data.full_name || '',
            email: data.email || '',
            company: data.company || '',
            phone: data.phone || '',
            plan: data.plan || 'starter',
          })
          // Check if retention offer was used within the last 6 months
          if (data.retention_offer_used_at) {
            const sixMonthsAgo = new Date()
            sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
            setRetentionEligible(new Date(data.retention_offer_used_at) < sixMonthsAgo)
          }
        }
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

  async function handleCancelConfirm() {
    setCancelling(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await (supabase as any).from('profiles').update({ plan: 'starter', transactions_used: 0, plan_period_start: null }).eq('id', user.id)
    setProfile((p: any) => ({ ...p, plan: 'starter' }))
    setCancelling(false)
    setCancelDone(true)
    setCancelStep('idle')
  }

  async function claimFreeTransaction() {
    setClaimingCredit(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    // Get current profile to read transactions_used
    const { data: currentProfile } = await (supabase as any).from('profiles').select('transactions_used').eq('id', user.id).single()
    const currentUsed = currentProfile?.transactions_used || 0
    // Subtract 1 from transactions_used (giving them 1 free credit), and mark offer as used
    await (supabase as any).from('profiles').update({
      transactions_used: Math.max(0, currentUsed - 1),
      retention_offer_used_at: new Date().toISOString(),
    }).eq('id', user.id)
    setClaimingCredit(false)
    setCreditClaimed(true)
    setCancelStep('idle')
    setRetentionEligible(false)
  }

  function handleStillWantToCancel() {
    if (retentionEligible) {
      setCancelStep('incentive')
    } else {
      setCancelStep('final')
    }
  }

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setProfile((p: any) => ({ ...p, [k]: e.target.value }))

  const canCancel = profile.plan === 'growth' || profile.plan === 'custom'
  const perks = PLAN_PERKS[profile.plan] || []

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
            {saved && <span className="text-brand-600 text-sm font-medium">Saved!</span>}
          </div>
        </form>
      </div>

      <div className="card p-6 mb-6">
        <h2 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
          <Zap className="w-4 h-4 text-brand-500" /> Account
        </h2>
        <p className="text-sm text-gray-500 mb-4">Your current plan and billing details</p>
        <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-600 space-y-1.5">
          <p><span className="font-medium">Plan:</span> {PLAN_LABELS[profile.plan] || 'Starter - $299/mo'}</p>
          <p><span className="font-medium">Billing:</span> Monthly - renews automatically</p>
          <p className="text-xs text-gray-400 mt-1">To upgrade your plan, visit the <a href="/dashboard/plans" className="text-brand-500 hover:underline">Plans page</a>.</p>
        </div>
      </div>

      {canCancel && (
        <div className="card p-6 border border-gray-200">
          <h2 className="font-semibold text-gray-500 mb-1 text-sm">Manage subscription</h2>

          {cancelDone && (
            <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm text-green-700">
              Your plan has been downgraded to Starter. Your transactions and data remain intact.
            </div>
          )}

          {creditClaimed && (
            <div className="bg-brand-50 border border-brand-200 rounded-lg px-4 py-3 text-sm text-brand-700">
              1 free transaction credit has been added to your account. Thanks for staying with Klovex!
            </div>
          )}

          {cancelStep === 'idle' && !cancelDone && (
            <p className="text-xs text-gray-400">
              Need to make a change?{' '}
              <button onClick={() => setCancelStep('confirm')} className="text-gray-500 hover:text-red-500 underline underline-offset-2 transition-colors">
                Cancel my plan
              </button>
            </p>
          )}

          {cancelStep === 'confirm' && (
            <div className="mt-3 space-y-4">
              <div className="bg-orange-50 border border-orange-100 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="w-4 h-4 text-orange-500" />
                  <p className="text-sm font-semibold text-gray-800">Before you go - here is what you will lose</p>
                </div>
                <ul className="space-y-1.5">
                  {perks.map((perk, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-gray-600">
                      <span className="w-1.5 h-1.5 rounded-full bg-orange-400 flex-shrink-0" />
                      {perk}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={handleStillWantToCancel} className="text-xs text-red-500 hover:underline">
                  I still want to cancel
                </button>
                <button onClick={() => setCancelStep('idle')} className="btn-primary text-sm px-4 py-2">
                  Keep my plan
                </button>
              </div>
            </div>
          )}

          {cancelStep === 'incentive' && (
            <div className="mt-3 space-y-4">
              <div className="bg-brand-50 border border-brand-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Gift className="w-4 h-4 text-brand-500" />
                  <p className="text-sm font-semibold text-brand-800">Stay and get 1 free transaction</p>
                </div>
                <p className="text-sm text-brand-700">We&apos;d hate to see you go. Here&apos;s a free transaction credit on us — it&apos;ll be added to your current billing period immediately.</p>
                <button onClick={claimFreeTransaction} disabled={claimingCredit} className="mt-3 btn-primary text-sm px-4 py-2">
                  {claimingCredit ? 'Applying credit...' : 'Claim free transaction'}
                </button>
              </div>
              <button onClick={() => setCancelStep('final')} className="text-xs text-gray-400 hover:text-red-500 transition-colors underline underline-offset-2">
                No thanks, cancel anyway
              </button>
            </div>
          )}

          {cancelStep === 'final' && (
            <div className="mt-3 space-y-3">
              <p className="text-sm text-gray-600">Your plan will be downgraded to Starter immediately. Your transactions and data will remain intact.</p>
              <div className="flex items-center gap-3">
                <button onClick={handleCancelConfirm} disabled={cancelling} className="text-xs text-white bg-red-500 hover:bg-red-600 px-4 py-2 rounded-lg transition-colors">
                  {cancelling ? 'Cancelling...' : 'Confirm cancellation'}
                </button>
                <button onClick={() => setCancelStep('idle')} className="text-xs text-gray-400 hover:text-gray-600">
                  Never mind
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
