'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Sparkles } from 'lucide-react'

export default function SeedDemoButton() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleSeed() {
    setLoading(true)
    try {
      const res = await fetch('/api/seed-demo', { method: 'POST' })
      const data = await res.json()
      if (data.transactionId) {
        router.push(`/dashboard/transactions/${data.transactionId}`)
      }
    } catch (err) {
      console.error('Failed to seed demo:', err)
    }
    setLoading(false)
  }

  return (
    <button onClick={handleSeed} disabled={loading}
      className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold rounded-lg transition-colors flex-shrink-0">
      {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Loading...</> : <><Sparkles className="w-4 h-4" /> Try sample</>}
    </button>
  )
}
