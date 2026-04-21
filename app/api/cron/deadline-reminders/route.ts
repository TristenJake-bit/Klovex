import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
const resend = new Resend(process.env.RESEND_API_KEY)

export async function GET(req: Request) {
  // Verify cron secret in production (Vercel sets this header)
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}` && process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const threeDaysOut = new Date(today)
  threeDaysOut.setDate(threeDaysOut.getDate() + 3)

  // Get all incomplete checklist tasks with due_date within 3 days (including overdue)
  const { data: tasks, error: taskError } = await (supabase as any)
    .from('transaction_checklists')
    .select('*, transactions!inner(id, property_address, user_id)')
    .eq('completed', false)
    .not('due_date', 'is', null)
    .lte('due_date', threeDaysOut.toISOString().split('T')[0])
    .order('due_date', { ascending: true })

  if (taskError) {
    console.error('Failed to query tasks:', taskError)
    return NextResponse.json({ error: 'Failed to query tasks' }, { status: 500 })
  }

  if (!tasks || tasks.length === 0) {
    return NextResponse.json({ message: 'No upcoming deadlines', sent: 0 })
  }

  // Group tasks by user_id
  const byUser: Record<string, { email: string; name: string; deadlines: any[] }> = {}

  for (const task of tasks) {
    const userId = task.transactions.user_id
    if (!userId) continue

    if (!byUser[userId]) {
      // Fetch user profile
      const { data: profile } = await (supabase as any)
        .from('profiles')
        .select('email, full_name')
        .eq('id', userId)
        .single()

      if (!profile?.email) continue
      byUser[userId] = { email: profile.email, name: profile.full_name || 'there', deadlines: [] }
    }

    const dueDate = new Date(task.due_date)
    dueDate.setHours(0, 0, 0, 0)
    const daysUntil = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

    byUser[userId].deadlines.push({
      task: task.task,
      phase: task.phase,
      propertyAddress: task.transactions.property_address,
      transactionId: task.transactions.id,
      dueDate: task.due_date,
      daysUntil,
    })
  }

  // Send one digest email per user
  let sent = 0
  for (const [userId, userData] of Object.entries(byUser)) {
    const { email, name, deadlines } = userData

    const deadlineRows = deadlines.map(d => {
      const urgencyColor = d.daysUntil <= 0 ? '#ef4444' : d.daysUntil <= 1 ? '#f97316' : d.daysUntil <= 3 ? '#f59e0b' : '#22c55e'
      const urgencyLabel = d.daysUntil < 0 ? `${Math.abs(d.daysUntil)}d overdue` : d.daysUntil === 0 ? 'Due today' : `${d.daysUntil}d left`
      const formattedDate = new Date(d.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      return `
        <tr>
          <td style="padding:14px 16px;border-bottom:1px solid #f3f4f6">
            <div style="margin-bottom:4px">
              <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${urgencyColor};margin-right:8px;vertical-align:middle"></span>
              <strong style="color:#111827;font-size:14px">${d.task}</strong>
            </div>
            <div style="padding-left:18px;color:#6b7280;font-size:13px">
              ${d.propertyAddress} &middot; ${d.phase} &middot; ${formattedDate}
              <span style="color:${urgencyColor};font-weight:600;margin-left:8px">${urgencyLabel}</span>
            </div>
          </td>
        </tr>`
    }).join('')

    const overdueCount = deadlines.filter(d => d.daysUntil < 0).length
    const todayCount = deadlines.filter(d => d.daysUntil === 0).length
    const subjectParts: string[] = []
    if (overdueCount > 0) subjectParts.push(`${overdueCount} overdue`)
    if (todayCount > 0) subjectParts.push(`${todayCount} due today`)
    const upcomingCount = deadlines.length - overdueCount - todayCount
    if (upcomingCount > 0) subjectParts.push(`${upcomingCount} upcoming`)
    const subject = `Deadline Alert: ${subjectParts.join(', ')} — ${deadlines.length} task${deadlines.length === 1 ? '' : 's'} need attention`

    try {
      await resend.emails.send({
        from: 'Klovex <onboarding@resend.dev>',
        to: email,
        subject,
        html: `
          <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:600px;margin:0 auto;background:#ffffff">
            <div style="background:#1a7a52;padding:24px 32px">
              <h1 style="color:white;margin:0;font-size:20px;font-weight:600">Klovex</h1>
            </div>
            <div style="padding:32px">
              <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 8px">Hi ${name},</p>
              <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 24px">
                You have <strong>${deadlines.length} deadline${deadlines.length === 1 ? '' : 's'}</strong> coming up in the next 3 days.
              </p>
              <table style="width:100%;border-collapse:collapse;background:#fafafa;border-radius:8px;overflow:hidden">
                <tr><td style="padding:12px 16px;background:#f3f4f6"><strong style="color:#374151;font-size:12px;text-transform:uppercase;letter-spacing:0.05em">Upcoming Deadlines</strong></td></tr>
                ${deadlineRows}
              </table>
              <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://klovex-kappa.vercel.app'}/dashboard"
                style="display:inline-block;background:#1a7a52;color:white;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;font-size:14px;margin-top:24px">
                View Dashboard
              </a>
              <p style="color:#9ca3af;font-size:13px;margin-top:32px;padding-top:24px;border-top:1px solid #f3f4f6">
                Daily deadline digest from Klovex AI.
              </p>
            </div>
          </div>
        `,
      })
      sent++

      // Log timeline events for each transaction that had deadlines
      const txIds = [...new Set(deadlines.map(d => d.transactionId))]
      for (const txId of txIds) {
        const txDeadlines = deadlines.filter(d => d.transactionId === txId)
        await (supabase as any).from('timeline_events').insert({
          transaction_id: txId,
          author_id: userId,
          type: 'system',
          content: `Deadline reminder sent: ${txDeadlines.length} task${txDeadlines.length === 1 ? '' : 's'} due within 3 days`,
        })
      }
    } catch (err) {
      console.error(`Failed to send digest to ${email}:`, err)
    }
  }

  return NextResponse.json({ message: `Sent ${sent} digest email(s)`, sent, totalDeadlines: tasks.length })
}
