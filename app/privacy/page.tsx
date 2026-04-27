import Link from 'next/link'

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <Link href="/" className="text-sm text-brand-500 hover:text-brand-600 mb-8 inline-block">&larr; Back to Klovex</Link>
        <h1 className="font-serif text-4xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
        <p className="text-sm text-gray-400 mb-10">Last updated: April 2026</p>

        <div className="space-y-8 text-gray-700 leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">What We Collect</h2>
            <p>When you use Klovex, we collect your name, email address, transaction data (property details, documents, checklists), and basic usage data (pages visited, features used). That's it — nothing creepy.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">We Never Sell Your Data</h2>
            <p>Your data is yours. We will never sell, rent, or share your personal information or transaction data with third parties for marketing or advertising purposes. Period.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">No AI Training on Your Documents</h2>
            <p>Your uploaded documents are analyzed by AI to help you manage transactions. They are <strong>never</strong> used to train AI models. Your documents are processed, results are returned, and that's it.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Third-Party Services</h2>
            <p>We use a small number of trusted services to run Klovex:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li><strong>Supabase</strong> — database and authentication</li>
              <li><strong>Resend</strong> — transactional emails</li>
              <li><strong>Stripe</strong> — payment processing</li>
            </ul>
            <p className="mt-2">These services only receive the minimum data needed to function. We do not use analytics trackers, advertising pixels, or tracking cookies.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">No Tracking Cookies</h2>
            <p>Klovex does not use tracking cookies. We use only essential cookies required for authentication and keeping you logged in.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Data Deletion</h2>
            <p>You can request full deletion of your account and all associated data at any time by emailing <a href="mailto:solitudeconnections@gmail.com" className="text-brand-500 hover:text-brand-600 underline">solitudeconnections@gmail.com</a>. We'll process your request within 30 days.</p>
          </section>
        </div>
      </div>
    </div>
  )
}
