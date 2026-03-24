import { NextRequest, NextResponse } from 'next/server'
import { createServerClient2 } from '@/lib/supabase-server'

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
        { type: 'text', text: `You are an expert real estate transaction coordinator. Analyze this document and respond ONLY with valid JSON (no markdown) with this structure: {"summary":"2-3 sentence summary","parties":{"buyer":null,"seller":null,"buyerAgent":null,"sellerAgent":null,"titleCompany":null,"lender":null},"keyTerms":{"purchasePrice":null,"closingDate":null,"earnestMoney":null,"downPayment":null,"loanAmount":null,"propertyAddress":null,"propertyType":null},"contingencies":[{"name":"string","deadline":null,"status":"pending"}],"criticalDates":[{"label":"string","date":"string","daysUntil":0}],"actionItems":[{"priority":"high","task":"string","responsible":"agent"}],"risks":[{"severity":"high","issue":"string"}],"documentType":"Purchase Agreement","completionScore":85,"transactionUpdates":{"property_address":null,"purchase_price":null,"closing_date":null,"status":null}} Today is ${new Date().toISOString().split('T')[0]}. IMPORTANT: For transactionUpdates, extract actual values from the document — purchase_price as a number (e.g. 742500), closing_date as YYYY-MM-DD (e.g. 2026-04-28), property_address as a full string, status as one of: pending, contract, inspection, closed, cancelled. Only include fields you found, leave others as null.` }
      ]
    } else {
      messageContent = [
        { type: 'text', text: `You are an expert real estate transaction coordinator. I have a real estate document called "${fileName}". Respond ONLY with valid JSON (no markdown): {"summary":"2-3 sentence summary","parties":{"buyer":null,"seller":null,"buyerAgent":null,"sellerAgent":null,"titleCompany":null,"lender":null},"keyTerms":{"purchasePrice":null,"closingDate":null,"earnestMoney":null,"downPayment":null,"loanAmount":null,"propertyAddress":null,"propertyType":null},"contingencies":[{"name":"string","deadline":null,"status":"pending"}],"criticalDates":[{"label":"string","date":"string","daysUntil":0}],"actionItems":[{"priority":"high","task":"string","responsible":"agent"}],"risks":[{"severity":"medium","issue":"string"}],"documentType":"Closing Disclosure","completionScore":75,"transactionUpdates":{"property_address":null,"purchase_price":null,"closing_date":null,"status":null}} Today is ${new Date().toISOString().split('T')[0]}.` }
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
          await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'https://klovex.app'}/api/generate-checklist`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Cookie': req.headers.get('cookie') || '' },
            body: JSON.stringify({
              transactionId,
              acceptanceDate: txData.created_at,
              closingDate: txData.closing_date,
              propertyAddress: txData.property_address,
              transactionType: txData.transaction_type,
              hasHOA: false,
              yearBuilt: analysis.keyTerms?.yearBuilt || null,
              isSeptic: false,
            })
          })
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

    return NextResponse.json({ analysis })
  } catch (error: any) {
    console.error('Analysis error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
