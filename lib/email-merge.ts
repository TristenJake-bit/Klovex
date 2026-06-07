import { formatDateOnly } from '@/lib/dates'

export interface MergeContext {
  transaction: {
    property_address?: string
    purchase_price?: number
    closing_date?: string
    acceptance_date?: string
    transaction_type?: string
    status?: string
    state?: string
  }
  contacts: {
    role: string
    name: string
    email?: string
    phone?: string
    company?: string
  }[]
  agentName?: string
  tcName?: string
}

const MERGE_FIELDS: Record<string, { label: string; resolve: (ctx: MergeContext) => string | null }> = {
  buyer_name: {
    label: 'Buyer Name',
    resolve: (ctx) => ctx.contacts.find(c => c.role === 'Buyer')?.name || null,
  },
  seller_name: {
    label: 'Seller Name',
    resolve: (ctx) => ctx.contacts.find(c => c.role === 'Seller')?.name || null,
  },
  buyer_agent_name: {
    label: "Buyer's Agent Name",
    resolve: (ctx) => ctx.contacts.find(c => c.role === "Buyer's Agent")?.name || null,
  },
  seller_agent_name: {
    label: "Seller's Agent Name",
    resolve: (ctx) => ctx.contacts.find(c => c.role === "Seller's Agent")?.name || null,
  },
  property_address: {
    label: 'Property Address',
    resolve: (ctx) => ctx.transaction.property_address || null,
  },
  purchase_price: {
    label: 'Purchase Price',
    resolve: (ctx) => ctx.transaction.purchase_price ? `$${Number(ctx.transaction.purchase_price).toLocaleString()}` : null,
  },
  closing_date: {
    label: 'Closing Date',
    resolve: (ctx) => ctx.transaction.closing_date ? formatDateOnly(ctx.transaction.closing_date, { month: 'long', day: 'numeric', year: 'numeric' }) : null,
  },
  acceptance_date: {
    label: 'Acceptance Date',
    resolve: (ctx) => ctx.transaction.acceptance_date ? formatDateOnly(ctx.transaction.acceptance_date, { month: 'long', day: 'numeric', year: 'numeric' }) : null,
  },
  agent_name: {
    label: 'Agent Name (you)',
    resolve: (ctx) => ctx.agentName || null,
  },
  tc_name: {
    label: 'TC Name',
    resolve: (ctx) => ctx.tcName || ctx.agentName || null,
  },
  escrow_company: {
    label: 'Escrow Company',
    resolve: (ctx) => ctx.contacts.find(c => c.role === 'Escrow Officer')?.company || null,
  },
  escrow_officer: {
    label: 'Escrow Officer Name',
    resolve: (ctx) => ctx.contacts.find(c => c.role === 'Escrow Officer')?.name || null,
  },
  lender_name: {
    label: 'Lender Name',
    resolve: (ctx) => ctx.contacts.find(c => c.role === 'Lender')?.name || null,
  },
  lender_company: {
    label: 'Lender Company',
    resolve: (ctx) => ctx.contacts.find(c => c.role === 'Lender')?.company || null,
  },
  title_company: {
    label: 'Title Company',
    resolve: (ctx) => ctx.contacts.find(c => c.role === 'Title Officer')?.company || null,
  },
  transaction_type: {
    label: 'Transaction Type',
    resolve: (ctx) => ctx.transaction.transaction_type ? ctx.transaction.transaction_type.charAt(0).toUpperCase() + ctx.transaction.transaction_type.slice(1) : null,
  },
}

export function getAvailableMergeFields(): { key: string; label: string }[] {
  return Object.entries(MERGE_FIELDS).map(([key, { label }]) => ({ key, label }))
}

export function resolveMergeFields(
  text: string,
  ctx: MergeContext,
  mode: 'preview' | 'send' = 'preview'
): { result: string; missing: string[] } {
  const missing: string[] = []

  const result = text.replace(/\{\{(\w+)\}\}/g, (match, fieldName) => {
    const field = MERGE_FIELDS[fieldName]
    if (!field) {
      missing.push(fieldName)
      return mode === 'preview' ? `<span style="background:#fef2f2;color:#dc2626;padding:2px 6px;border-radius:4px;font-weight:600">[MISSING: ${fieldName}]</span>` : `[MISSING: ${fieldName}]`
    }
    const value = field.resolve(ctx)
    if (!value) {
      missing.push(fieldName)
      return mode === 'preview' ? `<span style="background:#fef2f2;color:#dc2626;padding:2px 6px;border-radius:4px;font-weight:600">[MISSING: ${field.label}]</span>` : `[MISSING: ${field.label}]`
    }
    return value
  })

  return { result, missing }
}

export const DEFAULT_TEMPLATES = [
  {
    id: 'builtin_welcome',
    name: 'Welcome Letter',
    subject: 'Welcome to your transaction at {{property_address}}',
    body: `Hi {{buyer_name}},

Welcome! Your transaction at {{property_address}} is officially underway.

Here are the key details:
- Purchase Price: {{purchase_price}}
- Estimated Closing Date: {{closing_date}}
- Your Agent: {{agent_name}}
- Escrow: {{escrow_company}}

I'll be coordinating the paperwork, deadlines, and communications throughout the process. If you have any questions, don't hesitate to reach out.

Best regards,
{{tc_name}}`,
    builtin: true,
  },
  {
    id: 'builtin_inspection_reminder',
    name: 'Inspection Reminder',
    subject: 'Inspection Reminder — {{property_address}}',
    body: `Hi {{buyer_name}},

This is a friendly reminder that the home inspection for {{property_address}} is coming up soon.

Here are a few tips to prepare:
- Plan to attend the inspection if possible
- Prepare any questions for the inspector
- The inspection typically takes 2-3 hours

Your agent {{agent_name}} will be there to represent your interests. Please reach out if you have any questions.

Best regards,
{{tc_name}}`,
    builtin: true,
  },
  {
    id: 'builtin_contingency_removal',
    name: 'Contingency Removal Notice',
    subject: 'Contingency Removal Update — {{property_address}}',
    body: `Hi {{buyer_name}},

Good news! A contingency has been successfully removed on your transaction at {{property_address}}.

We're continuing to move forward toward your closing date of {{closing_date}}.

If you have any questions about the next steps, please don't hesitate to reach out.

Best regards,
{{tc_name}}`,
    builtin: true,
  },
  {
    id: 'builtin_closing_confirmation',
    name: 'Closing Confirmation',
    subject: 'Closing Scheduled — {{property_address}}',
    body: `Hi {{buyer_name}},

Great news! Your closing for {{property_address}} has been confirmed.

Closing Date: {{closing_date}}
Escrow: {{escrow_company}} ({{escrow_officer}})

What to bring to closing:
- Valid government-issued photo ID
- Cashier's check or wire confirmation (verify wire instructions by phone)
- Homeowners insurance proof

Please confirm your signing appointment with escrow. If you have any questions, reach out anytime.

Congratulations on your new home!

Best regards,
{{tc_name}}`,
    builtin: true,
  },
  {
    id: 'builtin_deadline_alert',
    name: 'Deadline Alert',
    subject: 'Deadline Approaching — {{property_address}}',
    body: `Hi {{buyer_name}},

This is a reminder about an upcoming deadline for your transaction at {{property_address}}.

Please ensure all required documents and actions are completed before the deadline to keep your transaction on track.

Closing Date: {{closing_date}}
Your Agent: {{agent_name}}

Please contact us immediately if you anticipate any issues meeting this deadline.

Best regards,
{{tc_name}}`,
    builtin: true,
  },
  {
    id: 'builtin_missing_document',
    name: 'Missing Document Request',
    subject: 'Document Needed — {{property_address}}',
    body: `Hi {{buyer_name}},

We're missing a required document for your transaction at {{property_address}}. To keep things on track for your closing date of {{closing_date}}, please submit the needed document as soon as possible.

If you have any questions about what's needed, please contact {{agent_name}} or reply to this email.

Thank you for your prompt attention to this matter.

Best regards,
{{tc_name}}`,
    builtin: true,
  },
  {
    id: 'builtin_post_close',
    name: 'Post-Close Follow-Up',
    subject: 'Congratulations on {{property_address}}!',
    body: `Hi {{buyer_name}},

Congratulations on the successful closing of {{property_address}}! We hope you're settling in nicely.

A few post-close reminders:
- Make sure all utilities have been transferred to your name
- File your change of address with USPS
- Keep all closing documents in a safe place

If you had a positive experience, we'd greatly appreciate a review or referral. It means the world to us!

Wishing you all the best in your new home.

Warmly,
{{tc_name}}`,
    builtin: true,
  },
  {
    id: 'builtin_team_intro',
    name: 'Transaction Team Introduction',
    subject: 'Transaction Team — {{property_address}}',
    body: `Hi everyone,

I'm pleased to introduce the transaction team for {{property_address}}:

Buyer: {{buyer_name}}
Seller: {{seller_name}}
Buyer's Agent: {{buyer_agent_name}}
Seller's Agent: {{seller_agent_name}}
Lender: {{lender_name}} ({{lender_company}})
Escrow: {{escrow_officer}} ({{escrow_company}})
Title: {{title_company}}

Purchase Price: {{purchase_price}}
Closing Date: {{closing_date}}

I'll be your transaction coordinator throughout this process. Please feel free to reach out with any questions.

Best regards,
{{tc_name}}`,
    builtin: true,
  },
]
