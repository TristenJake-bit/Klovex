'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { HelpCircle, X, ChevronRight, ArrowRight } from 'lucide-react'

interface HelpItem {
  title: string
  body: string
}

interface PageHelp {
  heading: string
  intro: string
  steps: HelpItem[]
}

const HELP_CONTENT: Record<string, PageHelp> = {
  '/dashboard': {
    heading: 'Your Dashboard',
    intro: 'This is your home base. Everything that needs your attention shows up here.',
    steps: [
      { title: 'What are the stat cards?', body: 'These show your active transactions, upcoming closings, overdue tasks, and total deals at a glance.' },
      { title: 'What does "Overdue tasks" mean?', body: 'These are checklist items with a due date that has passed. Click any task to jump to that transaction and complete it.' },
      { title: 'How do I start a new transaction?', body: 'Click the "New transaction" button in the top right. Enter the property address, price, and estimated close date.' },
      { title: 'What is the plan indicator?', body: 'It shows how many transactions you\'ve used this billing period. When you hit your limit, additional transactions are billed as add-ons.' },
    ],
  },
  '/dashboard/transactions/new': {
    heading: 'Create a Transaction',
    intro: 'Start a new deal by entering the property details.',
    steps: [
      { title: 'What info do I need?', body: 'At minimum, enter the street address and city. Purchase price and close date are optional but help AI generate better checklists.' },
      { title: 'What is transaction type?', body: 'Choose "Purchase" if your client is buying, or "Sale" if they\'re selling. This determines which checklist tasks are generated.' },
      { title: 'What happens after I create it?', body: 'You\'ll land on the transaction detail page. Upload your first document (like the purchase agreement) and AI will analyze it automatically.' },
    ],
  },
  '/dashboard/transactions': {
    heading: 'Your Transactions',
    intro: 'All your deals in one place. Click any transaction to open it.',
    steps: [
      { title: 'What do the status colors mean?', body: 'Yellow = Pending, Blue = Contract, Purple = Inspection, Indigo = Loan, Teal = Closing, Green = Closed, Red = Cancelled.' },
      { title: 'How do I find a specific deal?', body: 'Transactions are sorted by most recent. Look for the property address or use the status to narrow things down.' },
      { title: 'Can I delete a transaction?', body: 'Not directly from here. If you need to remove a deal, contact support at hello@klovex.app.' },
    ],
  },
  'transaction-overview': {
    heading: 'Overview Tab',
    intro: 'A snapshot of where this deal stands right now.',
    steps: [
      { title: 'What is the Deadline Dashboard?', body: 'It shows your upcoming checklist tasks color-coded by urgency. Red = overdue, orange = due within 3 days, yellow = within 7 days, green = on track. You can check off tasks directly here.' },
      { title: 'What is the green "Advance" banner?', body: 'When all tasks in the current phase are complete, Klovex suggests moving to the next status. Click the button to advance the deal.' },
      { title: 'How do I change the status manually?', body: 'Use the status dropdown in the top-right card. You can set it to any phase at any time.' },
      { title: 'What are Transaction Contacts?', body: 'Add all parties involved — buyer, seller, agents, lender, escrow officer, etc. These are used to auto-populate emails and keep everyone\'s info in one place.' },
    ],
  },
  'transaction-documents': {
    heading: 'Documents Tab',
    intro: 'Upload documents and let AI read them for you.',
    steps: [
      { title: 'How does AI analysis work?', body: 'When you upload a PDF, AI reads the entire document and extracts key information — parties, dates, prices, contingencies, and risks. It happens automatically.' },
      { title: 'What does "Analysis Ready" mean?', body: 'The green badge means AI has finished reading that document. Click the expand arrow to see everything it found.' },
      { title: 'What does the red warning badge mean?', body: 'AI found issues with the document — missing signatures, blank fields, or inconsistencies. Click to expand and see the details.' },
      { title: 'What does "Compare Documents" do?', body: 'It cross-references all your analyzed documents and flags any discrepancies — like if the purchase price is different between documents. Requires 2+ analyzed docs.' },
      { title: 'Can I re-analyze a document?', body: 'Yes! Click the "Re-analyze" button on any document to run AI analysis again.' },
    ],
  },
  'transaction-checklist': {
    heading: 'Checklist Tab',
    intro: 'Your compliance checklist from contract to close.',
    steps: [
      { title: 'How is the checklist generated?', body: 'Click "Generate Checklist" and AI creates a California-compliant task list based on your transaction type (buyer or seller). It auto-generates on your first document upload too.' },
      { title: 'What are the phase filters?', body: 'Click a phase name (like "Disclosures" or "Inspections") to filter and see only tasks for that phase. Click "All" to see everything.' },
      { title: 'How do I complete a task?', body: 'Just check the checkbox next to any task. It\'ll be marked complete with a timestamp.' },
      { title: 'Do tasks auto-complete?', body: 'Yes! When you upload certain documents (like a purchase agreement or inspection report), AI automatically checks off the matching tasks.' },
      { title: 'What do the colors on due dates mean?', body: 'Red = overdue, normal = on track. Tasks are sorted by due date so the most urgent ones are at the top.' },
    ],
  },
  'transaction-timeline': {
    heading: 'Timeline Tab',
    intro: 'A complete log of everything that happened on this deal.',
    steps: [
      { title: 'What gets logged automatically?', body: 'AI document analyses, status changes, email notifications, deadline reminders, and auto-completed tasks all show up here.' },
      { title: 'What do the colored dots mean?', body: 'Purple = AI event, Blue = email sent, Green = status change, Orange = system event, Teal = your notes.' },
      { title: 'Can I add my own notes?', body: 'Yes! Type in the text box at the top and click "Add note". Great for logging phone calls, meeting notes, or anything you want to remember.' },
    ],
  },
  '/dashboard/settings': {
    heading: 'Settings',
    intro: 'Manage your profile and subscription.',
    steps: [
      { title: 'How do I update my info?', body: 'Edit your name, company, and phone number, then click "Save changes". Email can\'t be changed from here.' },
      { title: 'How do I cancel my plan?', body: 'Scroll to "Manage subscription" at the bottom. You\'ll be walked through the cancellation process. Your data is never deleted.' },
    ],
  },
}

function getHelpKey(pathname: string, hash?: string): string {
  if (hash) return hash
  // Check for transaction detail page
  if (pathname.match(/\/dashboard\/transactions\/[^/]+$/)) return 'transaction-overview'
  // Check for exact matches
  if (HELP_CONTENT[pathname]) return pathname
  // Fallback
  return '/dashboard'
}

export default function HelpGuide() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [helpKey, setHelpKey] = useState(() => getHelpKey(pathname))
  const [expandedStep, setExpandedStep] = useState<number | null>(null)

  // Update help key when pathname changes
  useEffect(() => {
    setHelpKey(getHelpKey(pathname))
    setExpandedStep(null)
  }, [pathname])

  // Listen for custom event from transaction tabs
  useEffect(() => {
    function handleTabChange(e: CustomEvent) {
      const tabMap: Record<string, string> = {
        overview: 'transaction-overview',
        documents: 'transaction-documents',
        checklist: 'transaction-checklist',
        timeline: 'transaction-timeline',
      }
      if (tabMap[e.detail]) setHelpKey(tabMap[e.detail])
      setExpandedStep(null)
    }
    window.addEventListener('help-tab-change' as any, handleTabChange as any)
    return () => window.removeEventListener('help-tab-change' as any, handleTabChange as any)
  }, [])

  const content = HELP_CONTENT[helpKey] || HELP_CONTENT['/dashboard']

  return (
    <>
      {/* Floating Help Button */}
      <button
        onClick={() => setOpen(!open)}
        className={`fixed bottom-6 right-6 z-50 w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-all ${open ? 'bg-gray-800 hover:bg-gray-700' : 'bg-brand-500 hover:bg-brand-600'}`}
        aria-label="Help"
      >
        {open ? <X className="w-5 h-5 text-white" /> : <HelpCircle className="w-5 h-5 text-white" />}
      </button>

      {/* Help Panel */}
      {open && (
        <>
          <div className="fixed inset-0 z-40 bg-black/20" onClick={() => setOpen(false)} />
          <div className="fixed bottom-20 right-6 z-50 w-80 md:w-96 bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden max-h-[70vh] flex flex-col">
            {/* Header */}
            <div className="bg-brand-500 px-5 py-4">
              <div className="flex items-center gap-2 mb-1">
                <HelpCircle className="w-4 h-4 text-white/80" />
                <span className="text-xs text-white/70 font-medium uppercase tracking-wide">Help Guide</span>
              </div>
              <h3 className="text-white font-semibold text-lg">{content.heading}</h3>
              <p className="text-white/80 text-sm mt-1">{content.intro}</p>
            </div>

            {/* Steps */}
            <div className="flex-1 overflow-y-auto p-3">
              <div className="space-y-1.5">
                {content.steps.map((step, i) => (
                  <div key={i} className="rounded-xl border border-gray-100 overflow-hidden">
                    <button
                      onClick={() => setExpandedStep(expandedStep === i ? null : i)}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors"
                    >
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold ${expandedStep === i ? 'bg-brand-500 text-white' : 'bg-gray-100 text-gray-500'}`}>
                        ?
                      </div>
                      <span className="text-sm font-medium text-gray-800 flex-1">{step.title}</span>
                      <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${expandedStep === i ? 'rotate-90' : ''}`} />
                    </button>
                    {expandedStep === i && (
                      <div className="px-4 pb-3 pl-13">
                        <p className="text-sm text-gray-600 leading-relaxed ml-9">{step.body}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-gray-100 bg-gray-50">
              <a href="mailto:hello@klovex.app?subject=Help Request" className="flex items-center gap-2 text-xs text-gray-500 hover:text-brand-600 transition-colors">
                Still need help? <span className="font-medium">Contact us</span> <ArrowRight className="w-3 h-3" />
              </a>
            </div>
          </div>
        </>
      )}
    </>
  )
}
