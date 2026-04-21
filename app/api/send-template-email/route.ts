import { NextRequest, NextResponse } from 'next/server'
import { createServerClient2 } from '@/lib/supabase-server'
import { sendWelcomeEmail, sendClosingConfirmationEmail } from '@/lib/email-templates'
import { createNotification } from '@/lib/notify'

export async function POST(req: NextRequest) {
  const supabase = await createServerClient2()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { template, transactionId } = await req.json()
  if (!template || !transactionId) {
    return NextResponse.json({ error: 'Missing template or transactionId' }, { status: 400 })
  }

  // Get agent profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('email, full_name')
    .eq('id', session.user.id)
    .single<any>()

  if (!profile?.email) {
    return NextResponse.json({ error: 'No agent email found' }, { status: 400 })
  }

  // Get transaction
  const { data: transaction } = await (supabase as any)
    .from('transactions')
    .select('*')
    .eq('id', transactionId)
    .single()

  if (!transaction) {
    return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })
  }

  // Get contacts
  const { data: contacts } = await (supabase as any)
    .from('transaction_contacts')
    .select('*')
    .eq('transaction_id', transactionId)

  try {
    if (template === 'welcome') {
      await sendWelcomeEmail({
        agentEmail: profile.email,
        agentName: profile.full_name || 'there',
        transaction,
        contacts: contacts || [],
      })
    } else if (template === 'closing_confirmation') {
      await sendClosingConfirmationEmail({
        agentEmail: profile.email,
        agentName: profile.full_name || 'there',
        transaction,
        contacts: contacts || [],
      })
    } else {
      return NextResponse.json({ error: 'Unknown template' }, { status: 400 })
    }

    // Log to timeline
    const templateLabels: Record<string, string> = {
      welcome: 'Welcome email sent to agent',
      closing_confirmation: 'Closing confirmation email sent to agent',
    }
    await (supabase as any).from('timeline_events').insert({
      transaction_id: transactionId,
      author_id: session.user.id,
      type: 'email',
      content: templateLabels[template] || `Email template "${template}" sent`,
    })

    // In-app notification
    const notifTitles: Record<string, string> = {
      welcome: 'Transaction file opened',
      closing_confirmation: 'Moving to closing phase',
    }
    await createNotification({
      userId: session.user.id,
      transactionId,
      type: 'email',
      title: notifTitles[template] || 'Email sent',
      body: `${templateLabels[template]} for ${transaction.property_address}`,
    })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('Failed to send template email:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
