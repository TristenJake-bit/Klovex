import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { daysFromToday } from '@/lib/dates'

// Public endpoint — no auth required, validates token and returns safe transaction data
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 400 })

  // Validate token
  const { data: tokenRecord } = await (supabase as any)
    .from('transaction_tokens')
    .select('transaction_id, expires_at')
    .eq('token', token)
    .single()

  if (!tokenRecord) return NextResponse.json({ error: 'Invalid or expired link' }, { status: 404 })
  if (new Date(tokenRecord.expires_at) < new Date()) return NextResponse.json({ error: 'This portal link has expired' }, { status: 410 })

  const txId = tokenRecord.transaction_id

  // Fetch transaction (safe fields only — no notes, no user IDs)
  const { data: tx } = await (supabase as any)
    .from('transactions')
    .select('property_address, purchase_price, closing_date, status, transaction_type, state, created_at')
    .eq('id', txId)
    .single()

  if (!tx) return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })

  // Fetch checklist summary (task names + completion status, no IDs)
  const { data: checklist } = await (supabase as any)
    .from('transaction_checklists')
    .select('task, phase, completed, due_date, responsible')
    .eq('transaction_id', txId)
    .order('due_date', { ascending: true })

  // Fetch contacts (names and roles only — no emails/phones for privacy)
  const { data: contacts } = await (supabase as any)
    .from('transaction_contacts')
    .select('name, role, company')
    .eq('transaction_id', txId)

  // Fetch recent timeline (public-safe events only)
  const { data: timeline } = await (supabase as any)
    .from('timeline_events')
    .select('type, content, created_at')
    .eq('transaction_id', txId)
    .in('type', ['status_change', 'system', 'email', 'ai_analysis'])
    .order('created_at', { ascending: false })
    .limit(15)

  // Compute stats
  const totalTasks = (checklist || []).length
  const completedTasks = (checklist || []).filter((t: any) => t.completed).length
  const progressPct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

  const upcomingDeadlines = (checklist || [])
    .filter((t: any) => !t.completed && t.due_date)
    .map((t: any) => {
      return { task: t.task, phase: t.phase, dueDate: t.due_date, daysUntil: daysFromToday(t.due_date) }
    })
    .slice(0, 8)

  return NextResponse.json({
    transaction: tx,
    progress: { total: totalTasks, completed: completedTasks, percent: progressPct },
    upcomingDeadlines,
    contacts: contacts || [],
    timeline: timeline || [],
    expiresAt: tokenRecord.expires_at,
  })
}
