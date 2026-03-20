import { createServerClient2 } from "@/lib/supabase-server"
import { redirect } from "next/navigation"
import { CheckCircle, Zap } from "lucide-react"

export default async function PlansPage() {
  const supabase = await createServerClient2()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect("/auth/login")

  const plans = [
    {
      name: "Starter",
      price: "$299",
      per: "per transaction",
      description: "Pay only when you close a deal. No commitment.",
      features: ["Full AI transaction coordination","California compliance checklist","Document AI analysis","Daily email notifications","Client portal access","Unlimited document uploads"],
      cta: "Get started",
      href: "/dashboard/transactions/new",
      featured: false,
      badge: "",
    },
    {
      name: "Growth",
      price: "$799",
      per: "per month — up to 4 transactions",
      description: "Best for active agents closing 2-4 deals a month.",
      features: ["Everything in Starter","Up to 4 transactions included ($200/deal)","Priority support","Advanced AI document comparison","Custom branding on client portal","Monthly performance report"],
      cta: "Contact us to upgrade",
      href: "mailto:hello@klovex.app?subject=Growth Plan",
      featured: true,
      badge: "Most popular",
    },
    {
      name: "Scale",
      price: "$1,499",
      per: "per month — up to 15 transactions",
      description: "For high-volume agents and small teams.",
      features: ["Everything in Growth","Up to 15 transactions included ($100/deal)","Team access up to 3 seats","Dedicated account manager","Custom checklist templates","API access"],
      cta: "Contact us to upgrade",
      href: "mailto:hello@klovex.app?subject=Scale Plan",
      featured: false,
      badge: "",
    },
    {
      name: "Brokerage",
      price: "Custom",
      per: "tailored to your volume",
      description: "For brokerages and teams doing 15+ deals a month.",
      features: ["Everything in Scale","Unlimited transactions","Unlimited seats","White-label option","Custom state compliance","Onboarding and training"],
      cta: "Schedule a call",
      href: "mailto:hello@klovex.app?subject=Brokerage Plan",
      featured: false,
      badge: "Enterprise",
    },
  ]

  return (
    <div className="p-8 max-w-6xl">
      <div className="mb-10">
        <h1 className="text-2xl font-semibold text-gray-900">Plans and Pricing</h1>
        <p className="text-gray-400 text-sm mt-1">Simple, transparent pricing. No hidden fees.</p>
      </div>

      <div className="grid grid-cols-2 gap-5 mb-8">
        {plans.map((plan) => (
          <div key={plan.name} className={"card p-6 relative flex flex-col " + (plan.featured ? "ring-2 ring-brand-500" : "")}>
            {plan.badge && (
              <div className={"absolute -top-3 left-6 text-xs font-semibold px-3 py-1 rounded-full " + (plan.featured ? "bg-brand-500 text-white" : "bg-gray-900 text-white")}>
                {plan.badge}
              </div>
            )}
            <div className="mb-4">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1">{plan.name}</p>
              <p className="text-3xl font-bold text-gray-900 mb-1">{plan.price}</p>
              <p className="text-xs text-gray-400">{plan.per}</p>
              <p className="text-sm text-gray-500 mt-2">{plan.description}</p>
            </div>
            <ul className="space-y-2.5 mb-6 flex-1">
              {plan.features.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm text-gray-600">
                  <CheckCircle className="w-4 h-4 text-brand-500 flex-shrink-0 mt-0.5" />
                  {f}
                </li>
              ))}
            </ul>
            <a href={plan.href} className={"block text-center py-2.5 rounded-lg text-sm font-semibold transition-colors " + (plan.featured ? "btn-primary" : "btn-secondary")}>
              {plan.cta}
            </a>
          </div>
        ))}
      </div>

      <div className="card p-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Zap className="w-5 h-5 text-brand-500" />
          <div>
            <p className="text-sm font-semibold text-gray-900">Need a custom plan?</p>
            <p className="text-xs text-gray-400">Doing more than 15 transactions a month? We will build a plan around your volume.</p>
          </div>
        </div>
        <a href="mailto:hello@klovex.app?subject=Custom Plan" className="btn-primary text-sm px-5 py-2 flex-shrink-0">
          Talk to us
        </a>
      </div>
    </div>
  )
}
