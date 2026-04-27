import { createServerClient2 } from "@/lib/supabase-server"
import { redirect } from "next/navigation"
import { CheckCircle, Zap, Plus, Lock } from "lucide-react"

export default async function PlansPage() {
  const supabase = await createServerClient2()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect("/auth/login")

  const plans = [
    {
      name: "Starter",
      price: "$299",
      per: "per month",
      description: "Unlimited transactions at a flat monthly rate. Perfect for agents getting started.",
      features: [
        "Unlimited transactions included",
        "Full AI transaction coordination",
        "California compliance checklist",
        "Document AI analysis",
        "Daily email notifications",
        "Unlimited document uploads",
      ],
      addOn: null as string | null,
      cta: "Get started",
      href: "/dashboard/billing",
      featured: false,
      badge: "",
      locked: false,
    },
    {
      name: "Growth",
      price: "$799",
      per: "per month",
      description: "4 transactions included. Add more as you close, cheaper per deal than Starter.",
      features: [
        "4 transactions included (~$200/deal)",
        "Additional transactions at $249 each",
        "Everything in Starter",
        "Priority support",
        "Advanced AI document comparison",
        "Monthly performance report",
      ],
      addOn: "$249 per additional transaction" as string | null,
      cta: "Upgrade to Growth",
      href: "/dashboard/billing",
      featured: true,
      badge: "Most popular",
      locked: false,
    },
    {
      name: "Custom",
      price: "Talk to us",
      per: "built around your volume",
      description: "For high-volume agents and brokerages. Pricing and features tailored to you.",
      features: [] as string[],
      addOn: null as string | null,
      cta: "Book a call",
      href: "mailto:support@klovex.app?subject=Custom Plan",
      featured: false,
      badge: "High volume",
      locked: true,
    },
  ]

  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-10">
        <h1 className="text-2xl font-semibold text-gray-900">Plans and Pricing</h1>
        <p className="text-gray-400 text-sm mt-1">Simple, transparent pricing. All plans are monthly and cancel anytime.</p>
      </div>

      <div className="grid grid-cols-3 gap-5 mb-8">
        {plans.map((plan) => {
          const cardClass = plan.featured
            ? "card p-6 relative flex flex-col ring-2 ring-brand-500"
            : "card p-6 relative flex flex-col"
          const badgeClass = plan.featured
            ? "absolute -top-3 left-6 text-xs font-semibold px-3 py-1 rounded-full bg-brand-500 text-white"
            : "absolute -top-3 left-6 text-xs font-semibold px-3 py-1 rounded-full bg-gray-900 text-white"
          const ctaClass = plan.featured
            ? "block text-center py-2.5 rounded-lg text-sm font-semibold transition-colors btn-primary"
            : "block text-center py-2.5 rounded-lg text-sm font-semibold transition-colors btn-secondary"
          return (
            <div key={plan.name} className={cardClass}>
              {plan.badge && (
                <div className={badgeClass}>
                  {plan.badge}
                </div>
              )}

              <div className="mb-5">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">{plan.name}</p>
                <p className="text-3xl font-bold text-gray-900">{plan.price}</p>
                <p className="text-xs text-gray-400 mt-0.5">{plan.per}</p>
                <p className="text-sm text-gray-500 mt-3 leading-relaxed">{plan.description}</p>
              </div>

              {plan.locked ? (
                <div className="flex-1 flex flex-col items-center justify-center py-8 mb-5 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                  <Lock className="w-6 h-6 text-gray-300 mb-3" />
                  <p className="text-sm font-medium text-gray-400">Details revealed on call</p>
                  <p className="text-xs text-gray-300 mt-1 text-center px-4">Tailored pricing and features built around your business</p>
                </div>
              ) : (
                <>
                  <ul className="space-y-2.5 mb-5 flex-1">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2.5 text-sm text-gray-600">
                        <CheckCircle className="w-4 h-4 text-brand-500 flex-shrink-0 mt-0.5" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  {plan.addOn && (
                    <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2 mb-5">
                      <Plus className="w-3.5 h-3.5 text-brand-400 flex-shrink-0" />
                      {plan.addOn}
                    </div>
                  )}
                </>
              )}

              <a href={plan.href} className={ctaClass}>
                {plan.cta}
              </a>
            </div>
          )
        })}
      </div>

      <div className="card p-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Zap className="w-5 h-5 text-brand-500" />
          <div>
            <p className="text-sm font-semibold text-gray-900">Need the Custom plan?</p>
            <p className="text-xs text-gray-400">High-volume agents and brokerages, reach out and we will get you set up.</p>
          </div>
        </div>
        <a href="mailto:support@klovex.app?subject=Custom Plan" className="btn-primary text-sm px-5 py-2 flex-shrink-0">
          Contact us
        </a>
      </div>
    </div>
  )
}
