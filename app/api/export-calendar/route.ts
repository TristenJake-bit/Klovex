import { NextRequest, NextResponse } from 'next/server'
import { createServerClient2 } from '@/lib/supabase-server'
import { createClient } from '@supabase/supabase-js'
import { parseDateOnly, toDateString } from '@/lib/dates'

function formatICSDate(dateStr: string): string {
  // Convert YYYY-MM-DD to YYYYMMDD (VALUE=DATE format for all-day events)
  return dateStr.replace(/-/g, '')
}

function nextDay(dateStr: string): string {
  const d = parseDateOnly(dateStr)
  d.setDate(d.getDate() + 1)
  return toDateString(d)
}

function escapeICS(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n')
}

function foldLine(line: string): string {
  // RFC 5545: lines must not exceed 75 octets; fold with CRLF + space
  const maxLen = 75
  if (line.length <= maxLen) return line
  let result = ''
  let i = 0
  while (i < line.length) {
    if (i === 0) {
      result += line.slice(0, maxLen)
      i = maxLen
    } else {
      result += '\r\n ' + line.slice(i, i + maxLen - 1)
      i += maxLen - 1
    }
  }
  return result
}

function generateUID(transactionId: string, index: number): string {
  return `${transactionId}-${index}@klovex.app`
}

export async function GET(req: NextRequest) {
  const authClient = await createServerClient2()
  const { data: { session } } = await authClient.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const transactionId = req.nextUrl.searchParams.get('transactionId')
  if (!transactionId) return NextResponse.json({ error: 'Missing transactionId' }, { status: 400 })

  // Get transaction
  const { data: tx } = await (supabase as any)
    .from('transactions')
    .select('*')
    .eq('id', transactionId)
    .single()

  if (!tx) return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })

  // Get checklist tasks with due dates
  const { data: tasks } = await (supabase as any)
    .from('transaction_checklists')
    .select('*')
    .eq('transaction_id', transactionId)
    .not('due_date', 'is', null)
    .order('due_date', { ascending: true })

  const address = tx.property_address || 'Unknown Property'
  const shortAddress = address.split(',')[0] // First line for event titles

  // DTSTAMP is required by RFC 5545 — use current UTC time
  const now = new Date()
  const dtstamp = now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')

  const events: string[] = []
  let eventIndex = 0

  // Add closing date as an event
  if (tx.closing_date) {
    const dtStart = formatICSDate(tx.closing_date)
    const dtEnd = formatICSDate(nextDay(tx.closing_date))
    events.push([
      'BEGIN:VEVENT',
      foldLine(`UID:${generateUID(transactionId, eventIndex++)}`),
      `DTSTAMP:${dtstamp}`,
      `DTSTART;VALUE=DATE:${dtStart}`,
      `DTEND;VALUE=DATE:${dtEnd}`,
      foldLine(`SUMMARY:${escapeICS(`[Klovex] Closing — ${shortAddress}`)}`),
      foldLine(`LOCATION:${escapeICS(address)}`),
      foldLine(`DESCRIPTION:${escapeICS(`Closing date for ${address}. Purchase price: $${tx.purchase_price ? Number(tx.purchase_price).toLocaleString() : 'TBD'}`)}`),
      'STATUS:CONFIRMED',
      'BEGIN:VALARM',
      'TRIGGER:-P1D',
      'ACTION:DISPLAY',
      foldLine(`DESCRIPTION:${escapeICS(`Closing tomorrow: ${shortAddress}`)}`),
      'END:VALARM',
      'END:VEVENT',
    ].join('\r\n'))
  }

  // Add checklist task due dates as events
  if (tasks && tasks.length > 0) {
    for (const task of tasks) {
      if (!task.due_date) continue
      const dtStart = formatICSDate(task.due_date)
      const dtEnd = formatICSDate(nextDay(task.due_date))
      const title = `[Klovex] ${task.task} — ${shortAddress}`
      const desc = [
        task.task,
        `Phase: ${task.phase || 'N/A'}`,
        `Responsible: ${task.responsible || 'N/A'}`,
        `Property: ${address}`,
        task.completed ? 'Status: Completed' : 'Status: Pending',
      ].join('\\n')

      events.push([
        'BEGIN:VEVENT',
        foldLine(`UID:${generateUID(transactionId, eventIndex++)}`),
        `DTSTART;VALUE=DATE:${dtStart}`,
        `DTEND;VALUE=DATE:${dtEnd}`,
        foldLine(`SUMMARY:${escapeICS(title)}`),
        foldLine(`LOCATION:${escapeICS(address)}`),
        foldLine(`DESCRIPTION:${escapeICS(desc)}`),
        task.completed ? 'STATUS:COMPLETED' : 'STATUS:CONFIRMED',
        'BEGIN:VALARM',
        'TRIGGER:-P1D',
        'ACTION:DISPLAY',
        foldLine(`DESCRIPTION:${escapeICS(`Due tomorrow: ${task.task}`)}`),
        'END:VALARM',
        'END:VEVENT',
      ].join('\r\n'))
    }
  }

  // Build full .ics file
  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Klovex//Transaction Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    foldLine(`X-WR-CALNAME:${escapeICS(`Klovex: ${shortAddress}`)}`),
    ...events,
    'END:VCALENDAR',
  ].join('\r\n')

  // Return as downloadable .ics file
  const filename = `klovex-${shortAddress.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}.ics`

  return new NextResponse(ics, {
    status: 200,
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
