'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Send } from 'lucide-react'

export default function TimelineNote({ transactionId }: { transactionId: string }) {
  const router = useRouter()
  const supabase = createClient()
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!note.trim()) return
    setLoading(true)

    const { data: { session } } = await supabase.auth.getSession()

    await (supabase as any).from('timeline_events').insert({
      transaction_id: transactionId,
      author_id: session!.user.id,
      type: 'note',
      content: note.trim(),
    })

    setNote('')
    setLoading(false)
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 mt-4 pt-4 border-t border-gray-100">
      <input
        type="text"
        className="input flex-1"
        placeholder="Add a note..."
        value={note}
        onChange={e => setNote(e.target.value)}
      />
      <button type="submit" className="btn-primary px-3" disabled={loading || !note.trim()}>
        <Send size={14} />
      </button>
    </form>
  )
}
