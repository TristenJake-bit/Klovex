import Link from 'next/link'
import { CheckCircle2, ArrowRight, FileText, Clock, Bell, BarChart3 } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      {/* NAV */}
      <nav className="border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <span className="font-serif text-xl">Klovex<span className="text-brand-500">.</span></span>
          <div className="hidden md:flex items-center gap-8 text-sm text-gray-500">
            <a href="#how-it-works" className="hover:text-gray-900 transition-colors">How it works</a>
            <a href="#features" className="hover:text-gray-900 transition-colors">Features</a>
            <a href="#pricing" className="hover:text-gray-900 transition-colors">Pricing</a>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/auth/login" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
              Sign in
            </Link>
            <Link href="/auth/signup" className="btn-primary">
              Get started
            </Link>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="max-w-6xl mx-auto px-6 pt-20 pb-16 grid md:grid-cols-2 gap-16 items-center">
        <div>
          <div className="inline-flex items-center gap-2 text-brand-500 text-xs font-medium uppercase tracking-widest mb-5">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-500" />
            AI-powered transaction coordination
          </div>
          <h1 className="font-serif text-5xl leading-tight tracking-tight mb-5">
            Your deals,<br />
            <em className="text-brand-500">closed on time.</em>
          </h1>
          <p className="text-gray-500 text-lg leading-relaxed mb-8 font-light">
            Klovex handles every step of your real estate transaction — deadlines, documents, communications — so you can focus on closing more deals.
          </p>
          <div className="flex items-center gap-4">
            <Link href="/auth/signup" className="btn-primary inline-flex items-center gap-2 text-base py-3 px-7">
              Start your first transaction <ArrowRight size={16} />
            </Link>
            <span className="text-sm text-gray-400">AI-powered from day one</span>
          </div>
        </div>

        {/* MOCK DASHBOARD */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <span className="font-medium text-sm">Active transactions</span>
            <span className="text-xs bg-brand-50 text-brand-600 font-medium px-2.5 py-1 rounded-full">12 active</span>
          </div>
          <div className="grid grid-cols-3 gap-3 mb-4">
            {[
              { label: 'This month', value: '$5,400', green: true },
              { label: 'Transactions', value: '12' },
              { label: 'Closing soon', value: '3' },
            ].map(s => (
              <div key={s.label} className="bg-gray-50 rounded-lg p-3">
                <div className="text-xs text-gray-400 mb-1">{s.label}</div>
                <div className={`text-xl font-medium ${s.green ? 'text-brand-500' : ''}`}>{s.value}</div>
              </div>
            ))}
          </div>
          <div className="space-y-2">
            {[
              { addr: '4821 Maple Drive', agent: 'Sarah Chen · Closes Mar 28', status: 'Closing', color: 'bg-blue-50 text-blue-600' },
              { addr: '217 Sunrise Blvd', agent: 'Marcus Rivera · Closes Apr 4', status: 'Active', color: 'bg-brand-50 text-brand-600' },
              { addr: '1039 Oak Lane #5B', agent: 'Jen Wallace · Closes Apr 11', status: 'Needs docs', color: 'bg-amber-50 text-amber-600' },
            ].map(tx => (
              <div key={tx.addr} className="flex items-center justify-between bg-white border border-gray-100 rounded-lg px-3 py-2.5">
                <div>
                  <div className="text-sm font-medium">{tx.addr}</div>
                  <div className="text-xs text-gray-400 mt-0.5">{tx.agent}</div>
                </div>
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${tx.color}`}>{tx.status}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SOCIAL PROOF */}
      <div className="border-y border-gray-100 py-8">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <div className="text-xs uppercase tracking-widest text-gray-400 mb-5">Trusted by agents at</div>
          <div className="flex flex-wrap justify-center gap-x-12 gap-y-3">
            {['Keller Williams', 'eXp Realty', 'Compass', 'RE/MAX', 'Coldwell Banker'].map(b => (
              <span key={b} className="text-sm font-medium text-gray-300">{b}</span>
            ))}
          </div>
        </div>
      </div>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-brand-500 text-xs font-medium uppercase tracking-widest mb-3">How it works</div>
        <h2 className="font-serif text-4xl tracking-tight mb-3">From contract to close,<br />we handle it all.</h2>
        <p className="text-gray-500 mb-12 max-w-lg font-light leading-relaxed">
          Submit your transaction, upload your docs, and Klovex takes it from there.
        </p>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { n: '1', title: 'Submit your transaction', body: 'Enter your property details and upload your executed contract. Klovex automatically extracts key dates and builds your timeline.' },
            { n: '2', title: 'We coordinate everything', body: 'Your dedicated TC team handles lender follow-ups, title coordination, disclosure delivery, and deadline reminders — tracked in your portal.' },
            { n: '3', title: 'Close with confidence', body: 'Get real-time status updates as your deal moves through each milestone. Stay informed without chasing anyone down.' },
          ].map(step => (
            <div key={step.n} className="card p-7">
              <div className="w-8 h-8 rounded-full bg-brand-50 text-brand-600 text-sm font-medium flex items-center justify-center mb-4">{step.n}</div>
              <h3 className="font-medium text-base mb-2">{step.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed font-light">{step.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="bg-gray-50 py-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-brand-500 text-xs font-medium uppercase tracking-widest mb-3">Features</div>
          <h2 className="font-serif text-4xl tracking-tight mb-12">Everything your TC needs.</h2>
          <div className="grid md:grid-cols-2 gap-5">
            {[
              { icon: FileText, title: 'AI document processing', body: 'Upload any contract and Klovex instantly extracts closing dates, contingency deadlines, and flags missing items.' },
              { icon: Clock, title: 'Deadline tracking', body: "Never miss a contingency date. Automated reminders go out to all parties before every critical deadline." },
              { icon: Bell, title: 'Real-time status updates', body: "Your clients see exactly where their deal stands. No more 'where are we?' calls — the portal answers everything." },
              { icon: BarChart3, title: 'Admin dashboard', body: 'See all active transactions, revenue metrics, and outstanding invoices at a glance from one command center.' },
            ].map(f => (
              <div key={f.title} className="card p-6">
                <div className="w-9 h-9 rounded-lg bg-brand-50 flex items-center justify-center mb-4">
                  <f.icon size={18} className="text-brand-500" />
                </div>
                <h3 className="font-medium mb-2">{f.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed font-light">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-brand-500 text-xs font-medium uppercase tracking-widest mb-3">Pricing</div>
        <h2 className="font-serif text-4xl tracking-tight mb-3">Simple, transparent pricing.</h2>
        <p className="text-gray-500 mb-12 font-light">Pay per transaction or lock in savings with a retainer. No setup fees.</p>
        <div className="grid md:grid-cols-3 gap-5">
          {[
            {
              name: 'Starter', price: '$350', per: 'per transaction',
              features: ['Full TC coordination', 'Document portal', 'Deadline tracking', 'Email notifications'],
              featured: false,
            },
            {
              name: 'Growth', price: '$1,800', per: 'per month · up to 6 transactions',
              features: ['Everything in Starter', 'Priority support', 'AI document extraction', 'Client-facing portal'],
              featured: true,
            },
            {
              name: 'Scale', price: '$2,400', per: 'per month · unlimited transactions',
              features: ['Everything in Growth', 'Dedicated TC manager', 'Team access', 'Custom onboarding'],
              featured: false,
            },
          ].map(plan => (
            <div key={plan.name} className={`card p-7 relative ${plan.featured ? 'ring-2 ring-brand-500' : ''}`}>
              {plan.featured && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-brand-500 text-white text-xs font-medium px-3 py-1 rounded-full whitespace-nowrap">
                  Most popular
                </div>
              )}
              <div className="text-xs uppercase tracking-widest text-gray-400 font-medium mb-2">{plan.name}</div>
              <div className="font-serif text-4xl tracking-tight mb-1">{plan.price}</div>
              <div className="text-xs text-gray-400 mb-6">{plan.per}</div>
              <ul className="space-y-3 mb-7">
                {plan.features.map(f => (
                  <li key={f} className="flex items-center gap-2.5 text-sm text-gray-600">
                    <CheckCircle2 size={15} className="text-brand-500 flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link href="/auth/signup" className={`block text-center py-2.5 rounded-lg text-sm font-medium transition-colors ${plan.featured ? 'btn-primary' : 'btn-secondary'}`}>
                Get started
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-gray-900 py-20">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-8">
          <div>
            <h2 className="font-serif text-4xl text-white tracking-tight mb-2">
              Ready to close<br /><em className="text-brand-500">without the chaos?</em>
            </h2>
            <p className="text-gray-400 font-light">Start managing transactions with AI today.</p>
          </div>
          <div className="flex gap-3 flex-shrink-0">
            <Link href="/auth/signup" className="btn-primary py-3 px-8 text-base">Get started</Link>
            <a href="mailto:hello@klovex.io" className="btn-secondary py-3 px-8 text-base bg-transparent border-gray-700 text-gray-300 hover:bg-gray-800">
              Book a demo
            </a>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-gray-100 py-8">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between text-sm">
          <span className="font-serif text-lg">Klovex<span className="text-brand-500">.</span></span>
          <span className="text-gray-400">© 2025 TristenJake LLC · DBA Klovex</span>
          <div className="flex gap-6 text-gray-400">
            <a href="#" className="hover:text-gray-600">Privacy</a>
            <a href="#" className="hover:text-gray-600">Terms</a>
            <a href="mailto:hello@klovex.io" className="hover:text-gray-600">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
