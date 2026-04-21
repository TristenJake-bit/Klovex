import { NextRequest, NextResponse } from 'next/server'
import { createServerClient2 } from '@/lib/supabase-server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: NextRequest) {
  const supabase = await createServerClient2()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const today = new Date().toISOString().split('T')[0]
  const in3days = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  const in7days = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  // Get all active transactions
  const { data: transactions } = await (supabase as any)
    .from('transactions')
    .select('*, profiles(full_name, email)')
    .not('status', 'in', '("closed","cancelled")')

  if (!transactions || transactions.length === 0)
    return NextResponse.json({ sent: 0, message: 'No active transactions' })

  const txIds = transactions.map((t: any) => t.id)
  const emailTo = session.user.email!
  let sent = 0

  // 1. Overdue tasks
  const { data: overdue } = await (supabase as any)
    .from('transaction_checklists')
    .select('*, transactions(property_address)')
    .in('transaction_id', txIds)
    .eq('completed', false)
    .lt('due_date', today)
    .order('due_date', { ascending: true })

  if (overdue && overdue.length > 0) {
    const rows = overdue.map((t: any) => {
      const daysOverdue = Math.ceil((Date.now() - new Date(t.due_date).getTime()) / (1000 * 60 * 60 * 24))
      return `<tr>
        <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;font-size:13px;color:#111">${t.task}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;font-size:13px;color:#6b7280">${t.transactions?.property_address}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;font-size:13px;color:#ef4444;font-weight:600">${daysOverdue}d overdue</td>
      </tr>`
    }).join('')

    await resend.emails.send({
      from: 'Klovex <onboarding@resend.dev>',
      to: emailTo,
      subject: `⚠️ ${overdue.length} overdue task${overdue.length > 1 ? 's' : ''} need your attention`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:32px 24px">
          <div style="margin-bottom:24px">
            <span style="font-size:20px;font-weight:700;color:#111">Klovex</span><span style="color:#10b981">.</span>
          </div>
          <h2 style="font-size:18px;font-weight:600;color:#111;margin-bottom:8px">You have ${overdue.length} overdue task${overdue.length > 1 ? 's' : ''}</h2>
          <p style="color:#6b7280;font-size:14px;margin-bottom:20px">These checklist items are past their due date and need immediate attention.</p>
          <table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden">
            <thead>
              <tr style="background:#f9fafb">
                <th style="padding:10px 12px;text-align:left;font-size:12px;color:#6b7280;font-weight:600;text-transform:uppercase">Task</th>
                <th style="padding:10px 12px;text-align:left;font-size:12px;color:#6b7280;font-weight:600;text-transform:uppercase">Property</th>
                <th style="padding:10px 12px;text-align:left;font-size:12px;color:#6b7280;font-weight:600;text-transform:uppercase">Status</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
          <a href="https://klovex-kappa.vercel.app/dashboard" style="display:inline-block;margin-top:24px;background:#10b981;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600">View Dashboard</a>
          <p style="color:#9ca3af;font-size:12px;margin-top:32px">Klovex · AI-powered transaction coordination</p>
        </div>
      `
    })
    sent++
  }

  // 2. Upcoming deadlines (next 3 days)
  const { data: urgent } = await (supabase as any)
    .from('transaction_checklists')
    .select('*, transactions(property_address)')
    .in('transaction_id', txIds)
    .eq('completed', false)
    .gte('due_date', today)
    .lte('due_date', in3days)
    .order('due_date', { ascending: true })

  if (urgent && urgent.length > 0) {
    const rows = urgent.map((t: any) => {
      const daysUntil = Math.ceil((new Date(t.due_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      return `<tr>
        <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;font-size:13px;color:#111">${t.task}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;font-size:13px;color:#6b7280">${t.transactions?.property_address}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;font-size:13px;color:#f59e0b;font-weight:600">${daysUntil === 0 ? 'Today' : `${daysUntil}d away`}</td>
      </tr>`
    }).join('')

    await resend.emails.send({
      from: 'Klovex <onboarding@resend.dev>',
      to: emailTo,
      subject: `📅 ${urgent.length} task${urgent.length > 1 ? 's' : ''} due in the next 3 days`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:32px 24px">
          <div style="margin-bottom:24px">
            <span style="font-size:20px;font-weight:700;color:#111">Klovex</span><span style="color:#10b981">.</span>
          </div>
          <h2 style="font-size:18px;font-weight:600;color:#111;margin-bottom:8px">Upcoming deadlines this week</h2>
          <p style="color:#6b7280;font-size:14px;margin-bottom:20px">These tasks are due in the next 3 days across your active transactions.</p>
          <table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden">
            <thead>
              <tr style="background:#f9fafb">
                <th style="padding:10px 12px;text-align:left;font-size:12px;color:#6b7280;font-weight:600;text-transform:uppercase">Task</th>
                <th style="padding:10px 12px;text-align:left;font-size:12px;color:#6b7280;font-weight:600;text-transform:uppercase">Property</th>
                <th style="padding:10px 12px;text-align:left;font-size:12px;color:#6b7280;font-weight:600;text-transform:uppercase">Due</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
          <a href="https://klovex-kappa.vercel.app/dashboard" style="display:inline-block;margin-top:24px;background:#10b981;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600">View Dashboard</a>
          <p style="color:#9ca3af;font-size:12px;margin-top:32px">Klovex · AI-powered transaction coordination</p>
        </div>
      `
    })
    sent++
  }

  // 3. Closing soon (7 days)
  const closingSoon = transactions.filter((t: any) => {
    if (!t.closing_date) return false
    const days = Math.ceil((new Date(t.closing_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    return days >= 0 && days <= 7
  })

  if (closingSoon.length > 0) {
    const rows = closingSoon.map((t: any) => {
      const days = Math.ceil((new Date(t.closing_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      return `<tr>
        <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;font-size:13px;color:#111">${t.property_address}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;font-size:13px;color:#6b7280">${new Date(t.closing_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;font-size:13px;color:#ef4444;font-weight:600">${days === 0 ? 'Today!' : `${days}d away`}</td>
      </tr>`
    }).join('')

    await resend.emails.send({
      from: 'Klovex <onboarding@resend.dev>',
      to: emailTo,
      subject: `🏠 ${closingSoon.length} transaction${closingSoon.length > 1 ? 's' : ''} closing within 7 days`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:32px 24px">
          <div style="margin-bottom:24px">
            <span style="font-size:20px;font-weight:700;color:#111">Klovex</span><span style="color:#10b981">.</span>
          </div>
          <h2 style="font-size:18px;font-weight:600;color:#111;margin-bottom:8px">Closings coming up this week</h2>
          <p style="color:#6b7280;font-size:14px;margin-bottom:20px">Make sure everything is in order for these upcoming closings.</p>
          <table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden">
            <thead>
              <tr style="background:#f9fafb">
                <th style="padding:10px 12px;text-align:left;font-size:12px;color:#6b7280;font-weight:600;text-transform:uppercase">Property</th>
                <th style="padding:10px 12px;text-align:left;font-size:12px;color:#6b7280;font-weight:600;text-transform:uppercase">Closing Date</th>
                <th style="padding:10px 12px;text-align:left;font-size:12px;color:#6b7280;font-weight:600;text-transform:uppercase">Days Away</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
          <a href="https://klovex-kappa.vercel.app/dashboard" style="display:inline-block;margin-top:24px;background:#10b981;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600">View Dashboard</a>
          <p style="color:#9ca3af;font-size:12px;margin-top:32px">Klovex · AI-powered transaction coordination</p>
        </div>
      `
    })
    sent++
  }

  return NextResponse.json({ sent, message: `Sent ${sent} notification email${sent !== 1 ? 's' : ''}` })
}
