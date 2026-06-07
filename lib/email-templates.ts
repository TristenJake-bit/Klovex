import { Resend } from 'resend'
import { formatDateOnly } from '@/lib/dates'

const resend = new Resend(process.env.RESEND_API_KEY)

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://klovex-kappa.vercel.app'

function emailWrapper(title: string, body: string) {
  return `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:600px;margin:0 auto;background:#ffffff">
      <div style="background:#1a7a52;padding:24px 32px">
        <h1 style="color:white;margin:0;font-size:20px;font-weight:600">Klovex</h1>
      </div>
      <div style="padding:32px">
        <h2 style="color:#111827;font-size:20px;margin:0 0 24px;font-weight:600">${title}</h2>
        ${body}
        <p style="color:#9ca3af;font-size:13px;margin-top:32px;padding-top:24px;border-top:1px solid #f3f4f6">
          Klovex · AI-Powered Transaction Coordination
        </p>
      </div>
    </div>
  `
}

interface TransactionData {
  id: string
  property_address: string
  transaction_type?: string
  purchase_price?: number
  closing_date?: string
  status?: string
}

interface ContactData {
  role: string
  name: string
  email?: string
  phone?: string
  company?: string
}

export async function sendWelcomeEmail({
  agentEmail,
  agentName,
  transaction,
  contacts,
}: {
  agentEmail: string
  agentName: string
  transaction: TransactionData
  contacts?: ContactData[]
}) {
  const closingLine = transaction.closing_date
    ? `<tr><td style="padding:8px 0;color:#6b7280;font-size:14px">Estimated Close</td><td style="padding:8px 0;font-size:14px;font-weight:600;text-align:right">${formatDateOnly(transaction.closing_date!, { month: 'long', day: 'numeric', year: 'numeric' })}</td></tr>`
    : ''
  const priceLine = transaction.purchase_price
    ? `<tr><td style="padding:8px 0;color:#6b7280;font-size:14px">Purchase Price</td><td style="padding:8px 0;font-size:14px;font-weight:600;text-align:right">$${Number(transaction.purchase_price).toLocaleString()}</td></tr>`
    : ''

  const contactRows = (contacts || []).filter(c => c.name).map(c =>
    `<tr><td style="padding:6px 0;color:#6b7280;font-size:13px">${c.role}</td><td style="padding:6px 0;font-size:13px;text-align:right">${c.name}${c.company ? ` · ${c.company}` : ''}</td></tr>`
  ).join('')

  const body = `
    <p style="color:#374151;font-size:15px;line-height:1.6">Hi ${agentName},</p>
    <p style="color:#374151;font-size:15px;line-height:1.6">Your transaction file has been opened for <strong>${transaction.property_address}</strong>. Klovex AI is now actively monitoring deadlines, documents, and compliance for this ${transaction.transaction_type || 'transaction'}.</p>
    <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px 20px;margin:24px 0">
      <p style="color:#374151;font-weight:600;font-size:13px;text-transform:uppercase;letter-spacing:0.05em;margin:0 0 12px">Transaction Details</p>
      <table style="width:100%;border-collapse:collapse">
        <tr><td style="padding:8px 0;color:#6b7280;font-size:14px">Property</td><td style="padding:8px 0;font-size:14px;font-weight:600;text-align:right">${transaction.property_address}</td></tr>
        <tr><td style="padding:8px 0;color:#6b7280;font-size:14px">Type</td><td style="padding:8px 0;font-size:14px;font-weight:600;text-align:right;text-transform:capitalize">${transaction.transaction_type || 'Purchase'}</td></tr>
        ${priceLine}
        ${closingLine}
      </table>
    </div>
    ${contactRows ? `
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px 20px;margin:24px 0">
      <p style="color:#166534;font-weight:600;font-size:13px;text-transform:uppercase;letter-spacing:0.05em;margin:0 0 12px">Transaction Parties</p>
      <table style="width:100%;border-collapse:collapse">${contactRows}</table>
    </div>
    ` : ''}
    <p style="color:#374151;font-size:15px;line-height:1.6"><strong>What happens next:</strong></p>
    <ul style="color:#374151;font-size:14px;line-height:1.8;padding-left:20px">
      <li>Upload documents — AI will analyze them instantly</li>
      <li>Your checklist will auto-generate on first document upload</li>
      <li>Deadlines are tracked and you'll get reminder emails</li>
    </ul>
    <a href="${APP_URL}/dashboard/transactions/${transaction.id}" style="display:inline-block;background:#1a7a52;color:white;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;font-size:14px;margin-top:16px">View Transaction</a>
  `

  return resend.emails.send({
    from: 'Klovex <onboarding@resend.dev>',
    to: agentEmail,
    subject: `Transaction Opened: ${transaction.property_address}`,
    html: emailWrapper('Transaction File Opened', body),
  })
}

export async function sendClosingConfirmationEmail({
  agentEmail,
  agentName,
  transaction,
  contacts,
}: {
  agentEmail: string
  agentName: string
  transaction: TransactionData
  contacts?: ContactData[]
}) {
  const closingDate = transaction.closing_date
    ? formatDateOnly(transaction.closing_date!, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
    : 'TBD'

  const partyList = (contacts || []).filter(c => c.name && c.email).map(c =>
    `<tr><td style="padding:6px 0;color:#6b7280;font-size:13px">${c.role}</td><td style="padding:6px 0;font-size:13px">${c.name}</td><td style="padding:6px 0;font-size:13px;text-align:right">${c.email || ''}</td></tr>`
  ).join('')

  const body = `
    <p style="color:#374151;font-size:15px;line-height:1.6">Hi ${agentName},</p>
    <p style="color:#374151;font-size:15px;line-height:1.6">Great news! The transaction at <strong>${transaction.property_address}</strong> has moved to the <strong>Closing</strong> phase.</p>
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:20px;margin:24px 0;text-center">
      <p style="color:#166534;font-weight:600;font-size:13px;text-transform:uppercase;letter-spacing:0.05em;margin:0 0 8px">Closing Date</p>
      <p style="color:#111827;font-size:22px;font-weight:700;margin:0">${closingDate}</p>
    </div>
    <p style="color:#374151;font-size:15px;line-height:1.6"><strong>Closing checklist reminders:</strong></p>
    <ul style="color:#374151;font-size:14px;line-height:1.8;padding-left:20px">
      <li>Confirm signing appointments are scheduled with escrow/notary</li>
      <li>Verify wire instructions with escrow officer via phone</li>
      <li>Ensure buyer has completed final walkthrough</li>
      <li>Confirm loan has funded (if applicable)</li>
      <li>Prepare to verify deed recording with county recorder</li>
    </ul>
    ${partyList ? `
    <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px 20px;margin:24px 0">
      <p style="color:#374151;font-weight:600;font-size:13px;text-transform:uppercase;letter-spacing:0.05em;margin:0 0 12px">Key Contacts for Closing</p>
      <table style="width:100%;border-collapse:collapse">${partyList}</table>
    </div>
    ` : ''}
    <a href="${APP_URL}/dashboard/transactions/${transaction.id}" style="display:inline-block;background:#1a7a52;color:white;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;font-size:14px;margin-top:16px">View Transaction</a>
  `

  return resend.emails.send({
    from: 'Klovex <onboarding@resend.dev>',
    to: agentEmail,
    subject: `Closing Confirmed: ${transaction.property_address}`,
    html: emailWrapper('Closing Phase Confirmed', body),
  })
}

export async function sendPostCloseFollowUpEmail({
  agentEmail,
  agentName,
  transaction,
}: {
  agentEmail: string
  agentName: string
  transaction: TransactionData
}) {
  const body = `
    <p style="color:#374151;font-size:15px;line-height:1.6">Hi ${agentName},</p>
    <p style="color:#374151;font-size:15px;line-height:1.6">It's been 30 days since the closing at <strong>${transaction.property_address}</strong>. We hope everything went smoothly!</p>
    <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:20px;margin:24px 0">
      <p style="color:#1e40af;font-weight:600;font-size:14px;margin:0 0 12px">Post-Close Reminders</p>
      <ul style="color:#374151;font-size:14px;line-height:1.8;padding-left:20px;margin:0">
        <li>Confirm all final documents are uploaded and filed</li>
        <li>Verify the complete transaction file has been submitted to your broker</li>
        <li>This is a great time to reach out to your client for a review or referral</li>
        <li>Check that the home warranty is active (if purchased)</li>
      </ul>
    </div>
    <p style="color:#374151;font-size:15px;line-height:1.6">Asking for a review within 30 days of closing leads to 3x more responses. A quick call or text goes a long way!</p>
    <a href="${APP_URL}/dashboard/transactions/${transaction.id}" style="display:inline-block;background:#1a7a52;color:white;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;font-size:14px;margin-top:16px">View Transaction</a>
  `

  return resend.emails.send({
    from: 'Klovex <onboarding@resend.dev>',
    to: agentEmail,
    subject: `30-Day Follow-Up: ${transaction.property_address}`,
    html: emailWrapper('Post-Close Follow-Up', body),
  })
}
