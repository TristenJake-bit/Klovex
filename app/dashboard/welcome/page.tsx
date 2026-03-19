import { createServerClient2 } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle, FileText, Brain, Clock, ArrowRight } from 'lucide-react'

export default async function WelcomePage() {
  const supabase = await createServerClient2()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/auth/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single() as any
  const { data: transactions } = await supabase.from('transactions').select('id').eq('client_id', session.user.id) as any

  // If they already have transactions, skip welcome
  if (transactions && transactions.length > 0) redirect('/dashboard')

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
      <div className="max-w-2xl w-full">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-brand-500 rounded-2xl mb-4">
            <span className="font-serif text-white text-2xl">K</span>
          </div>
          <h1 className="text-3xl font-semibold text-gray-900 mb-2">
            Welcome to Klovex{profile?.full_name ? `, ${profile.full_name.split(' ')[0]}` : ''}
          </h1>
          <p className="text-gray-500 text-lg">Your AI transaction coordinator is ready. Here's how it works:</p>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { icon: FileText, title: 'Create a transaction', body: 'Enter your property details and pay the one-time coordination fee.' },
            { icon: Brain, title: 'Upload your contract', body: 'AI instantly reads it, extracts key dates, and builds your compliance checklist.' },
            { icon: Clock, title: 'We handle the rest', body: 'Deadline reminders, document tracking, and daily status updates — all automated.' },
          ].map((step, i) => (
            <div key={i} className="card p-5">
              <div className="w-9 h-9 bg-brand-50 rounded-lg flex items-center justify-center mb-3">
                <step.icon className="w-4 h-4 text-brand-500" />
              </div>
              <p className="font-semibold text-gray-900 text-sm mb-1">{step.title}</p>
              <p className="text-gray-500 text-xs leading-relaxed">{step.body}</p>
            </div>
          ))}
        </div>

        <div className="card p-6 mb-4 border-2 border-brand-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-gray-900">Start your first transaction</p>
              <p className="text-gray-500 text-sm mt-0.5">One-time fee of $299 per transaction. No subscriptions.</p>
            </div>
            <Link href="/dashboard/transactions/new" className="btn-primary flex items-center gap-2 px-6 py-3 flex-shrink-0">
              Get started <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-gray-400 justify-center">
          <CheckCircle className="w-3.5 h-3.5 text-brand-400" />
          <span>California-compliant · AI-powered · Available 24/7</span>
        </div>

        <p className="text-center mt-4">
          <Link href="/dashboard" className="text-xs text-gray-400 hover:text-gray-600">Skip to dashboard →</Link>
        </p>
      </div>
    </div>
  )
}
