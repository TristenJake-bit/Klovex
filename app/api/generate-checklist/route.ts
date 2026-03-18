import { NextRequest, NextResponse } from 'next/server'
import { createServerClient2 } from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
  const supabase = await createServerClient2()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { transactionId, acceptanceDate, closingDate, propertyAddress, propertyType, yearBuilt, hasHOA, isForeclosure, loanType } = await req.json()
  if (!transactionId) return NextResponse.json({ error: 'No transactionId' }, { status: 400 })

  const acceptance = acceptanceDate ? new Date(acceptanceDate) : new Date()
  const closing = closingDate ? new Date(closingDate) : new Date(acceptance.getTime() + 30 * 24 * 60 * 60 * 1000)

  function daysFromAcceptance(days: number): string {
    const d = new Date(acceptance)
    d.setDate(d.getDate() + days)
    return d.toISOString().split('T')[0]
  }

  const isPrePost1978 = yearBuilt && parseInt(yearBuilt) < 1978
  const isCalifornia = propertyAddress?.toLowerCase().includes(', ca') || propertyAddress?.toLowerCase().includes('california')

  // Delete existing checklist for this transaction
  await (supabase as any).from('transaction_checklists').delete().eq('transaction_id', transactionId)

  const tasks = [
    // PHASE 1: CONTRACT RECEIVED (Day 1-3)
    { phase: 'Contract Received', task: 'Review Purchase Agreement for completeness and all signatures', responsible: 'TC', days_from_acceptance: 1, category: 'Contract Review', required: true },
    { phase: 'Contract Received', task: 'Verify all pages initialed and dated correctly', responsible: 'TC', days_from_acceptance: 1, category: 'Contract Review', required: true },
    { phase: 'Contract Received', task: 'Confirm purchase price matches MLS listing', responsible: 'TC', days_from_acceptance: 1, category: 'Contract Review', required: true },
    { phase: 'Contract Received', task: 'Calculate all contingency deadlines from acceptance date', responsible: 'TC', days_from_acceptance: 1, category: 'Deadlines', required: true },
    { phase: 'Contract Received', task: 'Send introduction email to all parties (buyer, seller, both agents, lender, escrow)', responsible: 'TC', days_from_acceptance: 1, category: 'Communication', required: true },
    { phase: 'Contract Received', task: 'Open escrow and send signed contract to title company', responsible: 'TC', days_from_acceptance: 1, category: 'Escrow', required: true },
    { phase: 'Contract Received', task: 'Confirm earnest money deposit deadline with buyer agent', responsible: 'TC', days_from_acceptance: 1, category: 'Finance', required: true },
    { phase: 'Contract Received', task: 'Verify earnest money deposit received by escrow', responsible: 'TC', days_from_acceptance: 3, category: 'Finance', required: true },
    { phase: 'Contract Received', task: 'Send Residential Purchase Agreement (RPA) copy to all parties', responsible: 'TC', days_from_acceptance: 1, category: 'Documents', required: true },
    { phase: 'Contract Received', task: 'Confirm lender has copy of executed contract', responsible: 'TC', days_from_acceptance: 2, category: 'Finance', required: true },

    // PHASE 2: CALIFORNIA REQUIRED DISCLOSURES
    { phase: 'Disclosures', task: 'Transfer Disclosure Statement (TDS) — seller to complete and deliver to buyer', responsible: 'Listing Agent', days_from_acceptance: 7, category: 'CA Required Disclosure', required: true },
    { phase: 'Disclosures', task: 'Natural Hazard Disclosure (NHD) — order report from NHD provider', responsible: 'TC', days_from_acceptance: 3, category: 'CA Required Disclosure', required: true },
    { phase: 'Disclosures', task: 'Seller Property Questionnaire (SPQ) — seller to complete', responsible: 'Listing Agent', days_from_acceptance: 7, category: 'CA Required Disclosure', required: true },
    { phase: 'Disclosures', task: 'Agent Visual Inspection Disclosure (AVID) — both agents to complete', responsible: 'Both Agents', days_from_acceptance: 7, category: 'CA Required Disclosure', required: true },
    { phase: 'Disclosures', task: 'Statewide Buyer and Seller Advisory (SBSA) — deliver to buyer', responsible: 'Buyer Agent', days_from_acceptance: 3, category: 'CA Required Disclosure', required: true },
    { phase: 'Disclosures', task: 'Market Conditions Advisory (MCA) — deliver to buyer', responsible: 'Buyer Agent', days_from_acceptance: 3, category: 'CA Required Disclosure', required: true },
    { phase: 'Disclosures', task: 'Buyer Representation Agreement — verify on file', responsible: 'Buyer Agent', days_from_acceptance: 1, category: 'CA Required Disclosure', required: true },
    { phase: 'Disclosures', task: 'Smoke Detector and Water Heater Compliance statement', responsible: 'Seller', days_from_acceptance: 7, category: 'CA Required Disclosure', required: true },
    { phase: 'Disclosures', task: 'Mello-Roos / 1915 Bond Act disclosure (if applicable)', responsible: 'Listing Agent', days_from_acceptance: 7, category: 'CA Required Disclosure', required: true },
    ...(isPrePost1978 ? [{ phase: 'Disclosures', task: 'Lead-Based Paint Disclosure (MANDATORY — home built before 1978)', responsible: 'Both Agents', days_from_acceptance: 3, category: 'Federal Required', required: true }] : []),
    ...(hasHOA ? [
      { phase: 'Disclosures', task: 'HOA Documents — CC&Rs, Bylaws, Rules, Budget, Reserve Study', responsible: 'Listing Agent', days_from_acceptance: 5, category: 'HOA', required: true },
      { phase: 'Disclosures', task: 'HOA Disclosure Package — buyer review period (3 days to cancel)', responsible: 'TC', days_from_acceptance: 8, category: 'HOA', required: true },
    ] : []),

    // PHASE 3: INSPECTIONS (Days 1-17)
    { phase: 'Inspections', task: 'Schedule home inspection — due within inspection contingency period', responsible: 'Buyer Agent', days_from_acceptance: 3, category: 'Inspection', required: true },
    { phase: 'Inspections', task: 'Home inspection completed', responsible: 'Buyer', days_from_acceptance: 10, category: 'Inspection', required: true },
    { phase: 'Inspections', task: 'Pest/Termite inspection ordered', responsible: 'TC', days_from_acceptance: 3, category: 'Inspection', required: true },
    { phase: 'Inspections', task: 'Pest inspection report received and reviewed', responsible: 'TC', days_from_acceptance: 10, category: 'Inspection', required: true },
    { phase: 'Inspections', task: 'Review inspection report and prepare Request for Repair (RR) if needed', responsible: 'Buyer Agent', days_from_acceptance: 12, category: 'Inspection', required: true },
    { phase: 'Inspections', task: 'Negotiate inspection repairs / credits with seller', responsible: 'Both Agents', days_from_acceptance: 14, category: 'Inspection', required: true },
    { phase: 'Inspections', task: 'Inspection contingency removal or cancellation signed', responsible: 'Buyer Agent', days_from_acceptance: 17, category: 'Contingency', required: true },

    // PHASE 4: LOAN & APPRAISAL (Days 1-21)
    { phase: 'Loan & Appraisal', task: 'Confirm buyer has submitted complete loan application', responsible: 'TC', days_from_acceptance: 3, category: 'Finance', required: true },
    { phase: 'Loan & Appraisal', task: 'Appraisal ordered by lender', responsible: 'Lender', days_from_acceptance: 5, category: 'Appraisal', required: true },
    { phase: 'Loan & Appraisal', task: 'Appraisal completed and report received', responsible: 'Lender', days_from_acceptance: 14, category: 'Appraisal', required: true },
    { phase: 'Loan & Appraisal', task: 'Review appraisal — confirm value meets or exceeds purchase price', responsible: 'TC', days_from_acceptance: 15, category: 'Appraisal', required: true },
    { phase: 'Loan & Appraisal', task: 'Appraisal contingency removal signed by buyer', responsible: 'Buyer Agent', days_from_acceptance: 17, category: 'Contingency', required: true },
    { phase: 'Loan & Appraisal', task: 'Loan conditional approval received', responsible: 'Lender', days_from_acceptance: 14, category: 'Finance', required: true },
    { phase: 'Loan & Appraisal', task: 'All loan conditions satisfied and submitted to underwriting', responsible: 'Lender', days_from_acceptance: 18, category: 'Finance', required: true },
    { phase: 'Loan & Appraisal', task: 'Final loan approval (clear to close) received', responsible: 'Lender', days_from_acceptance: 21, category: 'Finance', required: true },
    { phase: 'Loan & Appraisal', task: 'Loan contingency removal signed by buyer', responsible: 'Buyer Agent', days_from_acceptance: 21, category: 'Contingency', required: true },

    // PHASE 5: TITLE (Days 3-21)
    { phase: 'Title', task: 'Preliminary Title Report ordered', responsible: 'TC', days_from_acceptance: 3, category: 'Title', required: true },
    { phase: 'Title', task: 'Preliminary Title Report received and reviewed', responsible: 'TC', days_from_acceptance: 7, category: 'Title', required: true },
    { phase: 'Title', task: 'Confirm no unexpected liens, encumbrances, or clouds on title', responsible: 'TC', days_from_acceptance: 7, category: 'Title', required: true },
    { phase: 'Title', task: 'Title contingency removal signed by buyer', responsible: 'Buyer Agent', days_from_acceptance: 10, category: 'Contingency', required: true },
    { phase: 'Title', task: 'Confirm vesting instructions received by escrow', responsible: 'TC', days_from_acceptance: 14, category: 'Title', required: true },
    { phase: 'Title', task: 'FIRPTA / CA Withholding forms completed (if seller is foreign national)', responsible: 'Listing Agent', days_from_acceptance: 14, category: 'Title', required: false },

    // PHASE 6: PRE-CLOSING (Days 21-closing minus 5)
    { phase: 'Pre-Closing', task: 'Confirm all contingencies have been removed in writing', responsible: 'TC', days_from_acceptance: 22, category: 'Contingency', required: true },
    { phase: 'Pre-Closing', task: 'Closing Disclosure (CD) issued to buyer — 3 business day waiting period begins', responsible: 'Lender', days_from_acceptance: -5, category: 'Finance', required: true },
    { phase: 'Pre-Closing', task: 'Confirm homeowners insurance policy bound and lender notified', responsible: 'Buyer', days_from_acceptance: -5, category: 'Insurance', required: true },
    { phase: 'Pre-Closing', task: 'Confirm wire instructions with escrow officer (verify via phone — fraud prevention)', responsible: 'TC', days_from_acceptance: -3, category: 'Finance', required: true },
    { phase: 'Pre-Closing', task: 'Confirm buyer wire transfer sent to escrow', responsible: 'TC', days_from_acceptance: -2, category: 'Finance', required: true },
    { phase: 'Pre-Closing', task: 'Loan documents sent from lender to escrow', responsible: 'Lender', days_from_acceptance: -3, category: 'Finance', required: true },
    { phase: 'Pre-Closing', task: 'Schedule buyer signing appointment with escrow/notary', responsible: 'TC', days_from_acceptance: -3, category: 'Signing', required: true },
    { phase: 'Pre-Closing', task: 'Schedule seller signing appointment with escrow/notary', responsible: 'TC', days_from_acceptance: -3, category: 'Signing', required: true },
    { phase: 'Pre-Closing', task: 'Final walkthrough scheduled with buyer', responsible: 'Buyer Agent', days_from_acceptance: -1, category: 'Inspection', required: true },
    { phase: 'Pre-Closing', task: 'Final walkthrough completed — confirm property condition unchanged', responsible: 'Buyer Agent', days_from_acceptance: -1, category: 'Inspection', required: true },

    // PHASE 7: CLOSING DAY
    { phase: 'Closing', task: 'Confirm loan funded by lender', responsible: 'TC', days_from_acceptance: 0, category: 'Finance', required: true },
    { phase: 'Closing', task: 'Confirm deed recorded with county recorder', responsible: 'TC', days_from_acceptance: 0, category: 'Title', required: true },
    { phase: 'Closing', task: 'Confirm keys transferred to buyer', responsible: 'Listing Agent', days_from_acceptance: 0, category: 'Possession', required: true },
    { phase: 'Closing', task: 'Send closing confirmation to all parties', responsible: 'TC', days_from_acceptance: 0, category: 'Communication', required: true },
    { phase: 'Closing', task: 'Confirm commission disbursement to brokerages', responsible: 'TC', days_from_acceptance: 0, category: 'Finance', required: true },

    // PHASE 8: POST-CLOSING
    { phase: 'Post-Closing', task: 'Upload final HUD-1 / Settlement Statement to transaction file', responsible: 'TC', days_from_acceptance: 1, category: 'Documents', required: true },
    { phase: 'Post-Closing', task: 'Confirm all documents uploaded and file is complete', responsible: 'TC', days_from_acceptance: 3, category: 'Documents', required: true },
    { phase: 'Post-Closing', task: 'Submit complete transaction file to broker for review', responsible: 'TC', days_from_acceptance: 3, category: 'Compliance', required: true },
    { phase: 'Post-Closing', task: 'Send thank you / review request to buyer and seller', responsible: 'Agent', days_from_acceptance: 3, category: 'Communication', required: false },
    { phase: 'Post-Closing', task: 'Update CRM with closed transaction details', responsible: 'Agent', days_from_acceptance: 3, category: 'Admin', required: false },
  ]

  // Calculate actual due dates
  const closingDayOffset = Math.round((closing.getTime() - acceptance.getTime()) / (24 * 60 * 60 * 1000))
  
  const tasksWithDates = tasks.map(t => {
    let due_date: string
    if (t.days_from_acceptance <= 0) {
      // Negative = days before closing
      const d = new Date(closing)
      d.setDate(d.getDate() + t.days_from_acceptance)
      due_date = d.toISOString().split('T')[0]
    } else if (t.phase === 'Closing') {
      due_date = closing.toISOString().split('T')[0]
    } else {
      due_date = daysFromAcceptance(t.days_from_acceptance)
    }
    return { ...t, transaction_id: transactionId, due_date, completed: false }
  })

  const { error } = await (supabase as any).from('transaction_checklists').insert(tasksWithDates)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true, taskCount: tasksWithDates.length })
}
