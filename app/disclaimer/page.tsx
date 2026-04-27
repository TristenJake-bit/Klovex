import Link from 'next/link'

export default function DisclaimerPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <Link href="/" className="text-sm text-brand-500 hover:text-brand-600 mb-8 inline-block">&larr; Back to Klovex</Link>
        <h1 className="font-serif text-4xl font-bold text-gray-900 mb-2">Disclaimer</h1>
        <p className="text-sm text-gray-400 mb-10">Last updated: April 2026</p>

        <div className="space-y-8 text-gray-700 leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Not a Licensed Professional</h2>
            <p>Klovex is not a licensed Transaction Coordinator, real estate broker, or attorney. The software provides organizational and workflow assistance — it does not provide professional, legal, or financial advice of any kind.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">AI Is a Tool, Not an Expert</h2>
            <p>The AI features in Klovex (document analysis, checklist generation, deadline tracking) are designed to help you stay organized. They are not a substitute for professional judgment. AI can make mistakes — always review and verify AI-generated content before relying on it.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">No Guarantee of Accuracy</h2>
            <p>While we work hard to make Klovex as accurate and reliable as possible, we cannot guarantee that all information, dates, or analysis produced by the platform will be error-free. You are responsible for verifying all critical information independently.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">California Compliance</h2>
            <p>Klovex is built with California real estate transaction workflows as the default. If you operate in a different state, you are responsible for ensuring compliance with your local regulations and requirements.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Limitation of Liability</h2>
            <p>Our liability is limited to the maximum extent permitted by applicable law. Klovex is provided "as is" without warranties of any kind. We are not liable for any damages arising from your use of the platform, including but not limited to missed deadlines, financial losses, or deal failures.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Questions?</h2>
            <p>If you have questions about this disclaimer, contact us at <a href="mailto:support@klovex.app" className="text-brand-500 hover:text-brand-600 underline">support@klovex.app</a>.</p>
          </section>
        </div>
      </div>
    </div>
  )
}
