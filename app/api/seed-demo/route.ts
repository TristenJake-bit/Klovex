import { NextResponse } from 'next/server'
import { createServerClient2 } from '@/lib/supabase-server'

export async function POST() {
  const supabase = await createServerClient2()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Check if demo already exists
  const { data: existing } = await (supabase as any)
    .from('transactions')
    .select('id')
    .eq('client_id', user.id)
    .ilike('property_address', '%Demo%Sample%')
    .limit(1)

  if (existing && existing.length > 0) {
    return NextResponse.json({ transactionId: existing[0].id, alreadyExists: true })
  }

  const today = new Date()
  const closingDate = new Date(today)
  closingDate.setDate(closingDate.getDate() + 28)
  const closingStr = closingDate.toISOString().split('T')[0]

  // Create demo transaction
  const { data: tx, error: txErr } = await (supabase as any).from('transactions').insert({
    client_id: user.id,
    property_address: '742 Evergreen Terrace, Springfield, CA 90210 (Demo Sample)',
    transaction_type: 'purchase',
    status: 'inspection',
    purchase_price: 685000,
    closing_date: closingStr,
    state: 'CA',
  }).select().single()

  if (txErr || !tx) return NextResponse.json({ error: txErr?.message || 'Failed to create demo' }, { status: 500 })

  const txId = tx.id

  // Seed contacts
  await (supabase as any).from('transaction_contacts').insert([
    { transaction_id: txId, role: 'Buyer', name: 'Sarah & James Chen', email: 'schen@example.com', phone: '(555) 123-4567', company: null },
    { transaction_id: txId, role: 'Seller', name: 'Robert Martinez', email: 'rmartinez@example.com', phone: '(555) 987-6543', company: null },
    { transaction_id: txId, role: "Buyer's Agent", name: 'You (Demo)', email: null, phone: null, company: 'Your Brokerage' },
    { transaction_id: txId, role: "Seller's Agent", name: 'Linda Park', email: 'lpark@example.com', phone: '(555) 456-7890', company: 'Coastal Realty' },
    { transaction_id: txId, role: 'Lender', name: 'Mike Thompson', email: 'mthompson@example.com', phone: '(555) 222-3333', company: 'Pacific Home Loans' },
    { transaction_id: txId, role: 'Escrow Officer', name: 'Jennifer Wu', email: 'jwu@example.com', phone: '(555) 444-5555', company: 'First American Title' },
  ])

  // Seed checklist — mix of completed and upcoming tasks
  function daysFrom(base: Date, days: number) {
    const d = new Date(base)
    d.setDate(d.getDate() + days)
    return d.toISOString().split('T')[0]
  }

  const checklistItems = [
    // Completed tasks
    { task: 'Review Purchase Agreement (RPA) for completeness and all signatures', phase: 'Contract Received', responsible: 'TC', due_date: daysFrom(today, -14), completed: true, completed_at: daysFrom(today, -14), category: 'Contract Review', required: true },
    { task: 'Verify all pages initialed and dated correctly', phase: 'Contract Received', responsible: 'TC', due_date: daysFrom(today, -14), completed: true, completed_at: daysFrom(today, -14), category: 'Contract Review', required: true },
    { task: 'Open escrow — send signed RPA and commission instructions to title company', phase: 'Contract Received', responsible: 'TC', due_date: daysFrom(today, -14), completed: true, completed_at: daysFrom(today, -13), category: 'Escrow', required: true },
    { task: 'Verify earnest money deposit received by escrow', phase: 'Contract Received', responsible: 'TC', due_date: daysFrom(today, -12), completed: true, completed_at: daysFrom(today, -11), category: 'Finance', required: true },
    { task: 'Natural Hazard Disclosure (NHD) — order report, copy escrow', phase: 'Disclosures', responsible: 'TC', due_date: daysFrom(today, -11), completed: true, completed_at: daysFrom(today, -10), category: 'CA Required Disclosure', required: true },
    { task: 'Transfer Disclosure Statement (TDS) — seller to complete', phase: 'Disclosures', responsible: 'Listing Agent', due_date: daysFrom(today, -7), completed: true, completed_at: daysFrom(today, -6), category: 'CA Required Disclosure', required: true },
    { task: 'Home inspection completed', phase: 'Inspections', responsible: 'Buyer', due_date: daysFrom(today, -4), completed: true, completed_at: daysFrom(today, -3), category: 'Inspection', required: true },
    // Upcoming tasks — some urgent
    { task: 'Review inspection report and prepare Request for Repair (RR)', phase: 'Inspections', responsible: 'Buyer Agent', due_date: daysFrom(today, 1), completed: false, completed_at: null, category: 'Inspection', required: true },
    { task: 'Inspection contingency removal or cancellation signed', phase: 'Inspections', responsible: 'Buyer Agent', due_date: daysFrom(today, 3), completed: false, completed_at: null, category: 'Contingency', required: true },
    { task: 'Pest/Termite inspection report received and reviewed', phase: 'Inspections', responsible: 'TC', due_date: daysFrom(today, 2), completed: false, completed_at: null, category: 'Inspection', required: true },
    { task: 'Preliminary Title Report received and reviewed', phase: 'Title', responsible: 'TC', due_date: daysFrom(today, 5), completed: false, completed_at: null, category: 'Title', required: true },
    { task: 'Title contingency removal signed by buyer', phase: 'Title', responsible: 'Buyer Agent', due_date: daysFrom(today, 8), completed: false, completed_at: null, category: 'Contingency', required: true },
    { task: 'Appraisal ordered by lender', phase: 'Loan & Appraisal', responsible: 'Lender', due_date: daysFrom(today, 4), completed: false, completed_at: null, category: 'Appraisal', required: true },
    { task: 'Final loan approval (clear to close) received', phase: 'Loan & Appraisal', responsible: 'Lender', due_date: daysFrom(today, 18), completed: false, completed_at: null, category: 'Finance', required: true },
    { task: 'Schedule buyer signing appointment with escrow/notary', phase: 'Pre-Closing', responsible: 'TC', due_date: daysFrom(today, 25), completed: false, completed_at: null, category: 'Signing', required: true },
    { task: 'Final walkthrough completed', phase: 'Pre-Closing', responsible: 'Buyer Agent', due_date: daysFrom(today, 27), completed: false, completed_at: null, category: 'Inspection', required: true },
    { task: 'Confirm loan funded by lender', phase: 'Closing', responsible: 'TC', due_date: closingStr, completed: false, completed_at: null, category: 'Finance', required: true },
    { task: 'Confirm deed recorded with county recorder', phase: 'Closing', responsible: 'TC', due_date: closingStr, completed: false, completed_at: null, category: 'Title', required: true },
  ].map(t => ({ ...t, transaction_id: txId }))

  await (supabase as any).from('transaction_checklists').insert(checklistItems)

  // Seed timeline
  await (supabase as any).from('timeline_events').insert([
    { transaction_id: txId, author_id: user.id, type: 'ai_analysis', content: '📄 AI analyzed "Purchase_Agreement_742_Evergreen.pdf" (Purchase Agreement): Residential purchase agreement for 742 Evergreen Terrace. Purchase price $685,000, closing in 28 days. Standard contingencies for inspection, loan, and appraisal. Earnest money deposit of $20,000.', created_at: daysFrom(today, -14) },
    { transaction_id: txId, author_id: user.id, type: 'ai_risk', content: '🚨 AI found 1 high-risk item: Seller disclosure indicates previous water damage in basement — recommend additional inspection', created_at: daysFrom(today, -14) },
    { transaction_id: txId, author_id: user.id, type: 'ai_deadline', content: '📅 Upcoming deadlines: Inspection contingency removal (in 17d) · Loan contingency removal (in 21d) · Closing (in 28d)', created_at: daysFrom(today, -14) },
    { transaction_id: txId, author_id: user.id, type: 'note', content: 'Spoke with seller\'s agent — seller is motivated and flexible on closing date', created_at: daysFrom(today, -10) },
    { transaction_id: txId, author_id: user.id, type: 'system', content: 'Portal link generated — shareable with transaction parties', created_at: daysFrom(today, -8) },
    { transaction_id: txId, author_id: user.id, type: 'email', content: 'Welcome email sent to agent', created_at: daysFrom(today, -14) },
    { transaction_id: txId, author_id: user.id, type: 'ai_analysis', content: '📄 AI analyzed "Home_Inspection_Report.pdf" (Home Inspection Report): 3-bedroom, 2-bath single family home. Overall good condition. Minor issues: aging HVAC system (15+ years), small crack in garage foundation, and exterior paint peeling on south wall.', created_at: daysFrom(today, -3) },
    { transaction_id: txId, author_id: user.id, type: 'note', content: 'Buyers want to request $5,000 credit for HVAC replacement — drafting repair request', created_at: daysFrom(today, -2) },
  ])

  // Create a notification
  await (supabase as any).from('notifications').insert([
    { user_id: user.id, transaction_id: txId, type: 'ai_analysis', title: 'AI analyzed "Purchase_Agreement_742_Evergreen.pdf"', body: 'Purchase agreement for 742 Evergreen Terrace — $685,000, closing in 28 days', read: false },
    { user_id: user.id, transaction_id: txId, type: 'risk', title: '1 high-risk item found', body: 'Previous water damage in basement — recommend additional inspection', read: false },
    { user_id: user.id, transaction_id: txId, type: 'deadline', title: '3 deadlines coming up', body: 'Inspection report review; Pest inspection; Inspection contingency removal', read: false },
  ])

  return NextResponse.json({ transactionId: txId, success: true })
}
