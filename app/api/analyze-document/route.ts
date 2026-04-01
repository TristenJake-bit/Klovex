import { NextRequest, NextResponse } from 'next/server'
import { createServerClient2 } from '@/lib/supabase-server'
import { sendAgentAlert } from '@/lib/email'

export async function POST(req: NextRequest) {
  const supabase = await createServerClient2()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { documentId, documentUrl, documentName, transactionId } = await req.json()
  if (!documentUrl) return NextResponse.json({ error: 'No document URL' }, { status: 400 })

  try {
    const docResponse = await fetch(documentUrl)
    const docBuffer = await docResponse.arrayBuffer()
    const base64Doc = Buffer.from(docBuffer).toString('base64')
    const fileName = documentName || ''
    const isPDF = fileName.toLowerCase().endsWith('.pdf')
    
    let messageContent: any[]
    
    if (isPDF) {
      messageContent = [
        { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64Doc } },
        { type: 'text', text: `You are an expert real estate transaction coordinator. Analyze this document and respond ONLY with valid JSON (no markdown) with this structure: {"summary":"2-3 sentence summary","parties":{"buyer":null,"seller":null,"buyerAgent":null,"sellerAgent":null,"titleCompany":null,"lender":null},"keyTerms":{"purchasePrice":null,"closingDate":null,"earnestMoney":null,"downPayment":null,"loanAmount":null,"propertyAddress":null,"propertyType":null},"contingencies":[{"name":"string","deadline":null,"status":"pending"}],"criticalDates":[{"label":"string","date":"string","daysUntil":0}],"actionItems":[{"priority":"high","task":"string","responsible":"agent"}],"risks":[{"severity":"high","issue":"string"}],"documentType":"Purchase Agreement","completionScore":85,"completenessIssues":[{"type":"missing_signature","description":"string","severity":"high"}],"transactionUpdates":{"property_address":null,"purchase_price":null,"closing_date":null,"status":null}} Today is ${new Date().toISOString().split('T')[0]}. IMPORTANT: For transactionUpdates, extract actual values from the document — purchase_price as a number (e.g. 742500), closing_date as YYYY-MM-DD (e.g. 2026-04-28), property_address as a full string, status as one of: pending, contract, inspection, closed, cancelled. Only include fields you found, leave others as null. For completenessIssues, check for: missing_signature (unsigned fields, missing initials), missing_date (blank date fields), blank_field (required fields left empty), inconsistency (conflicting info like mismatched names, prices, or dates). Severity is "high" for missing signatures and critical blank fields, "medium" for minor issues. Return an empty array if no issues found.` }
      ]
    } else {
      messageContent = [
        { type: 'text', text: `You are an expert real estate transaction coordinator. I have a real estate document called "${fileName}". Respond ONLY with valid JSON (no markdown): {"summary":"2-3 sentence summary","parties":{"buyer":null,"seller":null,"buyerAgent":null,"sellerAgent":null,"titleCompany":null,"lender":null},"keyTerms":{"purchasePrice":null,"closingDate":null,"earnestMoney":null,"downPayment":null,"loanAmount":null,"propertyAddress":null,"propertyType":null},"contingencies":[{"name":"string","deadline":null,"status":"pending"}],"criticalDates":[{"label":"string","date":"string","daysUntil":0}],"actionItems":[{"priority":"high","task":"string","responsible":"agent"}],"risks":[{"severity":"medium","issue":"string"}],"documentType":"Closing Disclosure","completionScore":75,"completenessIssues":[{"type":"missing_signature","description":"string","severity":"high"}],"transactionUpdates":{"property_address":null,"purchase_price":null,"closing_date":null,"status":null}} Today is ${new Date().toISOString().split('T')[0]}. For completenessIssues, check for: missing_signature (unsigned fields, missing initials), missing_date (blank date fields), blank_field (required fields left empty), inconsistency (conflicting info like mismatched names, prices, or dates). Severity is "high" for missing signatures and critical blank fields, "medium" for minor issues. Return an empty array if no issues found.` }
      ]
    }

    const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY!, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: 'claude-opus-4-5', max_tokens: 2000, messages: [{ role: 'user', content: messageContent }] })
    })

    const anthropicData = await anthropicResponse.json()
    if (!anthropicResponse.ok) throw new Error(anthropicData.error?.message || 'Anthropic API error')
    
    const analysisText = anthropicData.content[0].text
    let analysis
    try { analysis = JSON.parse(analysisText) } catch { const m = analysisText.match(/\{[\s\S]*\}/); analysis = m ? JSON.parse(m[0]) : {} }

    await (supabase as any).from('document_analyses').upsert({ document_id: documentId, analysis, analyzed_at: new Date().toISOString() })

    if (transactionId && analysis.transactionUpdates) {
      const updates = analysis.transactionUpdates
      const fieldsToUpdate: Record<string, any> = {}
      const changes: { field: string; label: string; from: any; to: any }[] = []

      const { data: currentTx } = await (supabase as any).from('transactions').select('*').eq('id', transactionId).single()

      if (currentTx) {
        if (updates.purchase_price && Number(updates.purchase_price) !== Number(currentTx.purchase_price)) {
          fieldsToUpdate.purchase_price = Number(updates.purchase_price)
          changes.push({ field: 'purchase_price', label: 'Purchase Price', from: currentTx.purchase_price, to: updates.purchase_price })
        }
        if (updates.closing_date && updates.closing_date !== currentTx.closing_date) {
          fieldsToUpdate.closing_date = updates.closing_date
          changes.push({ field: 'closing_date', label: 'Closing Date', from: currentTx.closing_date, to: updates.closing_date })
        }
        if (updates.property_address && updates.property_address !== currentTx.property_address) {
          fieldsToUpdate.property_address = updates.property_address
          changes.push({ field: 'property_address', label: 'Property Address', from: currentTx.property_address, to: updates.property_address })
        }
        if (updates.status && updates.status !== currentTx.status) {
          fieldsToUpdate.status = updates.status
          changes.push({ field: 'status', label: 'Status', from: currentTx.status, to: updates.status })
        }

        if (Object.keys(fieldsToUpdate).length > 0) {
          await (supabase as any).from('transactions').update(fieldsToUpdate).eq('id', transactionId)
          const changeText = changes.map(c => `${c.label}: ${c.from} → ${c.to}`).join(', ')
          await (supabase as any).from('timeline_events').insert({
            transaction_id: transactionId,
            author_id: session.user.id,
            type: 'ai_update',
            content: `🤖 AI auto-updated from "${fileName}": ${changeText}`
          })
          analysis.changes = changes
        }
      }
    }

    // Auto-generate checklist if transaction exists and no checklist yet
    if (transactionId) {
      const { data: existingChecklist } = await (supabase as any)
        .from('transaction_checklists')
        .select('id')
        .eq('transaction_id', transactionId)
        .limit(1)

      if (!existingChecklist || existingChecklist.length === 0) {
        const { data: txData } = await (supabase as any)
          .from('transactions')
          .select('*')
          .eq('id', transactionId)
          .single()

        if (txData) {
          const acceptance = new Date(txData.created_at)
          const closing = txData.closing_date ? new Date(txData.closing_date) : new Date(acceptance.getTime() + 30 * 24 * 60 * 60 * 1000)
          const isSeller = txData.transaction_type === 'sale'

          function daysFrom(days: number): string {
            const d = new Date(acceptance)
            d.setDate(d.getDate() + days)
            return d.toISOString().split('T')[0]
          }

          function closingOffset(days: number): string {
            const d = new Date(closing)
            d.setDate(d.getDate() + days)
            return d.toISOString().split('T')[0]
          }

          const baseTasks = [
            { phase: 'Contract Received', task: 'Review Purchase Agreement (RPA) for completeness and all signatures', responsible: 'TC', days_from_acceptance: 1, category: 'Contract Review', required: true },
            { phase: 'Contract Received', task: 'Verify all pages initialed and dated correctly', responsible: 'TC', days_from_acceptance: 1, category: 'Contract Review', required: true },
            { phase: 'Contract Received', task: 'Calculate all contingency deadlines and enter into calendar — copy agents', responsible: 'TC', days_from_acceptance: 1, category: 'Deadlines', required: true },
            { phase: 'Contract Received', task: 'Send Transaction Team Welcome Letter to all parties', responsible: 'TC', days_from_acceptance: 1, category: 'Communication', required: true },
            { phase: 'Contract Received', task: 'Open escrow — send signed RPA and commission instructions to title company', responsible: 'TC', days_from_acceptance: 1, category: 'Escrow', required: true },
            { phase: 'Contract Received', task: 'Confirm earnest money deposit deadline with buyer agent', responsible: 'TC', days_from_acceptance: 1, category: 'Finance', required: true },
            { phase: 'Contract Received', task: 'Verify earnest money deposit received by escrow', responsible: 'TC', days_from_acceptance: 3, category: 'Finance', required: true },
            { phase: 'Contract Received', task: 'Obtain copy of EMD receipt from escrow', responsible: 'TC', days_from_acceptance: 3, category: 'Finance', required: true },
            { phase: 'Contract Received', task: 'Confirm lender has copy of executed contract', responsible: 'TC', days_from_acceptance: 2, category: 'Finance', required: true },
            { phase: 'Disclosures', task: 'Natural Hazard Disclosure (NHD) — order report, copy escrow', responsible: 'TC', days_from_acceptance: 3, category: 'CA Required Disclosure', required: true },
            { phase: 'Disclosures', task: 'Agent Visual Inspection Disclosure (AVID) — both agents to complete', responsible: 'Both Agents', days_from_acceptance: 7, category: 'CA Required Disclosure', required: true },
            { phase: 'Disclosures', task: 'Statewide Buyer and Seller Advisory (SBSA) — deliver to buyer', responsible: 'Buyer Agent', days_from_acceptance: 3, category: 'CA Required Disclosure', required: true },
            { phase: 'Disclosures', task: 'Market Conditions Advisory (MCA) — deliver to buyer', responsible: 'Buyer Agent', days_from_acceptance: 3, category: 'CA Required Disclosure', required: true },
            { phase: 'Disclosures', task: 'Smoke Detector and Water Heater Compliance statement', responsible: 'Seller', days_from_acceptance: 7, category: 'CA Required Disclosure', required: true },
            { phase: 'Disclosures', task: 'Start disclosures in GLIDE', responsible: 'TC', days_from_acceptance: 1, category: 'CA Required Disclosure', required: true },
            { phase: 'Disclosures', task: 'Send NHD Report and signature receipt noting Hazard Disclosure Receipt', responsible: 'TC', days_from_acceptance: 5, category: 'CA Required Disclosure', required: true },
            { phase: 'Disclosures', task: 'Send preliminary title report to all parties', responsible: 'TC', days_from_acceptance: 7, category: 'Title', required: true },
            { phase: 'Inspections', task: 'Schedule home inspection — within inspection contingency period', responsible: 'Buyer Agent', days_from_acceptance: 3, category: 'Inspection', required: true },
            { phase: 'Inspections', task: 'Home inspection completed', responsible: 'Buyer', days_from_acceptance: 10, category: 'Inspection', required: true },
            { phase: 'Inspections', task: 'Pest/Termite inspection ordered', responsible: 'TC', days_from_acceptance: 3, category: 'Inspection', required: true },
            { phase: 'Inspections', task: 'Termite inspection report received and reviewed', responsible: 'TC', days_from_acceptance: 10, category: 'Inspection', required: true },
            { phase: 'Inspections', task: 'Review inspection report and prepare Request for Repair (RR) if needed', responsible: 'Buyer Agent', days_from_acceptance: 12, category: 'Inspection', required: true },
            { phase: 'Inspections', task: 'Inspection contingency removal or cancellation signed', responsible: 'Buyer Agent', days_from_acceptance: 17, category: 'Contingency', required: true },
            { phase: 'Title', task: 'Preliminary Title Report ordered', responsible: 'TC', days_from_acceptance: 3, category: 'Title', required: true },
            { phase: 'Title', task: 'Preliminary Title Report received and reviewed', responsible: 'TC', days_from_acceptance: 7, category: 'Title', required: true },
            { phase: 'Title', task: 'Confirm no unexpected liens, encumbrances, or clouds on title', responsible: 'TC', days_from_acceptance: 7, category: 'Title', required: true },
            { phase: 'Title', task: 'Title contingency removal signed by buyer', responsible: 'Buyer Agent', days_from_acceptance: 10, category: 'Contingency', required: true },
            { phase: 'Title', task: 'Confirm vesting instructions received by escrow', responsible: 'TC', days_from_acceptance: 14, category: 'Title', required: true },
            { phase: 'Pre-Closing', task: 'Confirm all contingencies have been removed in writing', responsible: 'TC', days_from_acceptance: 22, category: 'Contingency', required: true },
            { phase: 'Pre-Closing', task: 'Confirm wire instructions with escrow officer via phone', responsible: 'TC', days_from_acceptance: -3, category: 'Finance', required: true },
            { phase: 'Pre-Closing', task: 'Schedule buyer signing appointment with escrow/notary', responsible: 'TC', days_from_acceptance: -3, category: 'Signing', required: true },
            { phase: 'Pre-Closing', task: 'Schedule seller signing appointment with escrow/notary', responsible: 'TC', days_from_acceptance: -3, category: 'Signing', required: true },
            { phase: 'Pre-Closing', task: 'Final walkthrough scheduled with buyer', responsible: 'Buyer Agent', days_from_acceptance: -1, category: 'Inspection', required: true },
            { phase: 'Pre-Closing', task: 'Remind buyer and seller to submit change of address 1 week before moving', responsible: 'TC', days_from_acceptance: -7, category: 'Communication', required: true },
            { phase: 'Closing', task: 'Confirm loan funded by lender', responsible: 'TC', days_from_acceptance: 0, category: 'Finance', required: true },
            { phase: 'Closing', task: 'Confirm deed recorded with county recorder', responsible: 'TC', days_from_acceptance: 0, category: 'Title', required: true },
            { phase: 'Closing', task: 'Confirm keys transferred to buyer', responsible: 'Listing Agent', days_from_acceptance: 0, category: 'Possession', required: true },
            { phase: 'Closing', task: 'Send closing confirmation to all parties', responsible: 'TC', days_from_acceptance: 0, category: 'Communication', required: true },
            { phase: 'Closing', task: 'Send TC Invoice to Escrow', responsible: 'TC', days_from_acceptance: 0, category: 'Finance', required: true },
            { phase: 'Post-Closing', task: 'Upload final Settlement Statement to transaction file', responsible: 'TC', days_from_acceptance: 1, category: 'Documents', required: true },
            { phase: 'Post-Closing', task: 'Confirm all documents uploaded and file is complete', responsible: 'TC', days_from_acceptance: 3, category: 'Documents', required: true },
            { phase: 'Post-Closing', task: 'Submit complete transaction file to broker for review', responsible: 'TC', days_from_acceptance: 3, category: 'Compliance', required: true },
          ]

          const sellerExtra = [
            { phase: 'Contract Received', task: 'Change MLS status to Pending', responsible: 'Listing Agent', days_from_acceptance: 1, category: 'MLS', required: true },
            { phase: 'Contract Received', task: 'Send Seller Congratulations Letter — escrow info with RPA and all deadlines', responsible: 'TC', days_from_acceptance: 1, category: 'Communication', required: true },
            { phase: 'Disclosures', task: 'Transfer Disclosure Statement (TDS) — seller to complete and deliver to buyer within 7 days', responsible: 'Listing Agent', days_from_acceptance: 7, category: 'CA Required Disclosure', required: true },
            { phase: 'Disclosures', task: 'Seller Property Questionnaire (SPQ) — seller to complete', responsible: 'Listing Agent', days_from_acceptance: 7, category: 'CA Required Disclosure', required: true },
            { phase: 'Disclosures', task: 'Send Tips for a Smoother Home Inspection to seller', responsible: 'TC', days_from_acceptance: 5, category: 'Communication', required: true },
            { phase: 'Disclosures', task: 'Receive buyer agent AVID — send to seller for signatures', responsible: 'TC', days_from_acceptance: 10, category: 'CA Required Disclosure', required: true },
            { phase: 'Pre-Closing', task: 'Verify home warranty was ordered', responsible: 'TC', days_from_acceptance: -5, category: 'Admin', required: true },
          ]

          const buyerExtra = [
            { phase: 'Contract Received', task: 'Send Buyer Welcome Letter — escrow info with fully executed contract', responsible: 'TC', days_from_acceptance: 1, category: 'Communication', required: true },
            { phase: 'Contract Received', task: 'Instructions to buyer on getting deposit to escrow', responsible: 'TC', days_from_acceptance: 1, category: 'Finance', required: true },
            { phase: 'Disclosures', task: 'Buyer Representation Agreement (BRBC/PSRA) — verify on file', responsible: 'Buyer Agent', days_from_acceptance: 1, category: 'CA Required Disclosure', required: true },
            { phase: 'Disclosures', task: 'Prepare disclosures for buyer signatures — include AVID', responsible: 'TC', days_from_acceptance: 3, category: 'CA Required Disclosure', required: true },
            { phase: 'Disclosures', task: 'Send disclosures for buyer signatures — within 7 days of acceptance', responsible: 'TC', days_from_acceptance: 7, category: 'CA Required Disclosure', required: true },
            { phase: 'Disclosures', task: 'Receive all signed disclosures back from buyer', responsible: 'TC', days_from_acceptance: 10, category: 'CA Required Disclosure', required: true },
            { phase: 'Loan & Appraisal', task: 'Confirm buyer submitted complete loan application', responsible: 'TC', days_from_acceptance: 3, category: 'Finance', required: true },
            { phase: 'Loan & Appraisal', task: 'Appraisal ordered by lender', responsible: 'Lender', days_from_acceptance: 5, category: 'Appraisal', required: true },
            { phase: 'Loan & Appraisal', task: 'Final loan approval (clear to close) received', responsible: 'Lender', days_from_acceptance: 21, category: 'Finance', required: true },
            { phase: 'Loan & Appraisal', task: 'Loan contingency removal signed by buyer', responsible: 'Buyer Agent', days_from_acceptance: 21, category: 'Contingency', required: true },
            { phase: 'Pre-Closing', task: 'Send Buyer 2nd Letter after contingency period', responsible: 'TC', days_from_acceptance: 18, category: 'Communication', required: true },
            { phase: 'Pre-Closing', task: 'Have buyer start setting up utilities', responsible: 'TC', days_from_acceptance: -7, category: 'Communication', required: true },
          ]

          const allTasks = [...baseTasks, ...(isSeller ? sellerExtra : buyerExtra)]

          const tasksWithDates = allTasks.map((t: any) => {
            let due_date: string
            if (t.days_from_acceptance <= 0) {
              due_date = closingOffset(t.days_from_acceptance)
            } else if (t.phase === 'Closing') {
              due_date = closing.toISOString().split('T')[0]
            } else {
              due_date = daysFrom(t.days_from_acceptance)
            }
            return { ...t, transaction_id: transactionId, due_date, completed: false }
          })

          await (supabase as any).from('transaction_checklists').insert(tasksWithDates)

          // Now auto-complete tasks based on document type
          const docTypeToTasks: Record<string, string[]> = {
            'Purchase Agreement': [
              'Review Purchase Agreement (RPA) for completeness and all signatures',
              'Verify all pages initialed and dated correctly',
              'Open escrow — send signed RPA and commission instructions to title company',
            ],
            'Natural Hazard Disclosure': [
              'Natural Hazard Disclosure (NHD) — order report, copy escrow',
              'Send NHD Report and signature receipt noting Hazard Disclosure Receipt',
            ],
            'Transfer Disclosure Statement': ['Transfer Disclosure Statement (TDS) — seller to complete and deliver to buyer within 7 days'],
            'Seller Property Questionnaire': ['Seller Property Questionnaire (SPQ) — seller to complete'],
            'Preliminary Title Report': ['Preliminary Title Report ordered', 'Preliminary Title Report received and reviewed'],
            'Home Inspection Report': ['Home inspection completed', 'Review inspection report and prepare Request for Repair (RR) if needed'],
            'Termite Report': ['Pest/Termite inspection ordered', 'Termite inspection report received and reviewed'],
            'Home Warranty': ['Home warranty included/ordered — check with agent', 'Verify home warranty was ordered'],
            'Buyer Representation Agreement': ['Buyer Representation Agreement (BRBC/PSRA) — verify on file'],
            'Lead Paint Disclosure': ['Lead-Based Paint Disclosure (LPD) — MANDATORY for homes built before 1978'],
            'Closing Disclosure': ['Closing Disclosure (CD) issued to buyer — 3 business day waiting period'],
            'Settlement Statement': ['Upload final Settlement Statement to transaction file'],
          }

          const matchingTasks = docTypeToTasks[analysis.documentType] || []
          if (matchingTasks.length > 0) {
            await (supabase as any)
              .from('transaction_checklists')
              .update({ completed: true, completed_at: new Date().toISOString() })
              .eq('transaction_id', transactionId)
              .in('task', matchingTasks)
          }
        }
      }

      // Auto-mark tasks complete based on document type
      if (analysis.documentType) {
        const docTypeToTasks: Record<string, string[]> = {
          'Purchase Agreement': ['Review Purchase Agreement (RPA) for completeness and all signatures', 'Verify all pages initialed and dated correctly', 'Send Residential Purchase Agreement (RPA) copy to all parties'],
          'Natural Hazard Disclosure': ['Natural Hazard Disclosure (NHD) — order report, copy escrow', 'Send NHD Report and signature receipt noting Hazard Disclosure Receipt'],
          'Transfer Disclosure Statement': ['Transfer Disclosure Statement (TDS) — seller to complete and deliver to buyer within 7 days'],
          'Seller Property Questionnaire': ['Seller Property Questionnaire (SPQ) — seller to complete'],
          'Preliminary Title Report': ['Preliminary Title Report ordered', 'Preliminary Title Report received and reviewed'],
          'Home Inspection Report': ['Home inspection completed', 'Review inspection report and prepare Request for Repair (RR) if needed'],
          'Termite Report': ['Pest/Termite inspection ordered', 'Termite inspection report received and reviewed'],
          'Home Warranty': ['Home warranty included/ordered — check with agent', 'Verify home warranty was ordered'],
          'Buyer Representation Agreement': ['Buyer Representation Agreement (BRBC/PSRA) — verify on file'],
          'Lead Paint Disclosure': ['Lead-Based Paint Disclosure (LPD) — MANDATORY for homes built before 1978'],
          'HOA Documents': ['HOA Documents — CC&Rs, Bylaws, Rules, Budget, Reserve Study'],
          'Closing Disclosure': ['Closing Disclosure (CD) issued to buyer — 3 business day waiting period'],
          'Settlement Statement': ['Upload final Settlement Statement to transaction file'],
        }

        const matchingTasks = docTypeToTasks[analysis.documentType] || []
        if (matchingTasks.length > 0) {
          await (supabase as any)
            .from('transaction_checklists')
            .update({ completed: true, completed_at: new Date().toISOString() })
            .eq('transaction_id', transactionId)
            .in('task', matchingTasks)
        }
      }
    }

    // Log key findings to timeline
    if (transactionId) {
      const timelineEntries: { transaction_id: string; author_id: string; type: string; content: string }[] = []

      // Summary timeline entry
      if (analysis.summary) {
        timelineEntries.push({
          transaction_id: transactionId,
          author_id: session.user.id,
          type: 'ai_analysis',
          content: `📄 AI analyzed "${fileName}" (${analysis.documentType || 'Document'}): ${analysis.summary}`
        })
      }

      // High-severity risks
      const highRisks = (analysis.risks || []).filter((r: any) => r.severity === 'high')
      if (highRisks.length > 0) {
        timelineEntries.push({
          transaction_id: transactionId,
          author_id: session.user.id,
          type: 'ai_risk',
          content: `🚨 AI found ${highRisks.length} high-risk item${highRisks.length > 1 ? 's' : ''}: ${highRisks.map((r: any) => r.issue).join(' · ')}`
        })
      }

      // Urgent critical dates (within 14 days)
      const urgentDates = (analysis.criticalDates || []).filter((d: any) => d.daysUntil != null && d.daysUntil <= 14)
      if (urgentDates.length > 0) {
        timelineEntries.push({
          transaction_id: transactionId,
          author_id: session.user.id,
          type: 'ai_deadline',
          content: `📅 Upcoming deadlines: ${urgentDates.map((d: any) => `${d.label} (${d.date}${d.daysUntil <= 0 ? ' — TODAY' : ` — ${d.daysUntil}d`})`).join(' · ')}`
        })
      }

      // High-priority action items
      const highActions = (analysis.actionItems || []).filter((a: any) => a.priority === 'high')
      if (highActions.length > 0) {
        timelineEntries.push({
          transaction_id: transactionId,
          author_id: session.user.id,
          type: 'ai_action',
          content: `⚡ ${highActions.length} high-priority action${highActions.length > 1 ? 's' : ''}: ${highActions.map((a: any) => a.task).join(' · ')}`
        })
      }

      if (timelineEntries.length > 0) {
        await (supabase as any).from('timeline_events').insert(timelineEntries)
      }
    }

    // Send agent notification if findings warrant it
    if (transactionId && (analysis.risks || analysis.actionItems || analysis.criticalDates)) {
      const { data: agentProfile } = await supabase
        .from('profiles')
        .select('email, full_name')
        .eq('id', session.user.id)
        .single<any>()

      if (agentProfile?.email) {
        const { data: txForEmail } = await (supabase as any)
          .from('transactions')
          .select('property_address')
          .eq('id', transactionId)
          .single()

        await sendAgentAlert({
          agentEmail: agentProfile.email,
          agentName: agentProfile.full_name,
          propertyAddress: txForEmail?.property_address || 'Unknown Property',
          transactionId,
          risks: analysis.risks || [],
          actionItems: analysis.actionItems || [],
          summary: analysis.summary || undefined,
          criticalDates: analysis.criticalDates || [],
        }).catch(err => console.error('Email send failed:', err))
      }
    }

    return NextResponse.json({ analysis })
  } catch (error: any) {
    console.error('Analysis error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
