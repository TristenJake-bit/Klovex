import { NextRequest, NextResponse } from 'next/server'
import { createServerClient2 } from '@/lib/supabase-server'
import { txSharedTasks, txSellerTasks, txBuyerTasks } from '@/lib/checklists/texas'
import { flSharedTasks, flSellerTasks, flBuyerTasks } from '@/lib/checklists/florida'
import { generalSharedTasks, generalSellerTasks, generalBuyerTasks } from '@/lib/checklists/general'

export async function POST(req: NextRequest) {
  const supabase = await createServerClient2()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { transactionId, acceptanceDate, closingDate, propertyAddress, transactionType, state, yearBuilt, hasHOA, isSeptic } = await req.json()
  if (!transactionId) return NextResponse.json({ error: 'No transactionId' }, { status: 400 })

  const acceptance = acceptanceDate ? new Date(acceptanceDate) : new Date()
  const closing = closingDate ? new Date(closingDate) : new Date(acceptance.getTime() + 30 * 24 * 60 * 60 * 1000)

  function daysFromAcceptance(days: number): string {
    const d = new Date(acceptance)
    d.setDate(d.getDate() + days)
    return d.toISOString().split('T')[0]
  }

  const isPrePost1978 = yearBuilt && parseInt(yearBuilt) < 1978
  const isPrePost1960 = yearBuilt && parseInt(yearBuilt) < 1960
  const isSeller = transactionType === 'sale'
  const txState = (state || 'CA').toUpperCase()

  await (supabase as any).from('transaction_checklists').delete().eq('transaction_id', transactionId)

  // Route to state-specific checklists for TX and FL, CA uses inline tasks below, others get general
  if (txState === 'TX') {
    const tasks = [...txSharedTasks, ...(isSeller ? txSellerTasks : txBuyerTasks)]
    const tasksWithDates = tasks.map((t: any) => {
      let due_date: string
      if (t.days_from_acceptance <= 0) { const d = new Date(closing); d.setDate(d.getDate() + t.days_from_acceptance); due_date = d.toISOString().split('T')[0] }
      else if (t.phase === 'Closing') { due_date = closing.toISOString().split('T')[0] }
      else { due_date = daysFromAcceptance(t.days_from_acceptance) }
      return { ...t, transaction_id: transactionId, due_date, completed: false }
    })
    const { error } = await (supabase as any).from('transaction_checklists').insert(tasksWithDates)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true, taskCount: tasksWithDates.length, transactionType: isSeller ? 'seller' : 'buyer', state: 'TX' })
  }

  if (txState === 'FL') {
    const tasks = [...flSharedTasks, ...(isSeller ? flSellerTasks : flBuyerTasks)]
    const tasksWithDates = tasks.map((t: any) => {
      let due_date: string
      if (t.days_from_acceptance <= 0) { const d = new Date(closing); d.setDate(d.getDate() + t.days_from_acceptance); due_date = d.toISOString().split('T')[0] }
      else if (t.phase === 'Closing') { due_date = closing.toISOString().split('T')[0] }
      else { due_date = daysFromAcceptance(t.days_from_acceptance) }
      return { ...t, transaction_id: transactionId, due_date, completed: false }
    })
    const { error } = await (supabase as any).from('transaction_checklists').insert(tasksWithDates)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true, taskCount: tasksWithDates.length, transactionType: isSeller ? 'seller' : 'buyer', state: 'FL' })
  }

  if (txState !== 'CA') {
    // General US checklist for unsupported states
    const tasks = [...generalSharedTasks, ...(isSeller ? generalSellerTasks : generalBuyerTasks)]
    const tasksWithDates = tasks.map((t: any) => {
      let due_date: string
      if (t.days_from_acceptance <= 0) { const d = new Date(closing); d.setDate(d.getDate() + t.days_from_acceptance); due_date = d.toISOString().split('T')[0] }
      else if (t.phase === 'Closing') { due_date = closing.toISOString().split('T')[0] }
      else { due_date = daysFromAcceptance(t.days_from_acceptance) }
      return { ...t, transaction_id: transactionId, due_date, completed: false }
    })
    const { error } = await (supabase as any).from('transaction_checklists').insert(tasksWithDates)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true, taskCount: tasksWithDates.length, transactionType: isSeller ? 'seller' : 'buyer', state: txState })
  }

  // California checklist (existing detailed implementation below)
  const sharedTasks: any[] = [
    { phase: 'Contract Received', task: 'Review Purchase Agreement (RPA) for completeness and all signatures', responsible: 'TC', days_from_acceptance: 1, category: 'Contract Review', required: true },
    { phase: 'Contract Received', task: 'Verify all pages initialed and dated correctly', responsible: 'TC', days_from_acceptance: 1, category: 'Contract Review', required: true },
    { phase: 'Contract Received', task: 'Calculate all contingency deadlines and enter into calendar — copy agents', responsible: 'TC', days_from_acceptance: 1, category: 'Deadlines', required: true },
    { phase: 'Contract Received', task: 'Send Transaction Team Welcome Letter to all parties (escrow, agents, lender)', responsible: 'TC', days_from_acceptance: 1, category: 'Communication', required: true },
    { phase: 'Contract Received', task: 'Open escrow — send signed RPA and commission instructions to title company', responsible: 'TC', days_from_acceptance: 1, category: 'Escrow', required: true },
    { phase: 'Contract Received', task: 'Send RPA copy to all parties', responsible: 'TC', days_from_acceptance: 1, category: 'Documents', required: true },
    { phase: 'Contract Received', task: 'Confirm earnest money deposit deadline with buyer agent', responsible: 'TC', days_from_acceptance: 1, category: 'Finance', required: true },
    { phase: 'Contract Received', task: 'Verify earnest money deposit received by escrow', responsible: 'TC', days_from_acceptance: 3, category: 'Finance', required: true },
    { phase: 'Contract Received', task: 'Obtain copy of EMD receipt from escrow', responsible: 'TC', days_from_acceptance: 3, category: 'Finance', required: true },
    { phase: 'Contract Received', task: 'Confirm lender has copy of executed contract', responsible: 'TC', days_from_acceptance: 2, category: 'Finance', required: true },
    { phase: 'Disclosures', task: 'Natural Hazard Disclosure (NHD) — order report, copy escrow', responsible: 'TC', days_from_acceptance: 3, category: 'CA Required Disclosure', required: true },
    { phase: 'Disclosures', task: 'Agent Visual Inspection Disclosure (AVID) — both agents to complete', responsible: 'Both Agents', days_from_acceptance: 7, category: 'CA Required Disclosure', required: true },
    { phase: 'Disclosures', task: 'Statewide Buyer and Seller Advisory (SBSA) — deliver to buyer', responsible: 'Buyer Agent', days_from_acceptance: 3, category: 'CA Required Disclosure', required: true },
    { phase: 'Disclosures', task: 'Market Conditions Advisory (MCA) — deliver to buyer', responsible: 'Buyer Agent', days_from_acceptance: 3, category: 'CA Required Disclosure', required: true },
    { phase: 'Disclosures', task: 'Smoke Detector and Water Heater Compliance statement', responsible: 'Seller', days_from_acceptance: 7, category: 'CA Required Disclosure', required: true },
    { phase: 'Disclosures', task: 'Mello-Roos / 1915 Bond Act disclosure (if applicable)', responsible: 'Listing Agent', days_from_acceptance: 7, category: 'CA Required Disclosure', required: true },
    { phase: 'Disclosures', task: 'Start disclosures in GLIDE', responsible: 'TC', days_from_acceptance: 1, category: 'CA Required Disclosure', required: true },
    { phase: 'Disclosures', task: 'Send NHD Report and signature receipt noting Hazard Disclosure Receipt', responsible: 'TC', days_from_acceptance: 5, category: 'CA Required Disclosure', required: true },
    { phase: 'Disclosures', task: 'Send preliminary title report to all parties', responsible: 'TC', days_from_acceptance: 7, category: 'Title', required: true },
    ...(isPrePost1978 ? [{ phase: 'Disclosures', task: 'Lead-Based Paint Disclosure (LPD) — MANDATORY for homes built before 1978', responsible: 'Both Agents', days_from_acceptance: 3, category: 'Federal Required', required: true }] : []),
    ...(isPrePost1960 ? [{ phase: 'Disclosures', task: 'Earthquake Hazards Report (ERQ) — required for pre-1960 construction', responsible: 'Listing Agent', days_from_acceptance: 7, category: 'CA Required Disclosure', required: true }] : []),
    ...(hasHOA ? [
      { phase: 'Disclosures', task: 'HOA Documents — CC&Rs, Bylaws, Rules, Budget, Reserve Study', responsible: 'Listing Agent', days_from_acceptance: 5, category: 'HOA', required: true },
      { phase: 'Disclosures', task: 'HOA Disclosure Package — buyer review period (3 days to cancel)', responsible: 'TC', days_from_acceptance: 8, category: 'HOA', required: true },
      { phase: 'Disclosures', task: 'Verify HOA fee and that escrow ordered HOA docs', responsible: 'TC', days_from_acceptance: 5, category: 'HOA', required: true },
    ] : []),
    { phase: 'Inspections', task: 'Schedule home inspection — within inspection contingency period', responsible: 'Buyer Agent', days_from_acceptance: 3, category: 'Inspection', required: true },
    { phase: 'Inspections', task: 'Home inspection completed', responsible: 'Buyer', days_from_acceptance: 10, category: 'Inspection', required: true },
    { phase: 'Inspections', task: 'Pest/Termite inspection ordered', responsible: 'TC', days_from_acceptance: 3, category: 'Inspection', required: true },
    { phase: 'Inspections', task: 'Termite inspection report received and reviewed', responsible: 'TC', days_from_acceptance: 10, category: 'Inspection', required: true },
    { phase: 'Inspections', task: 'Review inspection report and prepare Request for Repair (RR) if needed', responsible: 'Buyer Agent', days_from_acceptance: 12, category: 'Inspection', required: true },
    { phase: 'Inspections', task: 'Negotiate inspection repairs/credits with seller', responsible: 'Both Agents', days_from_acceptance: 14, category: 'Inspection', required: true },
    { phase: 'Inspections', task: 'Inspection contingency removal or cancellation signed', responsible: 'Buyer Agent', days_from_acceptance: 17, category: 'Contingency', required: true },
    ...(isSeptic ? [{ phase: 'Inspections', task: 'Order septic pump and certification (SWPI)', responsible: 'TC', days_from_acceptance: 5, category: 'Inspection', required: true }] : []),
    { phase: 'Title', task: 'Preliminary Title Report ordered', responsible: 'TC', days_from_acceptance: 3, category: 'Title', required: true },
    { phase: 'Title', task: 'Preliminary Title Report received and reviewed', responsible: 'TC', days_from_acceptance: 7, category: 'Title', required: true },
    { phase: 'Title', task: 'Confirm no unexpected liens, encumbrances, or clouds on title', responsible: 'TC', days_from_acceptance: 7, category: 'Title', required: true },
    { phase: 'Title', task: 'Title contingency removal signed by buyer', responsible: 'Buyer Agent', days_from_acceptance: 10, category: 'Contingency', required: true },
    { phase: 'Title', task: 'Confirm vesting instructions received by escrow', responsible: 'TC', days_from_acceptance: 14, category: 'Title', required: true },
    { phase: 'Title', task: 'FIRPTA / CA Withholding forms completed (if seller is foreign national)', responsible: 'Listing Agent', days_from_acceptance: 14, category: 'Title', required: false },
    { phase: 'Pre-Closing', task: 'Confirm all contingencies have been removed in writing', responsible: 'TC', days_from_acceptance: 22, category: 'Contingency', required: true },
    { phase: 'Pre-Closing', task: 'Closing Disclosure (CD) issued to buyer — 3 business day waiting period', responsible: 'Lender', days_from_acceptance: -5, category: 'Finance', required: true },
    { phase: 'Pre-Closing', task: 'Confirm homeowners insurance policy bound and lender notified', responsible: 'Buyer', days_from_acceptance: -5, category: 'Insurance', required: true },
    { phase: 'Pre-Closing', task: 'Confirm wire instructions with escrow officer via phone (fraud prevention)', responsible: 'TC', days_from_acceptance: -3, category: 'Finance', required: true },
    { phase: 'Pre-Closing', task: 'Confirm buyer wire transfer sent to escrow', responsible: 'TC', days_from_acceptance: -2, category: 'Finance', required: true },
    { phase: 'Pre-Closing', task: 'Loan documents sent from lender to escrow', responsible: 'Lender', days_from_acceptance: -3, category: 'Finance', required: true },
    { phase: 'Pre-Closing', task: 'Schedule buyer signing appointment with escrow/notary', responsible: 'TC', days_from_acceptance: -3, category: 'Signing', required: true },
    { phase: 'Pre-Closing', task: 'Schedule seller signing appointment with escrow/notary', responsible: 'TC', days_from_acceptance: -3, category: 'Signing', required: true },
    { phase: 'Pre-Closing', task: 'Final walkthrough scheduled with buyer', responsible: 'Buyer Agent', days_from_acceptance: -1, category: 'Inspection', required: true },
    { phase: 'Pre-Closing', task: 'Final walkthrough completed — confirm property condition unchanged', responsible: 'Buyer Agent', days_from_acceptance: -1, category: 'Inspection', required: true },
    { phase: 'Pre-Closing', task: 'Remind buyer and seller to submit change of address at least 1 week before moving', responsible: 'TC', days_from_acceptance: -7, category: 'Communication', required: true },
    { phase: 'Closing', task: 'Confirm loan funded by lender', responsible: 'TC', days_from_acceptance: 0, category: 'Finance', required: true },
    { phase: 'Closing', task: 'Confirm deed recorded with county recorder', responsible: 'TC', days_from_acceptance: 0, category: 'Title', required: true },
    { phase: 'Closing', task: 'Confirm keys transferred to buyer', responsible: 'Listing Agent', days_from_acceptance: 0, category: 'Possession', required: true },
    { phase: 'Closing', task: 'Send closing confirmation to all parties', responsible: 'TC', days_from_acceptance: 0, category: 'Communication', required: true },
    { phase: 'Closing', task: 'Confirm commission disbursement to brokerages', responsible: 'TC', days_from_acceptance: 0, category: 'Finance', required: true },
    { phase: 'Closing', task: 'Send TC Invoice to Escrow', responsible: 'TC', days_from_acceptance: 0, category: 'Finance', required: true },
    { phase: 'Post-Closing', task: 'Upload final Settlement Statement to transaction file', responsible: 'TC', days_from_acceptance: 1, category: 'Documents', required: true },
    { phase: 'Post-Closing', task: 'Prepare client file — electronic and/or hardcopy (USB)', responsible: 'TC', days_from_acceptance: 2, category: 'Documents', required: true },
    { phase: 'Post-Closing', task: 'Confirm all documents uploaded and file is complete', responsible: 'TC', days_from_acceptance: 3, category: 'Documents', required: true },
    { phase: 'Post-Closing', task: 'Submit complete transaction file to broker for review', responsible: 'TC', days_from_acceptance: 3, category: 'Compliance', required: true },
    { phase: 'Post-Closing', task: 'Send thank you and review request to buyer and seller', responsible: 'Agent', days_from_acceptance: 3, category: 'Communication', required: false },
  ]

  const sellerTasks: any[] = [
    { phase: 'Contract Received', task: 'Change MLS status to Pending', responsible: 'Listing Agent', days_from_acceptance: 1, category: 'MLS', required: true },
    { phase: 'Contract Received', task: 'Write Open Escrow Letters and contact info — send to escrow and buyer agent (do not include seller info)', responsible: 'TC', days_from_acceptance: 1, category: 'Escrow', required: true },
    { phase: 'Contract Received', task: 'Send Seller Congratulations Letter — escrow info with RPA and all deadlines', responsible: 'TC', days_from_acceptance: 1, category: 'Communication', required: true },
    { phase: 'Disclosures', task: 'Transfer Disclosure Statement (TDS) — seller to complete and deliver to buyer within 7 days', responsible: 'Listing Agent', days_from_acceptance: 7, category: 'CA Required Disclosure', required: true },
    { phase: 'Disclosures', task: 'Seller Property Questionnaire (SPQ) — seller to complete', responsible: 'Listing Agent', days_from_acceptance: 7, category: 'CA Required Disclosure', required: true },
    { phase: 'Disclosures', task: 'Send seller Hazard Disclosures and NHD Report for review', responsible: 'TC', days_from_acceptance: 5, category: 'CA Required Disclosure', required: true },
    { phase: 'Disclosures', task: 'SOLAR disclosure (if applicable)', responsible: 'Listing Agent', days_from_acceptance: 7, category: 'CA Required Disclosure', required: false },
    { phase: 'Disclosures', task: 'Fire Hardening and Defensible Space disclosure (FHDS)', responsible: 'Listing Agent', days_from_acceptance: 7, category: 'CA Required Disclosure', required: false },
    { phase: 'Disclosures', task: 'Send Tips for a Smoother Home Inspection to seller', responsible: 'TC', days_from_acceptance: 5, category: 'Communication', required: true },
    { phase: 'Disclosures', task: 'Receive buyer agent AVID — send to seller for signatures', responsible: 'TC', days_from_acceptance: 10, category: 'CA Required Disclosure', required: true },
    { phase: 'Disclosures', task: 'Receive signed disclosures back from buyer — confirm all signed within 7 days', responsible: 'TC', days_from_acceptance: 7, category: 'CA Required Disclosure', required: true },
    { phase: 'Inspections', task: 'Schedule or verify termite inspection and clearance', responsible: 'TC', days_from_acceptance: 3, category: 'Inspection', required: true },
    { phase: 'Loan & Appraisal', task: 'Verify buyer signing of loan docs — appointment scheduled and completed', responsible: 'TC', days_from_acceptance: 14, category: 'Finance', required: true },
    { phase: 'Pre-Closing', task: 'Verify home warranty was ordered', responsible: 'TC', days_from_acceptance: -5, category: 'Admin', required: true },
    { phase: 'Pre-Closing', task: 'Check with escrow to confirm nothing missing', responsible: 'TC', days_from_acceptance: -5, category: 'Escrow', required: true },
  ]

  const buyerTasks: any[] = [
    { phase: 'Contract Received', task: 'Send Buyer Welcome Letter — escrow info with fully executed contract', responsible: 'TC', days_from_acceptance: 1, category: 'Communication', required: true },
    { phase: 'Contract Received', task: 'Send Transaction Team Welcome Letter to lender', responsible: 'TC', days_from_acceptance: 1, category: 'Communication', required: true },
    { phase: 'Contract Received', task: 'Instructions to buyer on getting deposit to escrow', responsible: 'TC', days_from_acceptance: 1, category: 'Finance', required: true },
    { phase: 'Contract Received', task: 'Verify buyer initial deposit sent to escrow — notify seller', responsible: 'TC', days_from_acceptance: 3, category: 'Finance', required: true },
    { phase: 'Disclosures', task: 'Buyer Representation Agreement (BRBC/PSRA) — verify on file', responsible: 'Buyer Agent', days_from_acceptance: 1, category: 'CA Required Disclosure', required: true },
    { phase: 'Disclosures', task: 'Prepare disclosures for buyer signatures — include AVID', responsible: 'TC', days_from_acceptance: 3, category: 'CA Required Disclosure', required: true },
    { phase: 'Disclosures', task: 'Send Combined Hazards Disclosure to buyer', responsible: 'TC', days_from_acceptance: 5, category: 'CA Required Disclosure', required: true },
    { phase: 'Disclosures', task: 'Obtain property tax sheet (CT) — signed receipt for Mello-Roos if $1,000+', responsible: 'TC', days_from_acceptance: 7, category: 'CA Required Disclosure', required: true },
    { phase: 'Disclosures', task: 'Send disclosures for buyer signatures — within 7 days of acceptance', responsible: 'TC', days_from_acceptance: 7, category: 'CA Required Disclosure', required: true },
    { phase: 'Disclosures', task: 'Obtain all disclosures from listing agent — within 7 days of acceptance', responsible: 'TC', days_from_acceptance: 7, category: 'CA Required Disclosure', required: true },
    { phase: 'Disclosures', task: 'Receive listing agent AVID', responsible: 'TC', days_from_acceptance: 7, category: 'CA Required Disclosure', required: true },
    { phase: 'Disclosures', task: 'Receive all signed disclosures back from buyer', responsible: 'TC', days_from_acceptance: 10, category: 'CA Required Disclosure', required: true },
    { phase: 'Disclosures', task: 'SOLAR disclosure received and signed (if applicable)', responsible: 'TC', days_from_acceptance: 7, category: 'CA Required Disclosure', required: false },
    { phase: 'Disclosures', task: 'Fire Hardening and Defensible Space disclosure (FHDS) received — 2010+ homes', responsible: 'TC', days_from_acceptance: 7, category: 'CA Required Disclosure', required: false },
    { phase: 'Inspections', task: 'Verify termite inspection and clearance — have buyer sign off', responsible: 'TC', days_from_acceptance: 10, category: 'Inspection', required: true },
    { phase: 'Inspections', task: 'Home warranty included/ordered — check with agent', responsible: 'TC', days_from_acceptance: 5, category: 'Admin', required: true },
    { phase: 'Loan & Appraisal', task: 'Confirm buyer submitted complete loan application', responsible: 'TC', days_from_acceptance: 3, category: 'Finance', required: true },
    { phase: 'Loan & Appraisal', task: 'Appraisal ordered by lender', responsible: 'Lender', days_from_acceptance: 5, category: 'Appraisal', required: true },
    { phase: 'Loan & Appraisal', task: 'Appraisal completed and report received', responsible: 'Lender', days_from_acceptance: 14, category: 'Appraisal', required: true },
    { phase: 'Loan & Appraisal', task: 'Review appraisal — confirm value meets or exceeds purchase price', responsible: 'TC', days_from_acceptance: 15, category: 'Appraisal', required: true },
    { phase: 'Loan & Appraisal', task: 'Appraisal contingency removal signed by buyer', responsible: 'Buyer Agent', days_from_acceptance: 17, category: 'Contingency', required: true },
    { phase: 'Loan & Appraisal', task: 'Loan conditional approval received', responsible: 'Lender', days_from_acceptance: 14, category: 'Finance', required: true },
    { phase: 'Loan & Appraisal', task: 'All loan conditions satisfied and submitted to underwriting', responsible: 'Lender', days_from_acceptance: 18, category: 'Finance', required: true },
    { phase: 'Loan & Appraisal', task: 'Final loan approval (clear to close) received', responsible: 'Lender', days_from_acceptance: 21, category: 'Finance', required: true },
    { phase: 'Loan & Appraisal', task: 'Loan contingency removal signed by buyer', responsible: 'Buyer Agent', days_from_acceptance: 21, category: 'Contingency', required: true },
    { phase: 'Pre-Closing', task: 'Have buyer arrange homeowners insurance per contingency 17', responsible: 'TC', days_from_acceptance: -10, category: 'Insurance', required: true },
    { phase: 'Pre-Closing', task: 'Send Buyer 2nd Letter after contingency period', responsible: 'TC', days_from_acceptance: 18, category: 'Communication', required: true },
    { phase: 'Pre-Closing', task: 'Send Buyer 3rd Letter after 17-day contingency removal', responsible: 'TC', days_from_acceptance: 22, category: 'Communication', required: true },
    { phase: 'Pre-Closing', task: 'Have buyer start setting up utilities (allconnect.com) — send utilities setup doc', responsible: 'TC', days_from_acceptance: -7, category: 'Communication', required: true },
    { phase: 'Pre-Closing', task: 'Check with escrow to confirm nothing missing', responsible: 'TC', days_from_acceptance: -5, category: 'Escrow', required: true },
    { phase: 'Pre-Closing', task: 'Request list of utilities from listing agent if outside standard area', responsible: 'TC', days_from_acceptance: -10, category: 'Communication', required: false },
  ]

  const tasks = [...sharedTasks, ...(isSeller ? sellerTasks : buyerTasks)]

  const tasksWithDates = tasks.map((t: any) => {
    let due_date: string
    if (t.days_from_acceptance <= 0) {
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

  return NextResponse.json({ success: true, taskCount: tasksWithDates.length, transactionType: isSeller ? 'seller' : 'buyer' })
}
