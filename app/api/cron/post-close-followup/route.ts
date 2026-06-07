import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendPostCloseFollowUpEmail } from '@/lib/email-templates'
import { todayDateString, addDaysToDate } from '@/lib/dates'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: Request) {
  // Verify cron secret in production
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}` && process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Find transactions that closed exactly 30 days ago
  const dateStr = addDaysToDate(todayDateString(), -30)

  const { data: transactions, error: txError } = await (supabase as any)
    .from('transactions')
    .select('*')
    .eq('status', 'closed')
    .eq('closing_date', dateStr)

  if (txError) {
    console.error('Failed to query closed transactions:', txError)
    return NextResponse.json({ error: 'Query failed' }, { status: 500 })
  }

  if (!transactions || transactions.length === 0) {
    return NextResponse.json({ message: 'No 30-day follow-ups needed today', sent: 0 })
  }

  let sent = 0
  for (const tx of transactions) {
    const userId = tx.client_id || tx.user_id
    if (!userId) continue

    // Check if we already sent a follow-up for this transaction
    const { data: existingEvent } = await (supabase as any)
      .from('timeline_events')
      .select('id')
      .eq('transaction_id', tx.id)
      .eq('type', 'email')
      .ilike('content', '%post-close%')
      .limit(1)

    if (existingEvent && existingEvent.length > 0) continue

    const { data: profile } = await (supabase as any)
      .from('profiles')
      .select('email, full_name')
      .eq('id', userId)
      .single()

    if (!profile?.email) continue

    try {
      await sendPostCloseFollowUpEmail({
        agentEmail: profile.email,
        agentName: profile.full_name || 'there',
        transaction: tx,
      })

      await (supabase as any).from('timeline_events').insert({
        transaction_id: tx.id,
        author_id: userId,
        type: 'email',
        content: '30-day post-close follow-up email sent to agent',
      })

      sent++
    } catch (err) {
      console.error(`Failed to send post-close email for ${tx.property_address}:`, err)
    }
  }

  return NextResponse.json({ message: `Sent ${sent} post-close follow-up email(s)`, sent })
}
