'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'

const STEPS = [
  {
    target: '[data-tour="dashboard"]',
    title: 'Your Command Center',
    body: 'The dashboard shows everything that needs your attention — overdue tasks, upcoming deadlines, and closings this week. You will always know what is on fire.',
    position: 'right'
  },
  {
    target: '[data-tour="transactions"]',
    title: 'Transactions',
    body: 'Every deal lives here. Create a new transaction, upload documents, and Klovex handles the coordination automatically.',
    position: 'right'
  },
  {
    target: '[data-tour="documents"]',
    title: 'Documents',
    body: 'All documents across all your transactions in one place. Upload a contract and AI instantly extracts key dates, parties, and risks.',
    position: 'right'
  },
  {
    target: '[data-tour="billing"]',
    title: 'Billing',
    body: 'Track all your invoices and payment history here. Each transaction is $299 — no subscriptions or hidden fees.',
    position: 'right'
  },
  {
    target: '[data-tour="new-transaction"]',
    title: 'Start Your First Deal',
    body: 'Ready to go? Click here to create your first transaction. Fill in the property details, pay the coordination fee, and Klovex takes it from there.',
    position: 'bottom'
  },
]

export default function ProductTour() {
  const [step, setStep] = useState(0)
  const [visible, setVisible] = useState(false)
  const [pos, setPos] = useState({ top: 0, left: 0 })

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      const key = `klovex_tour_done_${user.id}`
      if (!localStorage.getItem(key)) {
        setVisible(true)
      }
    })
  }, [])

  useEffect(() => {
    if (!visible) return
    const el = document.querySelector(STEPS[step].target)
    if (el) {
      const rect = el.getBoundingClientRect()
      setPos({ top: rect.top + window.scrollY, left: rect.left + rect.width + 16 })
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [step, visible])

  async function finish() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) localStorage.setItem(`klovex_tour_done_${user.id}`, '1')
    setVisible(false)
  }

  if (!visible) return null

  const current = STEPS[step]
  const isLast = step === STEPS.length - 1

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/40 z-40" onClick={finish} />

      {/* Tooltip */}
      <div
        className="fixed z-50 w-72 bg-white rounded-2xl shadow-2xl p-5"
        style={{ top: Math.max(16, pos.top - 60), left: Math.min(pos.left, window.innerWidth - 300) }}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-brand-500 font-semibold uppercase tracking-wide">Step {step + 1} of {STEPS.length}</span>
          <button onClick={finish} className="text-gray-400 hover:text-gray-600 text-lg leading-none">×</button>
        </div>
        <h3 className="font-semibold text-gray-900 mb-1.5">{current.title}</h3>
        <p className="text-sm text-gray-500 leading-relaxed mb-4">{current.body}</p>

        {/* Progress dots */}
        <div className="flex items-center gap-1.5 mb-4">
          {STEPS.map((_, i) => (
            <div key={i} className={`h-1.5 rounded-full transition-all ${i === step ? 'w-4 bg-brand-500' : 'w-1.5 bg-gray-200'}`} />
          ))}
        </div>

        <div className="flex items-center gap-2">
          {step > 0 && (
            <button onClick={() => setStep(s => s - 1)} className="flex-1 py-2 text-sm text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg transition-colors">
              Back
            </button>
          )}
          <button
            onClick={() => isLast ? finish() : setStep(s => s + 1)}
            className="flex-1 py-2 text-sm bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors font-medium"
          >
            {isLast ? 'Get started →' : 'Next →'}
          </button>
        </div>
      </div>
    </>
  )
}
