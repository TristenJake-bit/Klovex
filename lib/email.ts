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
