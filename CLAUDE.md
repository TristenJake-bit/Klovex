# Klovex — Claude Code Project Brief

## What is Klovex
AI-powered real estate Transaction Coordinator (TC) SaaS. TCs manage the paperwork and deadlines between buyers, sellers, agents, escrow, and lenders for real estate transactions. Klovex automates this with AI document analysis, smart checklists, and automated notifications.

## Stack
- **Frontend:** Next.js (App Router), Tailwind CSS, deployed on Vercel
- **Backend:** Supabase (auth, postgres, storage, RLS)
- **AI:** Anthropic API — model `claude-opus-4-5`
- **Payments:** Stripe ($299/mo Starter, $799/mo Growth, Custom/admin-assigned)
- **Email:** Resend (domain still verifying)
- **Repo:** github.com/TristenJake-bit/Klovex, branch: `main`
- **Live URL:** klovex-kappa.vercel.app
- **Local path:** ~/Downloads/klovex
- **Supabase project ID:** zljtzgeymmfbijcdmdxt

## Critical Coding Rules
1. **NEVER use heredoc commands** to write files — they truncate. Always write files using Python scripts.
2. **Always `await createServerClient2()`** — it is async. Never call it without await.
3. **Python script pattern for writing files:**
   ```bash
   python3 << 'PYEOF'
   with open('path/to/file.ts', 'w') as f:
       f.write("""...file content...""")
   PYEOF
   ```
4. Always check if a resource exists before inserting (avoid duplicate key 500 errors).
5. Use `(supabase as any)` when TypeScript complains about Supabase table types.

## Database Tables
- `profiles` — user profiles, plan info (plan: 'starter'|'growth'|'custom'), transaction_count
- `transactions` — main transaction records (property_address, purchase_price, closing_date, status, transaction_type: 'purchase'|'sale')
- `documents` — uploaded files linked to transactions
- `document_analyses` — AI analysis results per document (JSON blob)
- `transaction_checklists` — per-transaction task list (task, phase, category, completed, due_date, responsible)
- `timeline_events` — audit log / activity feed per transaction
- `clients` — client records linked to users

## Key File Paths
```
app/
  api/
    analyze-document/route.ts     ← AI analysis + auto-checklist + auto-complete
    generate-checklist/route.ts   ← buyer/seller checklist generator
    stripe/webhook/route.ts       ← Stripe billing webhooks
  dashboard/
    transactions/[id]/page.tsx    ← main transaction detail page (tabbed)
    page.tsx                      ← dashboard home with plan pip counter
    admin/page.tsx                ← admin console
    settings/page.tsx             ← cancellation flow + billing
    clients/page.tsx              ← clients page
lib/
  email.ts                        ← Resend email functions (sendAgentAlert, etc.)
  supabase-server.ts              ← createServerClient2() — always await this
components/
  dashboard/
    Sidebar.tsx                   ← nav with hamburger mobile drawer
```

## What's Built & Working
- Auth (sign-in, sign-up, session management)
- Transaction creation and management
- Document upload with Supabase storage + filename sanitization
- AI document analysis via Anthropic API (extracts parties, key terms, contingencies, critical dates, action items, risks)
- Auto-generates buyer or seller checklist on first document upload
- Auto-completes checklist tasks based on AI reading documents (AI returns exact task names)
- Auto-updates transaction fields (address, purchase price, closing date, status) from analysis
- Tabbed transaction detail page (Overview / Documents / Checklist / Timeline)
- 3-tier pricing: Starter $299/mo unlimited, Growth $799/mo (4tx + $249 add-on), Custom (admin-assigned)
- Plan indicator with pip counter on dashboard
- Admin console to assign plans and reset transaction counts
- Billing anniversary cron reset via pg_cron
- Stripe checkout + webhook handling
- Cancellation flow with retention incentive in Settings
- Mobile responsive with hamburger drawer
- PWA with Klovex icon
- Resend email notifications (domain still verifying)
- Multi-file upload

## What's In Progress / Next
- **Document intelligence beyond checklist:** When AI analyzes a document, it should:
  - Show an alert/banner on the transaction page with key findings
  - Email the logged-in agent with a smart summary
  - Create new checklist tasks for urgent items found
  - Log all findings to the timeline
- Fix: some documents still show "Analyze" button instead of auto-analyzing on upload
- Multi-document AI comparison feature
- Combine multiple transaction documents into one PDF with section dividers

## Transaction Types
- `purchase` → buyer-side checklist
- `sale` → seller-side checklist

## Checklist Phases (in order)
Contract Received → Disclosures → Inspections → Loan & Appraisal → Title → Pre-Closing → Closing → Post-Closing

## AI Analysis JSON Schema
The analyze-document route returns this structure from Claude:
```json
{
  "summary": "2-3 sentence summary",
  "parties": { "buyer": null, "seller": null, "buyerAgent": null, "sellerAgent": null, "titleCompany": null, "lender": null },
  "keyTerms": { "purchasePrice": null, "closingDate": null, "earnestMoney": null, "downPayment": null, "loanAmount": null, "propertyAddress": null, "propertyType": null },
  "contingencies": [{ "name": "string", "deadline": null, "status": "pending" }],
  "criticalDates": [{ "label": "string", "date": "string", "daysUntil": 0 }],
  "actionItems": [{ "priority": "high", "task": "string", "responsible": "agent" }],
  "risks": [{ "severity": "medium", "issue": "string" }],
  "documentType": "Purchase Agreement",
  "completionScore": 85,
  "completedTasks": [],
  "transactionUpdates": { "property_address": null, "purchase_price": null, "closing_date": null, "status": null }
}
```

## Email Functions (lib/email.ts)
- `sendAgentAlert({ agentEmail, agentName, propertyAddress, transactionId, risks, actionItems })`

## Environment Variables Needed
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
ANTHROPIC_API_KEY
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
RESEND_API_KEY
NEXT_PUBLIC_APP_URL
```

## Deployment
- Push to `main` branch → Vercel auto-deploys
- Vercel is connected to GitHub repo TristenJake-bit/Klovex
- Environment variables set in Vercel dashboard

## Design System
- Brand color: `text-brand-500` / `bg-brand-500` (defined in tailwind config)
- Cards use class `card` 
- Status colors defined as `STATUS_COLORS` object in transaction page
- Mobile-first, hamburger drawer on small screens
