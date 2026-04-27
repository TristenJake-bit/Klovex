import Link from 'next/link'

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <Link href="/" className="text-sm text-brand-500 hover:text-brand-600 mb-8 inline-block">&larr; Back to Klovex</Link>
        <h1 className="font-serif text-4xl font-bold text-gray-900 mb-2">Terms of Service</h1>
        <p className="text-sm text-gray-400 mb-10">Last updated: April 2026</p>

        <div className="space-y-8 text-gray-700 leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">What Klovex Is</h2>
            <p>Klovex is an AI-powered software tool designed to help real estate professionals manage transaction coordination workflows. Klovex is <strong>not</strong> a licensed Transaction Coordinator, real estate broker, or law firm. It is a productivity tool — a really smart one — but a tool nonetheless.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">No Liability for Errors</h2>
            <p>Klovex does its best to help you stay on top of deadlines, documents, and compliance. However, we accept no liability for missed deadlines, deal failures, document errors, or any inaccuracies produced by AI analysis. You are responsible for independently verifying all dates, terms, and information before acting on them.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Your Data, Your Property</h2>
            <p>All transaction data, documents, and information you upload to Klovex belongs to you. We do not sell your data, ever. We do not use your documents to train AI models. Your data is stored securely and used only to provide the Klovex service to you.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Governing Law</h2>
            <p>These terms are governed by the laws of the State of California. Any disputes will be resolved in California courts.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Contact</h2>
            <p>Questions about these terms? Reach out at <a href="mailto:solitudeconnections@gmail.com" className="text-brand-500 hover:text-brand-600 underline">solitudeconnections@gmail.com</a>.</p>
          </section>
        </div>
      </div>
    </div>
  )
}
