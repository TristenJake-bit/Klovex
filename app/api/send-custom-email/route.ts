import { NextRequest, NextResponse } from 'next/server'
import { createServerClient2 } from '@/lib/supabase-server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { resolveMergeFields, MergeContext } from '@/lib/email-merge'
import { createNotification } from '@/lib/notify'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: NextRequest) {
  const authClient = await createServerClient2()
  const { data: { session } } = await authClient.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { transactionId, subject, body, recipients, templateName } = await req.json()

  if (!transactionId || !subject || !body || !recipients || recipients.length === 0) {
    return NextResponse.json({ error: 'Missing required fields (transactionId, subject, body, recipients)' }, { status: 400 })
  }

  // Get transaction data
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

  // Get agent profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('email, full_name')
    .eq('id', session.user.id)
    .single<any>()

  // Build merge context
  const ctx: MergeContext = {
    transaction,
    contacts: contacts || [],
    agentName: profile?.full_name || 'Your Agent',
    tcName: profile?.full_name || 'Your TC',
  }

  // Resolve merge fields for sending
  const { result: resolvedSubject, missing: missingSubject } = resolveMergeFields(subject, ctx, 'send')
  const { result: resolvedBody, missing: missingBody } = resolveMergeFields(body, ctx, 'send')

  const allMissing = [...new Set([...missingSubject, ...missingBody])]

  // Convert plain text body to HTML (preserve newlines)
  const htmlBody = resolvedBody
    .split('\n')
    .map(line => line.trim() === '' ? '<br>' : `<p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 8px">${line}</p>`)
    .join('\n')

  const emailHtml = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:600px;margin:0 auto;background:#ffffff">
      <div style="background:#1a7a52;padding:24px 32px">
        <h1 style="color:white;margin:0;font-size:20px;font-weight:600">Klovex</h1>
      </div>
      <div style="padding:32px">
        ${htmlBody}
        ${allMissing.length > 0 ? `<p style="color:#dc2626;font-size:12px;margin-top:24px;padding-top:16px;border-top:1px solid #f3f4f6">⚠️ Some merge fields could not be resolved: ${allMissing.join(', ')}</p>` : ''}
        <p style="color:#9ca3af;font-size:13px;margin-top:32px;padding-top:24px;border-top:1px solid #f3f4f6">
          Sent via Klovex · AI-Powered Transaction Coordination
        </p>
      </div>
    </div>
  `

  // Validate recipient emails
  const validRecipients = recipients.filter((r: string) => r && r.includes('@'))
  if (validRecipients.length === 0) {
    return NextResponse.json({ error: 'No valid recipient email addresses' }, { status: 400 })
  }

  try {
    await resend.emails.send({
      from: 'Klovex <onboarding@resend.dev>',
      to: validRecipients,
      subject: resolvedSubject,
      html: emailHtml,
    })

    // Log to timeline
    const recipientNames = (contacts || [])
      .filter((c: any) => validRecipients.includes(c.email))
      .map((c: any) => `${c.name} (${c.role})`)
    const recipientStr = recipientNames.length > 0 ? recipientNames.join(', ') : validRecipients.join(', ')

    await (supabase as any).from('timeline_events').insert({
      transaction_id: transactionId,
      author_id: session.user.id,
      type: 'email',
      content: `📧 Email sent: "${resolvedSubject}" → ${recipientStr}${templateName ? ` (template: ${templateName})` : ''}`,
    })

    // In-app notification
    await createNotification({
      userId: session.user.id,
      transactionId,
      type: 'email',
      title: 'Email sent',
      body: `"${resolvedSubject}" sent to ${recipientStr}`,
    })

    return NextResponse.json({ success: true, sentTo: validRecipients, missing: allMissing })
  } catch (err: any) {
    console.error('Failed to send custom email:', err)
    return NextResponse.json({ error: err.message || 'Failed to send email' }, { status: 500 })
  }
}
