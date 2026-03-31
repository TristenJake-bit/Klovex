# Klovex — Claude Code Master Brief

## What is Klovex
AI-powered real estate Transaction Coordinator (TC) SaaS. Klovex replaces or supercharges a human TC — the person who manages all the paperwork, deadlines, communications, and compliance between buyers, sellers, agents, lenders, escrow officers, title companies, and inspectors from contract to close. A typical transaction has 40+ documents, 10-15 parties, and 198 tasks bound by strict legal deadlines. Klovex automates this entire workflow with AI.

**The TC's core job:**
- Never miss a deadline (inspections, contingency removals, loan approval, closing)
- Keep all parties informed and aligned at all times
- Catch missing signatures, errors, compliance issues before they become problems
- Be the calm, organized hub that prevents deals from falling apart

**Klovex's edge over Dotloop, SkySlope, Paperless Pipeline:**
- AI reads and understands documents — not just stores them
- Auto-generates checklists, marks tasks complete, creates new tasks from document content
- Proactive alerts without manual setup
- Built for solo TCs and small teams, not enterprise brokerages

---

## Stack
- **Frontend:** Next.js (App Router), Tailwind CSS, deployed on Vercel
- **Backend:** Supabase (auth, postgres, storage, RLS)
- **AI:** Anthropic API — always use model `claude-opus-4-5`
- **Payments:** Stripe
- **Email:** Resend (domain verifying)
- **Repo:** github.com/TristenJake-bit/Klovex, branch: `main`
- **Live:** klovex-kappa.vercel.app
- **Local:** ~/Downloads/klovex
- **Supabase project ID:** zljtzgeymmfbijcdmdxt

---

## Critical Coding Rules
1. **NEVER use heredoc commands** to write files — they truncate. Always use Python scripts.
2. **Always `await createServerClient2()`** — it is async, never skip the await.
3. **Always check if a resource exists before inserting** — avoid duplicate key 500 errors.
4. **Use `(supabase as any)`** when TypeScript complains about table types.
5. After writing files always run: `npx tsc --noEmit --pretty 2>&1 | head -20` to check for errors.
6. Push with: `git add -A && git commit -m "description" && git push`

---

## Database Tables
- `profiles` — user profiles, plan (starter/growth/custom), transaction_count, full_name, email
- `transactions` — property_address, purchase_price, closing_date, acceptance_date, status, transaction_type (purchase/sale), year_built, has_hoa, is_septic
- `documents` — file uploads linked to transactions, file_name, file_url, transaction_id
- `document_analyses` — AI analysis JSON per document, document_id, analysis, analyzed_at
- `transaction_checklists` — task, phase, category, responsible, due_date, completed, completed_at, transaction_id, required
- `timeline_events` — type, content, author_id, transaction_id, created_at
- `clients` — client records linked to users
- `transaction_contacts` — per-transaction party contacts (role, name, email, phone, company)

---

## Key File Paths
```
app/
  api/
    analyze-document/route.ts       ← AI analysis + auto-checklist + auto-complete + timeline
    generate-checklist/route.ts     ← buyer/seller checklist generator (checks for existing first)
    stripe/webhook/route.ts         ← Stripe billing
  dashboard/
    transactions/[id]/page.tsx      ← tabbed transaction detail (Overview/Documents/Checklist/Timeline)
    page.tsx                        ← dashboard home with plan pip counter
    admin/page.tsx                  ← admin console
    settings/page.tsx               ← cancellation + billing
    clients/page.tsx                ← clients management
lib/
  email.ts                          ← Resend email functions
  supabase-server.ts                ← createServerClient2() — ALWAYS await this
components/
  dashboard/
    Sidebar.tsx                     ← nav + hamburger mobile drawer
```

---

## What's Built & Working
- Auth, transactions CRUD, document upload with filename sanitization
- AI document analysis via Anthropic API
- AI auto-generates buyer/seller checklist on first document upload
- AI marks completed checklist tasks using exact task names
- Auto-updates transaction fields from document analysis
- Tabbed transaction detail page (Overview / Documents / Checklist / Timeline)
- Alert banner on transaction page after analysis (risks, dates, action items)
- Timeline logging for AI events (ai_analysis, ai_risk, ai_deadline, ai_action)
- Richer agent emails with AI summary + upcoming deadlines
- Contacts/Parties Manager — per-transaction contact directory with CRUD, inline edit, role badges
- 3-tier pricing: Starter $299/mo, Growth $799/mo, Custom
- Plan indicator, admin console, Stripe billing, cancellation retention flow
- Mobile responsive, PWA

---

## AI Analysis JSON Schema
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

---

## Checklist Phases (in order)
Contract Received → Disclosures → Inspections → Loan & Appraisal → Title → Pre-Closing → Closing → Post-Closing

---

## TC INDUSTRY KNOWLEDGE
*(Research-backed. Every feature decision should align with these real TC workflows.)*

### What the Best TCs Do
1. **Proactive communication** — send updates before parties have to ask. Never reactive.
2. **Milestone emails** — dedicated message at each phase transition (contract received, disclosures sent, inspection scheduled, contingency removed, clear to close, closed)
3. **Deadline warnings** — alert 3 days before AND 1 day before every critical deadline
4. **Document completeness checks** — flag missing initials, wrong dates, blank required fields before sending to parties
5. **Party contact database** — store escrow officer, title rep, lender, inspector contact info per transaction so communication is instant
6. **30/60/90 day post-close follow-up** — check in after closing for referrals and reviews
7. **Template-driven comms** — professional, consistent emails for every scenario. Top TCs save 2-3 hours/day using templates

### Communication Templates Every TC Uses
1. **Welcome letter** (buyer or seller) — day 1, escrow info and what to expect
2. **Transaction team intro** — sent to all parties (agents, lender, escrow)
3. **Inspection reminder** — 2 days before with prep tips
4. **Contingency removal notice** — when each contingency clears
5. **Deadline alert** — 3 days and 1 day before each deadline
6. **Loan status update** — conditional approval, clear to close
7. **Closing confirmation** — date/time/location, what to bring
8. **Closing congratulations** — sent same day as close
9. **Post-close follow-up** — 30 days after, ask for review/referral
10. **Missing document request** — polite but urgent

### Deadline Urgency System
- 🔴 Red — overdue or due today
- 🟠 Orange — due within 3 days
- 🟡 Yellow — due within 7 days
- 🟢 Green — on track

### Document Types TCs Handle
Purchase Agreement (RPA), Counter Offers, Addenda, Natural Hazard Disclosure (NHD), Transfer Disclosure Statement (TDS), Seller Property Questionnaire (SPQ), Agent Visual Inspection Disclosure (AVID), SBSA, MCA, Lead-Based Paint Disclosure, Home Inspection Report, Pest/Termite Report, Preliminary Title Report, HOA Documents, Appraisal Report, Loan Documents, Closing Disclosure (CD), Settlement Statement, Commission Instructions, Home Warranty

### Party Contact Roles Per Transaction
Buyer, Seller, Buyer's Agent, Seller's Agent (Listing Agent), Lender/Loan Officer, Escrow Officer, Title Officer, Home Inspector, Pest Inspector, Appraiser, HOA Management (if applicable)

---

## PRODUCT ROADMAP
*(Priority ordered. Build one at a time.)*

### 🔴 HIGH PRIORITY — Build These Next

#### 1. Contacts/Parties Manager (per transaction)
Store all party contact info per transaction.
- Add a "Contacts" section to the Overview tab
- Roles: Buyer, Seller, Buyer's Agent, Seller's Agent, Lender, Escrow Officer, Title Officer, Inspector, Appraiser, HOA
- Fields: name, role, email, phone, company
- New Supabase table: `transaction_contacts` (id, transaction_id, role, name, email, phone, company, created_at)
- Used later to auto-populate email templates

#### 2. Deadline Dashboard (Overview tab)
Visual urgency-coded deadline tracker on the Overview tab.
- Show all incomplete checklist tasks sorted by due_date
- Color coded: red (overdue/today), orange (≤3 days), yellow (≤7 days), green (on track)
- Show days until due next to each task
- Progress bar showing % of transaction complete (completed tasks / total tasks)
- Click task to mark complete inline

#### 3. Automated Deadline Reminder Emails (cron)
Daily cron that emails the agent about deadlines coming up.
- Vercel cron job hitting `/api/cron/deadline-reminders` daily at 8am
- Query all incomplete checklist tasks with due_date within 3 days across all transactions
- Send one digest email per user: "You have [N] deadlines in the next 3 days"
- List each deadline with property address, task name, due date, days remaining
- Also log a timeline event when reminder is sent
- Add to vercel.json: `{ "crons": [{ "path": "/api/cron/deadline-reminders", "schedule": "0 8 * * *" }] }`

#### 4. Email Template System
Pre-built emails auto-sent at key transaction milestones.
- Welcome email auto-sent when transaction is created (to agent)
- Closing confirmation auto-sent when status changes to 'closing'
- Post-close follow-up queued for 30 days after closing_date
- Templates stored in lib/email-templates.ts as typed functions
- Each template takes transaction data and party contact data as params

#### 5. Document Completeness Checker
AI checks uploaded documents for issues.
- Add `completenessIssues` array to AI analysis schema: `[{ "type": "missing_signature"|"missing_date"|"blank_field"|"inconsistency", "description": "string", "severity": "high"|"medium" }]`
- Show issues as warning badges on document cards in Documents tab
- If high severity issues found, add to alert banner on transaction page

### 🟡 MEDIUM PRIORITY

#### 6. Transaction Status Auto-Progression
Suggest status changes when milestone tasks are complete.
- When all "Contract Received" phase tasks complete → banner: "Ready to advance to Inspection phase?"
- When inspection contingency removed → suggest 'loan' status
- When clear to close → suggest 'closing' status
- One-click confirm to update status

#### 7. Multi-Document AI Comparison
Cross-reference multiple documents for discrepancies.
- "Compare Documents" button in Documents tab
- AI reads all analyzed documents and flags inconsistencies (different prices, dates, party names)
- Returns `discrepancies` array with what doesn't match between which documents
- Route: `/api/compare-documents`

#### 8. Transaction Party Portal (read-only shareable link)
Shareable link for parties to check transaction status without logging in.
- Secure token-based URL: `/portal/[token]`
- Shows: current status, upcoming deadlines, document checklist status (no sensitive content)
- No login required
- Table: `transaction_tokens` (transaction_id, token, expires_at)
- Generate token button on Overview tab

#### 9. Commission & Fee Tracker
Per-transaction financial tracking.
- TC fee, agent commissions, escrow fees, title fees
- Track paid vs unpaid
- Monthly revenue summary on dashboard
- Table: `transaction_fees` (transaction_id, type, label, amount, paid, paid_at)

### 🟢 FUTURE

#### 10. Post-Close Follow-Up Automation
30 days after closing_date: auto-send "How's the new home?" email asking for review/referral.

#### 11. E-Signature Integration
Send documents for signature via DocuSign/HelloSign. Track status. Auto-complete checklist tasks when signed.

#### 12. MLS Data Pull
When address entered, auto-populate year built, property type, HOA status from MLS/Zillow API.

#### 13. Broker Compliance Mode
Broker oversight dashboard, audit trails, role-based permissions (TC / Agent / Broker).

---

## Email Functions (lib/email.ts)
```typescript
sendAgentAlert({
  agentEmail, agentName, propertyAddress, transactionId,
  risks, actionItems, summary?, criticalDates?
})
```

---

## Design System
- Brand color: `text-brand-500` / `bg-brand-500`
- Cards: `card` class
- Status colors: `STATUS_COLORS` object in transaction page
- Mobile-first, hamburger drawer on small screens
- Alert banners: orange gradient for warnings
- Tailwind CSS only — no custom CSS files

---

## Environment Variables
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

---

## Deploy
```bash
git add -A && git commit -m "feat: description" && git push
```
Vercel auto-deploys on push to `main`. Live at klovex-kappa.vercel.app after ~2 min.
