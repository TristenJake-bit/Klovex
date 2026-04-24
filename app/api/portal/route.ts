import { NextRequest, NextResponse } from 'next/server'
import { createServerClient2 } from '@/lib/supabase-server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

// POST — generate a portal token for a transaction
export async function POST(req: NextRequest) {
  const authClient = await createServerClient2()
  const { data: { session } } = await authClient.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  const { transactionId } = await req.json()
  if (!transactionId) return NextResponse.json({ error: 'Missing transactionId' }, { status: 400 })

  // Check if a valid token already exists
  const { data: existing } = await (supabase as any)
    .from('transaction_tokens')
    .select('*')
    .eq('transaction_id', transactionId)
    .gt('expires_at', new Date().toISOString())
    .limit(1)

  if (existing && existing.length > 0) {
    return NextResponse.json({ token: existing[0].token, expiresAt: existing[0].expires_at })
  }

  // Generate new token — 30 day expiry
  const token = crypto.randomBytes(24).toString('hex')
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 30)

  const { error } = await (supabase as any)
    .from('transaction_tokens')
    .insert({ transaction_id: transactionId, token, expires_at: expiresAt.toISOString() })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Log to timeline
  await (supabase as any).from('timeline_events').insert({
    transaction_id: transactionId,
    author_id: session.user.id,
    type: 'system',
    content: 'Portal link generated — shareable with transaction parties',
  })

  return NextResponse.json({ token, expiresAt: expiresAt.toISOString() })
}

// DELETE — revoke a portal token
export async function DELETE(req: NextRequest) {
  const authClient2 = await createServerClient2()
  const { data: { session } } = await authClient2.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  const { transactionId } = await req.json()
  if (!transactionId) return NextResponse.json({ error: 'Missing transactionId' }, { status: 400 })

  await (supabase as any)
    .from('transaction_tokens')
    .delete()
    .eq('transaction_id', transactionId)

  return NextResponse.json({ success: true })
}
