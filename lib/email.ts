import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendTransactionCreatedEmail(
  clientEmail: string,
  clientName: string,
  propertyAddress: string,
  transactionId: string
) {
  return resend.emails.send({
    from: 'Klovex <no-reply@klovex.io>',
    to: clientEmail,
    subject: `Transaction opened: ${propertyAddress}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1D9E75;">Your transaction is open</h2>
        <p>Hi ${clientName},</p>
        <p>Your transaction coordinator has opened a file for <strong>${propertyAddress}</strong>.</p>
        <p>You can track progress, upload documents, and view deadlines in your Klovex portal.</p>
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard" 
           style="display:inline-block;background:#1D9E75;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;margin-top:16px;">
          View your transaction
        </a>
        <p style="color:#666;font-size:13px;margin-top:32px;">Klovex · Transaction Coordination</p>
      </div>
    `,
  })
}

export async function sendInvoiceEmail(
  clientEmail: string,
  clientName: string,
  propertyAddress: string,
  amountDollars: number,
  paymentUrl: string
) {
  return resend.emails.send({
    from: 'Klovex <billing@klovex.io>',
    to: clientEmail,
    subject: `Invoice for ${propertyAddress} — $${amountDollars}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1D9E75;">Invoice from Klovex</h2>
        <p>Hi ${clientName},</p>
        <p>An invoice of <strong>$${amountDollars}</strong> has been issued for transaction coordination services at <strong>${propertyAddress}</strong>.</p>
        <a href="${paymentUrl}"
           style="display:inline-block;background:#1D9E75;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;margin-top:16px;">
          Pay invoice
        </a>
        <p style="color:#666;font-size:13px;margin-top:32px;">Klovex · Transaction Coordination</p>
      </div>
    `,
  })
}

export async function sendStatusUpdateEmail(
  clientEmail: string,
  clientName: string,
  propertyAddress: string,
  newStatus: string
) {
  const statusLabels: Record<string, string> = {
    contract: 'Contract executed',
    inspection: 'Inspection period',
    appraisal: 'Appraisal ordered',
    loan_approval: 'Loan approval',
    clear_to_close: 'Clear to close',
    closing: 'Closing scheduled',
    closed: 'Closed',
  }

  return resend.emails.send({
    from: 'Klovex <no-reply@klovex.io>',
    to: clientEmail,
    subject: `Update on ${propertyAddress}: ${statusLabels[newStatus] || newStatus}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1D9E75;">Transaction update</h2>
        <p>Hi ${clientName},</p>
        <p>Your transaction at <strong>${propertyAddress}</strong> has moved to: <strong>${statusLabels[newStatus] || newStatus}</strong>.</p>
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard"
           style="display:inline-block;background:#1D9E75;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;margin-top:16px;">
          View details
        </a>
        <p style="color:#666;font-size:13px;margin-top:32px;">Klovex · Transaction Coordination</p>
      </div>
    `,
  })
}

export async function sendAgentAlert({
  agentEmail,
  agentName,
  propertyAddress,
  transactionId,
  risks,
  actionItems,
  summary,
  criticalDates,
}: {
  agentEmail: string
  agentName: string
  propertyAddress: string
  transactionId: string
  risks: { severity: string; issue: string }[]
  actionItems: { priority: string; task: string; responsible: string }[]
  summary?: string
  criticalDates?: { label: string; date: string; daysUntil: number }[]
}) {
  const highRisks = risks.filter(r => r.severity === 'high')
  const agentActions = actionItems.filter(a =>
    a.responsible?.toLowerCase().includes('agent') ||
    a.responsible?.toLowerCase().includes('listing') ||
    a.responsible?.toLowerCase().includes('buyer')
  )
  const urgentDates = (criticalDates || []).filter(d => d.daysUntil != null && d.daysUntil <= 14)

  if (highRisks.length === 0 && agentActions.length === 0 && urgentDates.length === 0) return

  const riskRows = highRisks.map(r => `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #f0f0f0">
        <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#ef4444;margin-right:8px"></span>
        ${r.issue}
      </td>
    </tr>
  `).join('')

  const actionRows = agentActions.map(a => `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #f0f0f0">
        <span style="font-size:11px;font-weight:600;color:${a.priority === 'high' ? '#ef4444' : '#f59e0b'};text-transform:uppercase;margin-right:8px">${a.priority}</span>
        ${a.task}
      </td>
    </tr>
  `).join('')

  await resend.emails.send({
    from: 'Klovex <noreply@klovex.app>',
    to: agentEmail,
    subject: `Action Required: ${propertyAddress}`,
    html: `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:600px;margin:0 auto;background:#ffffff">
        <div style="background:#1a7a52;padding:24px 32px">
          <h1 style="color:white;margin:0;font-size:20px;font-weight:600">Klovex<span style="opacity:0.7">.</span></h1>
        </div>
        <div style="padding:32px">
          <p style="color:#6b7280;font-size:14px;margin:0 0 4px">Transaction Alert</p>
          <h2 style="color:#111827;font-size:22px;margin:0 0 24px;font-weight:600">${propertyAddress}</h2>
          <p style="color:#374151;font-size:15px;line-height:1.6">Hi ${agentName || 'there'},</p>
          <p style="color:#374151;font-size:15px;line-height:1.6">Klovex AI has reviewed the uploaded document and found items that require your attention.</p>
          ${summary ? `
            <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;padding:16px 20px;margin:24px 0">
              <p style="color:#0369a1;font-weight:600;font-size:13px;text-transform:uppercase;letter-spacing:0.05em;margin:0 0 8px">AI Summary</p>
              <p style="color:#374151;font-size:14px;line-height:1.6;margin:0">${summary}</p>
            </div>
          ` : ''}
          ${urgentDates.length > 0 ? `
            <div style="background:#faf5ff;border:1px solid #e9d5ff;border-radius:8px;padding:16px 20px;margin:24px 0">
              <p style="color:#7e22ce;font-weight:600;font-size:13px;text-transform:uppercase;letter-spacing:0.05em;margin:0 0 12px">Upcoming Deadlines</p>
              <table style="width:100%;border-collapse:collapse">${urgentDates.map(d => `
                <tr>
                  <td style="padding:10px 0;border-bottom:1px solid #f0f0f0">
                    <span style="font-size:11px;font-weight:600;color:${d.daysUntil <= 3 ? '#ef4444' : d.daysUntil <= 7 ? '#f59e0b' : '#7e22ce'};margin-right:8px">${d.daysUntil <= 0 ? 'TODAY' : d.daysUntil + 'd'}</span>
                    ${d.label} — ${d.date}
                  </td>
                </tr>
              `).join('')}</table>
            </div>
          ` : ''}
          ${highRisks.length > 0 ? `
            <div style="background:#fef2f2;border:1px solid #fee2e2;border-radius:8px;padding:16px 20px;margin:24px 0">
              <p style="color:#dc2626;font-weight:600;font-size:13px;text-transform:uppercase;letter-spacing:0.05em;margin:0 0 12px">High Risk Items</p>
              <table style="width:100%;border-collapse:collapse">${riskRows}</table>
            </div>
          ` : ''}
          ${agentActions.length > 0 ? `
            <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:16px 20px;margin:24px 0">
              <p style="color:#92400e;font-weight:600;font-size:13px;text-transform:uppercase;letter-spacing:0.05em;margin:0 0 12px">Action Required From You</p>
              <table style="width:100%;border-collapse:collapse">${actionRows}</table>
            </div>
          ` : ''}
          <a href="https://klovex.app/dashboard/transactions/${transactionId}" style="display:inline-block;background:#1a7a52;color:white;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;font-size:14px;margin-top:8px">View Transaction →</a>
          <p style="color:#9ca3af;font-size:13px;margin-top:32px;padding-top:24px;border-top:1px solid #f3f4f6">This alert was generated automatically by Klovex AI.</p>
        </div>
      </div>
    `,
  })
}
