import { NextRequest, NextResponse } from 'next/server'
import { createServerClient2 } from '@/lib/supabase-server'
import { createClient } from '@supabase/supabase-js'
import { txSharedTasks, txSellerTasks, txBuyerTasks } from '@/lib/checklists/texas'
import { flSharedTasks, flSellerTasks, flBuyerTasks } from '@/lib/checklists/florida'
import { generalSharedTasks, generalSellerTasks, generalBuyerTasks } from '@/lib/checklists/general'
import { parseDateOnly, toDateString, addDaysToDate } from '@/lib/dates'

export async function POST(req: NextRequest) {
  const authClient = await createServerClient2()
  const { data: { session } } = await authClient.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { transactionId, acceptanceDate, closingDate, propertyAddress, transactionType, state, yearBuilt, hasHOA, isSeptic, representation: reqRepresentation, templateId } = await req.json()
  if (!transactionId) return NextResponse.json({ error: 'No transactionId' }, { status: 400 })

  // If a user template is specified, use its tasks instead of the default checklist
  if (templateId) {
    const { data: template } = await (supabase as any)
      .from('checklist_templates')
      .select('*')
      .eq('id', templateId)
      .single()

    if (template && Array.isArray(template.tasks)) {
      await (supabase as any).from('transaction_checklists').delete().eq('transaction_id', transactionId)

      const acceptStr = acceptanceDate || toDateString(new Date())
      const closeStr = closingDate || addDaysToDate(acceptStr, 30)

      const tasksWithDates = template.tasks.map((t: any) => {
        let due_date: string
        const dfa = t.days_from_acceptance ?? 0
        if (dfa <= 0) { due_date = addDaysToDate(closeStr, dfa) }
        else if (t.phase === 'Closing') { due_date = closeStr }
        else { due_date = addDaysToDate(acceptStr, dfa) }
        return {
          task: t.task,
          phase: t.phase,
          responsible: t.responsible || 'TC',
          category: t.category || '',
          required: t.required !== false,
          side: t.side || 'both',
          is_custom: t.is_custom || false,
          transaction_id: transactionId,
          due_date,
          completed: false,
        }
      })

      const { error } = await (supabase as any).from('transaction_checklists').insert(tasksWithDates)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ success: true, taskCount: tasksWithDates.length, template: template.name })
    }
  }

  const acceptanceStr = acceptanceDate || toDateString(new Date())
  const closingStr = closingDate || addDaysToDate(acceptanceStr, 30)

  function daysFromAcceptance(days: number): string {
    return addDaysToDate(acceptanceStr, days)
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
      if (t.days_from_acceptance <= 0) { due_date = addDaysToDate(closingStr, t.days_from_acceptance) }
      else if (t.phase === 'Closing') { due_date = closingStr }
      else { due_date = daysFromAcceptance(t.days_from_acceptance) }
      return { ...t, transaction_id: transactionId, due_date, completed: false, side: t.side || 'both' }
    })
    const { error } = await (supabase as any).from('transaction_checklists').insert(tasksWithDates)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true, taskCount: tasksWithDates.length, transactionType: isSeller ? 'seller' : 'buyer', state: 'TX' })
  }

  if (txState === 'FL') {
    const tasks = [...flSharedTasks, ...(isSeller ? flSellerTasks : flBuyerTasks)]
    const tasksWithDates = tasks.map((t: any) => {
      let due_date: string
      if (t.days_from_acceptance <= 0) { due_date = addDaysToDate(closingStr, t.days_from_acceptance) }
      else if (t.phase === 'Closing') { due_date = closingStr }
      else { due_date = daysFromAcceptance(t.days_from_acceptance) }
      return { ...t, transaction_id: transactionId, due_date, completed: false, side: t.side || 'both' }
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
      if (t.days_from_acceptance <= 0) { due_date = addDaysToDate(closingStr, t.days_from_acceptance) }
      else if (t.phase === 'Closing') { due_date = closingStr }
      else { due_date = daysFromAcceptance(t.days_from_acceptance) }
      return { ...t, transaction_id: transactionId, due_date, completed: false, side: t.side || 'both' }
    })
    const { error } = await (supabase as any).from('transaction_checklists').insert(tasksWithDates)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true, taskCount: tasksWithDates.length, transactionType: isSeller ? 'seller' : 'buyer', state: txState })
  }

  // California checklist — every task tagged with side: 'both', 'buyer', or 'seller'
  // Side assignment based on California TC practice:
  //   - 'both': TC administrative tasks both sides need (RPA review, escrow, closing, post-close)
  //   - 'buyer': buyer-agent TC tasks (EMD, lender coordination, loan tracking, buyer letters, buyer contingencies)
  //   - 'seller': listing-side TC tasks (MLS, seller disclosures TDS/SPQ, seller letters, listing-side inspection)

  const allCATasks: any[] = [
    // ===== CONTRACT RECEIVED =====
    { phase: 'Contract Received', task: 'Review Purchase Agreement (RPA) for completeness and all signatures', responsible: 'TC', days_from_acceptance: 1, category: 'Contract Review', required: true, side: 'both' },
    { phase: 'Contract Received', task: 'Verify all pages initialed and dated correctly', responsible: 'TC', days_from_acceptance: 1, category: 'Contract Review', required: true, side: 'both' },
    { phase: 'Contract Received', task: 'Calculate all contingency deadlines and enter into calendar — copy agents', responsible: 'TC', days_from_acceptance: 1, category: 'Deadlines', required: true, side: 'both' },
    { phase: 'Contract Received', task: 'Send Transaction Team Welcome Letter to all parties (escrow, agents, lender)', responsible: 'TC', days_from_acceptance: 1, category: 'Communication', required: true, side: 'both' },
    { phase: 'Contract Received', task: 'Open escrow — send signed RPA and commission instructions to title company', responsible: 'TC', days_from_acceptance: 1, category: 'Escrow', required: true, side: 'both' },
    { phase: 'Contract Received', task: 'Send RPA copy to all parties', responsible: 'TC', days_from_acceptance: 1, category: 'Documents', required: true, side: 'both' },
    // Buyer-side contract received
    { phase: 'Contract Received', task: 'Confirm earnest money deposit deadline with buyer agent', responsible: 'TC', days_from_acceptance: 1, category: 'Finance', required: true, side: 'buyer' },
    { phase: 'Contract Received', task: 'Verify earnest money deposit received by escrow', responsible: 'TC', days_from_acceptance: 3, category: 'Finance', required: true, side: 'buyer' },
    { phase: 'Contract Received', task: 'Obtain copy of EMD receipt from escrow', responsible: 'TC', days_from_acceptance: 3, category: 'Finance', required: true, side: 'buyer' },
    { phase: 'Contract Received', task: 'Confirm lender has copy of executed contract', responsible: 'TC', days_from_acceptance: 2, category: 'Finance', required: true, side: 'buyer' },
    { phase: 'Contract Received', task: 'Send Buyer Welcome Letter — escrow info with fully executed contract', responsible: 'TC', days_from_acceptance: 1, category: 'Communication', required: true, side: 'buyer' },
    { phase: 'Contract Received', task: 'Send Transaction Team Welcome Letter to lender', responsible: 'TC', days_from_acceptance: 1, category: 'Communication', required: true, side: 'buyer' },
    { phase: 'Contract Received', task: 'Instructions to buyer on getting deposit to escrow', responsible: 'TC', days_from_acceptance: 1, category: 'Finance', required: true, side: 'buyer' },
    { phase: 'Contract Received', task: 'Verify buyer initial deposit sent to escrow — notify seller', responsible: 'TC', days_from_acceptance: 3, category: 'Finance', required: true, side: 'buyer' },
    // Seller-side contract received
    { phase: 'Contract Received', task: 'Change MLS status to Pending', responsible: 'Listing Agent', days_from_acceptance: 1, category: 'MLS', required: true, side: 'seller' },
    { phase: 'Contract Received', task: 'Write Open Escrow Letters and contact info — send to escrow and buyer agent (do not include seller info)', responsible: 'TC', days_from_acceptance: 1, category: 'Escrow', required: true, side: 'seller' },
    { phase: 'Contract Received', task: 'Send Seller Congratulations Letter — escrow info with RPA and all deadlines', responsible: 'TC', days_from_acceptance: 1, category: 'Communication', required: true, side: 'seller' },

    // ===== DISCLOSURES =====
    // Both-side disclosures (NHD, AVID, prelim title are part of every CA transaction)
    { phase: 'Disclosures', task: 'Natural Hazard Disclosure (NHD) — order report, copy escrow', responsible: 'TC', days_from_acceptance: 3, category: 'CA Required Disclosure', required: true, side: 'both' },
    { phase: 'Disclosures', task: 'Agent Visual Inspection Disclosure (AVID) — both agents to complete', responsible: 'Both Agents', days_from_acceptance: 7, category: 'CA Required Disclosure', required: true, side: 'both' },
    { phase: 'Disclosures', task: 'Start disclosures in GLIDE', responsible: 'TC', days_from_acceptance: 1, category: 'CA Required Disclosure', required: true, side: 'both' },
    { phase: 'Disclosures', task: 'Send NHD Report and signature receipt noting Hazard Disclosure Receipt', responsible: 'TC', days_from_acceptance: 5, category: 'CA Required Disclosure', required: true, side: 'both' },
    { phase: 'Disclosures', task: 'Send preliminary title report to all parties', responsible: 'TC', days_from_acceptance: 7, category: 'Title', required: true, side: 'both' },
    ...(isPrePost1978 ? [{ phase: 'Disclosures', task: 'Lead-Based Paint Disclosure (LPD) — MANDATORY for homes built before 1978', responsible: 'Both Agents', days_from_acceptance: 3, category: 'Federal Required', required: true, side: 'both' }] : []),
    // Buyer-side disclosures (receiving disclosures, buyer advisory, buyer signatures)
    { phase: 'Disclosures', task: 'Statewide Buyer and Seller Advisory (SBSA) — deliver to buyer', responsible: 'Buyer Agent', days_from_acceptance: 3, category: 'CA Required Disclosure', required: true, side: 'buyer' },
    { phase: 'Disclosures', task: 'Market Conditions Advisory (MCA) — deliver to buyer', responsible: 'Buyer Agent', days_from_acceptance: 3, category: 'CA Required Disclosure', required: true, side: 'buyer' },
    { phase: 'Disclosures', task: 'Buyer Representation Agreement (BRBC/PSRA) — verify on file', responsible: 'Buyer Agent', days_from_acceptance: 1, category: 'CA Required Disclosure', required: true, side: 'buyer' },
    { phase: 'Disclosures', task: 'Prepare disclosures for buyer signatures — include AVID', responsible: 'TC', days_from_acceptance: 3, category: 'CA Required Disclosure', required: true, side: 'buyer' },
    { phase: 'Disclosures', task: 'Send Combined Hazards Disclosure to buyer', responsible: 'TC', days_from_acceptance: 5, category: 'CA Required Disclosure', required: true, side: 'buyer' },
    { phase: 'Disclosures', task: 'Obtain property tax sheet (CT) — signed receipt for Mello-Roos if $1,000+', responsible: 'TC', days_from_acceptance: 7, category: 'CA Required Disclosure', required: true, side: 'buyer' },
    { phase: 'Disclosures', task: 'Send disclosures for buyer signatures — within 7 days of acceptance', responsible: 'TC', days_from_acceptance: 7, category: 'CA Required Disclosure', required: true, side: 'buyer' },
    { phase: 'Disclosures', task: 'Obtain all disclosures from listing agent — within 7 days of acceptance', responsible: 'TC', days_from_acceptance: 7, category: 'CA Required Disclosure', required: true, side: 'buyer' },
    { phase: 'Disclosures', task: 'Receive listing agent AVID', responsible: 'TC', days_from_acceptance: 7, category: 'CA Required Disclosure', required: true, side: 'buyer' },
    { phase: 'Disclosures', task: 'Receive all signed disclosures back from buyer', responsible: 'TC', days_from_acceptance: 10, category: 'CA Required Disclosure', required: true, side: 'buyer' },
    { phase: 'Disclosures', task: 'SOLAR disclosure received and signed (if applicable)', responsible: 'TC', days_from_acceptance: 7, category: 'CA Required Disclosure', required: false, side: 'buyer' },
    { phase: 'Disclosures', task: 'Fire Hardening and Defensible Space disclosure (FHDS) received — 2010+ homes', responsible: 'TC', days_from_acceptance: 7, category: 'CA Required Disclosure', required: false, side: 'buyer' },
    ...(hasHOA ? [
      { phase: 'Disclosures', task: 'HOA Disclosure Package — buyer review period (3 days to cancel)', responsible: 'TC', days_from_acceptance: 8, category: 'HOA', required: true, side: 'buyer' },
    ] : []),
    // Seller-side disclosures (seller prepares TDS, SPQ, provides disclosures)
    { phase: 'Disclosures', task: 'Smoke Detector and Water Heater Compliance statement', responsible: 'Seller', days_from_acceptance: 7, category: 'CA Required Disclosure', required: true, side: 'seller' },
    { phase: 'Disclosures', task: 'Mello-Roos / 1915 Bond Act disclosure (if applicable)', responsible: 'Listing Agent', days_from_acceptance: 7, category: 'CA Required Disclosure', required: true, side: 'seller' },
    ...(isPrePost1960 ? [{ phase: 'Disclosures', task: 'Earthquake Hazards Report (ERQ) — required for pre-1960 construction', responsible: 'Listing Agent', days_from_acceptance: 7, category: 'CA Required Disclosure', required: true, side: 'seller' }] : []),
    ...(hasHOA ? [
      { phase: 'Disclosures', task: 'HOA Documents — CC&Rs, Bylaws, Rules, Budget, Reserve Study', responsible: 'Listing Agent', days_from_acceptance: 5, category: 'HOA', required: true, side: 'seller' },
      { phase: 'Disclosures', task: 'Verify HOA fee and that escrow ordered HOA docs', responsible: 'TC', days_from_acceptance: 5, category: 'HOA', required: true, side: 'seller' },
    ] : []),
    { phase: 'Disclosures', task: 'Transfer Disclosure Statement (TDS) — seller to complete and deliver to buyer within 7 days', responsible: 'Listing Agent', days_from_acceptance: 7, category: 'CA Required Disclosure', required: true, side: 'seller' },
    { phase: 'Disclosures', task: 'Seller Property Questionnaire (SPQ) — seller to complete', responsible: 'Listing Agent', days_from_acceptance: 7, category: 'CA Required Disclosure', required: true, side: 'seller' },
    { phase: 'Disclosures', task: 'Send seller Hazard Disclosures and NHD Report for review', responsible: 'TC', days_from_acceptance: 5, category: 'CA Required Disclosure', required: true, side: 'seller' },
    { phase: 'Disclosures', task: 'SOLAR disclosure (if applicable)', responsible: 'Listing Agent', days_from_acceptance: 7, category: 'CA Required Disclosure', required: false, side: 'seller' },
    { phase: 'Disclosures', task: 'Fire Hardening and Defensible Space disclosure (FHDS)', responsible: 'Listing Agent', days_from_acceptance: 7, category: 'CA Required Disclosure', required: false, side: 'seller' },
    { phase: 'Disclosures', task: 'Send Tips for a Smoother Home Inspection to seller', responsible: 'TC', days_from_acceptance: 5, category: 'Communication', required: true, side: 'seller' },
    { phase: 'Disclosures', task: 'Receive buyer agent AVID — send to seller for signatures', responsible: 'TC', days_from_acceptance: 10, category: 'CA Required Disclosure', required: true, side: 'seller' },
    { phase: 'Disclosures', task: 'Receive signed disclosures back from buyer — confirm all signed within 7 days', responsible: 'TC', days_from_acceptance: 7, category: 'CA Required Disclosure', required: true, side: 'seller' },

    // ===== INSPECTIONS =====
    // Buyer-side inspections (scheduling, reviewing, contingency removal)
    { phase: 'Inspections', task: 'Schedule home inspection — within inspection contingency period', responsible: 'Buyer Agent', days_from_acceptance: 3, category: 'Inspection', required: true, side: 'buyer' },
    { phase: 'Inspections', task: 'Home inspection completed', responsible: 'Buyer', days_from_acceptance: 10, category: 'Inspection', required: true, side: 'buyer' },
    { phase: 'Inspections', task: 'Review inspection report and prepare Request for Repair (RR) if needed', responsible: 'Buyer Agent', days_from_acceptance: 12, category: 'Inspection', required: true, side: 'buyer' },
    { phase: 'Inspections', task: 'Inspection contingency removal or cancellation signed', responsible: 'Buyer Agent', days_from_acceptance: 17, category: 'Contingency', required: true, side: 'buyer' },
    { phase: 'Inspections', task: 'Verify termite inspection and clearance — have buyer sign off', responsible: 'TC', days_from_acceptance: 10, category: 'Inspection', required: true, side: 'buyer' },
    { phase: 'Inspections', task: 'Home warranty included/ordered — check with agent', responsible: 'TC', days_from_acceptance: 5, category: 'Admin', required: true, side: 'buyer' },
    // Both-side inspections (pest inspection, negotiation)
    { phase: 'Inspections', task: 'Pest/Termite inspection ordered', responsible: 'TC', days_from_acceptance: 3, category: 'Inspection', required: true, side: 'both' },
    { phase: 'Inspections', task: 'Termite inspection report received and reviewed', responsible: 'TC', days_from_acceptance: 10, category: 'Inspection', required: true, side: 'both' },
    { phase: 'Inspections', task: 'Negotiate inspection repairs/credits with seller', responsible: 'Both Agents', days_from_acceptance: 14, category: 'Inspection', required: true, side: 'both' },
    ...(isSeptic ? [{ phase: 'Inspections', task: 'Order septic pump and certification (SWPI)', responsible: 'TC', days_from_acceptance: 5, category: 'Inspection', required: true, side: 'both' }] : []),
    // Seller-side inspections
    { phase: 'Inspections', task: 'Schedule or verify termite inspection and clearance', responsible: 'TC', days_from_acceptance: 3, category: 'Inspection', required: true, side: 'seller' },

    // ===== TITLE =====
    { phase: 'Title', task: 'Preliminary Title Report ordered', responsible: 'TC', days_from_acceptance: 3, category: 'Title', required: true, side: 'both' },
    { phase: 'Title', task: 'Preliminary Title Report received and reviewed', responsible: 'TC', days_from_acceptance: 7, category: 'Title', required: true, side: 'both' },
    { phase: 'Title', task: 'Confirm no unexpected liens, encumbrances, or clouds on title', responsible: 'TC', days_from_acceptance: 7, category: 'Title', required: true, side: 'both' },
    { phase: 'Title', task: 'Confirm vesting instructions received by escrow', responsible: 'TC', days_from_acceptance: 14, category: 'Title', required: true, side: 'both' },
    { phase: 'Title', task: 'Title contingency removal signed by buyer', responsible: 'Buyer Agent', days_from_acceptance: 10, category: 'Contingency', required: true, side: 'buyer' },
    { phase: 'Title', task: 'FIRPTA / CA Withholding forms completed (if seller is foreign national)', responsible: 'Listing Agent', days_from_acceptance: 14, category: 'Title', required: false, side: 'seller' },

    // ===== LOAN & APPRAISAL (buyer-side — seller TC only tracks from their perspective) =====
    { phase: 'Loan & Appraisal', task: 'Confirm buyer submitted complete loan application', responsible: 'TC', days_from_acceptance: 3, category: 'Finance', required: true, side: 'buyer' },
    { phase: 'Loan & Appraisal', task: 'Appraisal ordered by lender', responsible: 'Lender', days_from_acceptance: 5, category: 'Appraisal', required: true, side: 'buyer' },
    { phase: 'Loan & Appraisal', task: 'Appraisal completed and report received', responsible: 'Lender', days_from_acceptance: 14, category: 'Appraisal', required: true, side: 'buyer' },
    { phase: 'Loan & Appraisal', task: 'Review appraisal — confirm value meets or exceeds purchase price', responsible: 'TC', days_from_acceptance: 15, category: 'Appraisal', required: true, side: 'buyer' },
    { phase: 'Loan & Appraisal', task: 'Appraisal contingency removal signed by buyer', responsible: 'Buyer Agent', days_from_acceptance: 17, category: 'Contingency', required: true, side: 'buyer' },
    { phase: 'Loan & Appraisal', task: 'Loan conditional approval received', responsible: 'Lender', days_from_acceptance: 14, category: 'Finance', required: true, side: 'buyer' },
    { phase: 'Loan & Appraisal', task: 'All loan conditions satisfied and submitted to underwriting', responsible: 'Lender', days_from_acceptance: 18, category: 'Finance', required: true, side: 'buyer' },
    { phase: 'Loan & Appraisal', task: 'Final loan approval (clear to close) received', responsible: 'Lender', days_from_acceptance: 21, category: 'Finance', required: true, side: 'buyer' },
    { phase: 'Loan & Appraisal', task: 'Loan contingency removal signed by buyer', responsible: 'Buyer Agent', days_from_acceptance: 21, category: 'Contingency', required: true, side: 'buyer' },
    // Seller-side loan tracking (listing TC still tracks loan progress from their side)
    { phase: 'Loan & Appraisal', task: 'Verify buyer signing of loan docs — appointment scheduled and completed', responsible: 'TC', days_from_acceptance: 14, category: 'Finance', required: true, side: 'seller' },

    // ===== PRE-CLOSING =====
    { phase: 'Pre-Closing', task: 'Confirm all contingencies have been removed in writing', responsible: 'TC', days_from_acceptance: 22, category: 'Contingency', required: true, side: 'both' },
    { phase: 'Pre-Closing', task: 'Confirm wire instructions with escrow officer via phone (fraud prevention)', responsible: 'TC', days_from_acceptance: -3, category: 'Finance', required: true, side: 'both' },
    { phase: 'Pre-Closing', task: 'Schedule seller signing appointment with escrow/notary', responsible: 'TC', days_from_acceptance: -3, category: 'Signing', required: true, side: 'both' },
    { phase: 'Pre-Closing', task: 'Remind buyer and seller to submit change of address at least 1 week before moving', responsible: 'TC', days_from_acceptance: -7, category: 'Communication', required: true, side: 'both' },
    // Buyer-side pre-closing
    { phase: 'Pre-Closing', task: 'Closing Disclosure (CD) issued to buyer — 3 business day waiting period', responsible: 'Lender', days_from_acceptance: -5, category: 'Finance', required: true, side: 'buyer' },
    { phase: 'Pre-Closing', task: 'Confirm homeowners insurance policy bound and lender notified', responsible: 'Buyer', days_from_acceptance: -5, category: 'Insurance', required: true, side: 'buyer' },
    { phase: 'Pre-Closing', task: 'Confirm buyer wire transfer sent to escrow', responsible: 'TC', days_from_acceptance: -2, category: 'Finance', required: true, side: 'buyer' },
    { phase: 'Pre-Closing', task: 'Loan documents sent from lender to escrow', responsible: 'Lender', days_from_acceptance: -3, category: 'Finance', required: true, side: 'buyer' },
    { phase: 'Pre-Closing', task: 'Schedule buyer signing appointment with escrow/notary', responsible: 'TC', days_from_acceptance: -3, category: 'Signing', required: true, side: 'buyer' },
    { phase: 'Pre-Closing', task: 'Final walkthrough scheduled with buyer', responsible: 'Buyer Agent', days_from_acceptance: -1, category: 'Inspection', required: true, side: 'buyer' },
    { phase: 'Pre-Closing', task: 'Final walkthrough completed — confirm property condition unchanged', responsible: 'Buyer Agent', days_from_acceptance: -1, category: 'Inspection', required: true, side: 'buyer' },
    { phase: 'Pre-Closing', task: 'Have buyer arrange homeowners insurance per contingency 17', responsible: 'TC', days_from_acceptance: -10, category: 'Insurance', required: true, side: 'buyer' },
    { phase: 'Pre-Closing', task: 'Send Buyer 2nd Letter after contingency period', responsible: 'TC', days_from_acceptance: 18, category: 'Communication', required: true, side: 'buyer' },
    { phase: 'Pre-Closing', task: 'Send Buyer 3rd Letter after 17-day contingency removal', responsible: 'TC', days_from_acceptance: 22, category: 'Communication', required: true, side: 'buyer' },
    { phase: 'Pre-Closing', task: 'Have buyer start setting up utilities (allconnect.com) — send utilities setup doc', responsible: 'TC', days_from_acceptance: -7, category: 'Communication', required: true, side: 'buyer' },
    { phase: 'Pre-Closing', task: 'Check with escrow to confirm nothing missing', responsible: 'TC', days_from_acceptance: -5, category: 'Escrow', required: true, side: 'buyer' },
    { phase: 'Pre-Closing', task: 'Request list of utilities from listing agent if outside standard area', responsible: 'TC', days_from_acceptance: -10, category: 'Communication', required: false, side: 'buyer' },
    // Seller-side pre-closing
    { phase: 'Pre-Closing', task: 'Verify home warranty was ordered', responsible: 'TC', days_from_acceptance: -5, category: 'Admin', required: true, side: 'seller' },
    { phase: 'Pre-Closing', task: 'Check with escrow to confirm nothing missing', responsible: 'TC', days_from_acceptance: -5, category: 'Escrow', required: true, side: 'seller' },

    // ===== CLOSING (both sides) =====
    { phase: 'Closing', task: 'Confirm loan funded by lender', responsible: 'TC', days_from_acceptance: 0, category: 'Finance', required: true, side: 'both' },
    { phase: 'Closing', task: 'Confirm deed recorded with county recorder', responsible: 'TC', days_from_acceptance: 0, category: 'Title', required: true, side: 'both' },
    { phase: 'Closing', task: 'Confirm keys transferred to buyer', responsible: 'Listing Agent', days_from_acceptance: 0, category: 'Possession', required: true, side: 'both' },
    { phase: 'Closing', task: 'Send closing confirmation to all parties', responsible: 'TC', days_from_acceptance: 0, category: 'Communication', required: true, side: 'both' },
    { phase: 'Closing', task: 'Confirm commission disbursement to brokerages', responsible: 'TC', days_from_acceptance: 0, category: 'Finance', required: true, side: 'both' },
    { phase: 'Closing', task: 'Send TC Invoice to Escrow', responsible: 'TC', days_from_acceptance: 0, category: 'Finance', required: true, side: 'both' },

    // ===== POST-CLOSING (both sides) =====
    { phase: 'Post-Closing', task: 'Upload final Settlement Statement to transaction file', responsible: 'TC', days_from_acceptance: 1, category: 'Documents', required: true, side: 'both' },
    { phase: 'Post-Closing', task: 'Prepare client file — electronic and/or hardcopy (USB)', responsible: 'TC', days_from_acceptance: 2, category: 'Documents', required: true, side: 'both' },
    { phase: 'Post-Closing', task: 'Confirm all documents uploaded and file is complete', responsible: 'TC', days_from_acceptance: 3, category: 'Documents', required: true, side: 'both' },
    { phase: 'Post-Closing', task: 'Submit complete transaction file to broker for review', responsible: 'TC', days_from_acceptance: 3, category: 'Compliance', required: true, side: 'both' },
    { phase: 'Post-Closing', task: 'Send thank you and review request to buyer and seller', responsible: 'Agent', days_from_acceptance: 3, category: 'Communication', required: false, side: 'both' },
  ]

  // Determine representation: use explicit param, fall back to transaction record, default to dual
  let rep = reqRepresentation
  if (!rep) {
    const { data: txRec } = await (supabase as any).from('transactions').select('representation').eq('id', transactionId).single()
    rep = txRec?.representation || 'dual'
  }

  // Filter by representation: buyer sees buyer+both, seller sees seller+both, dual sees all
  const tasks = allCATasks.filter(t => {
    if (rep === 'dual') return true
    return t.side === 'both' || t.side === rep
  })

  const tasksWithDates = tasks.map((t: any) => {
    let due_date: string
    if (t.days_from_acceptance <= 0) {
      due_date = addDaysToDate(closingStr, t.days_from_acceptance)
    } else if (t.phase === 'Closing') {
      due_date = closingStr
    } else {
      due_date = daysFromAcceptance(t.days_from_acceptance)
    }
    return { ...t, transaction_id: transactionId, due_date, completed: false }
  })

  const { error } = await (supabase as any).from('transaction_checklists').insert(tasksWithDates)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true, taskCount: tasksWithDates.length, transactionType: isSeller ? 'seller' : 'buyer' })
}
