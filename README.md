# Klovex — AI-Powered Transaction Coordination Platform

Built with Next.js 14, Supabase, Stripe, and Resend.

---

## Quick Start (5 minutes)

### 1. Install dependencies
```bash
npm install
```

### 2. Set up Supabase
1. Go to [supabase.com](https://supabase.com) and create a new project
2. Go to **SQL Editor** and run the entire contents of `supabase-schema.sql`
3. Go to **Storage** → create a new bucket called `documents` (set to private)
4. Copy your project URL and anon key from **Settings → API**

### 3. Set up Stripe
1. Go to [dashboard.stripe.com](https://dashboard.stripe.com)
2. Get your test API keys from **Developers → API keys**
3. For webhooks: **Developers → Webhooks → Add endpoint**
   - URL: `https://yourdomain.com/api/webhooks/stripe`
   - Events: `payment_intent.succeeded`

### 4. Set up Resend
1. Go to [resend.com](https://resend.com) and create an account
2. Get your API key
3. Add your sending domain (or use the sandbox for testing)

### 5. Configure environment
```bash
cp .env.local.example .env.local
```
Fill in all values in `.env.local`

### 6. Run the app
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Making yourself an admin

After you sign up, run this in Supabase SQL Editor:
```sql
UPDATE profiles SET role = 'admin' WHERE email = 'your@email.com';
```

---

## Project structure

```
klovex/
├── app/
│   ├── page.tsx                    # Landing page
│   ├── auth/
│   │   ├── login/page.tsx          # Login
│   │   └── signup/page.tsx         # Signup
│   ├── dashboard/
│   │   ├── layout.tsx              # Dashboard shell + auth guard
│   │   ├── page.tsx                # Dashboard home
│   │   ├── transactions/
│   │   │   ├── page.tsx            # All transactions
│   │   │   ├── new/page.tsx        # Create transaction
│   │   │   └── [id]/page.tsx       # Transaction detail
│   │   └── billing/page.tsx        # Invoices + billing
│   └── api/
│       ├── stripe/
│       │   └── create-payment-intent/route.ts
│       └── webhooks/
│           └── stripe/route.ts     # Stripe webhook
├── components/
│   └── dashboard/
│       ├── Sidebar.tsx             # Navigation sidebar
│       ├── StatusUpdater.tsx       # Update transaction status
│       ├── DocumentUpload.tsx      # Upload files to Supabase storage
│       ├── InvoiceCreator.tsx      # Create Stripe invoices
│       └── TimelineNote.tsx        # Add timeline notes
├── lib/
│   ├── supabase.ts                 # Supabase client helpers
│   ├── stripe.ts                   # Stripe helpers
│   ├── email.ts                    # Resend email templates
│   └── utils.ts                    # Shared utilities + constants
├── types/
│   └── database.ts                 # TypeScript types for Supabase
└── supabase-schema.sql             # Full database schema with RLS
```

---

## Deploying to Vercel

```bash
npm install -g vercel
vercel
```

Add all `.env.local` variables to your Vercel project environment variables.
Update your Stripe webhook URL to your production domain.

---

## Day 2 — what to build next

- [ ] Documents page (`/dashboard/documents`) — all docs across transactions
- [ ] Clients management (`/dashboard/clients`) — invite clients, view their transactions  
- [ ] Settings page — update profile, change password
- [ ] Email notifications on status change (wire up `lib/email.ts`)
- [ ] Client payment page — Stripe payment form for unpaid invoices

---

Built by TristenJake LLC · DBA Klovex
