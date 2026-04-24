import { NextRequest, NextResponse } from 'next/server'
import { createServerClient2 } from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
  const authClient = await createServerClient2()
  const { data: { session } } = await authClient.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { createClient } = await import('@supabase/supabase-js')
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  const { transactionId } = await req.json()
  if (!transactionId) return NextResponse.json({ error: 'Missing transactionId' }, { status: 400 })

  // Get all analyzed documents for this transaction
  const { data: documents } = await (supabase as any)
    .from('documents')
    .select('id, name')
    .eq('transaction_id', transactionId)

  if (!documents || documents.length < 2) {
    return NextResponse.json({ error: 'Need at least 2 documents to compare' }, { status: 400 })
  }

  // Get analyses for all documents
  const docIds = documents.map((d: any) => d.id)
  const { data: analysesData } = await (supabase as any)
    .from('document_analyses')
    .select('document_id, analysis')
    .in('document_id', docIds)

  if (!analysesData || analysesData.length < 2) {
    return NextResponse.json({ error: 'Need at least 2 analyzed documents to compare' }, { status: 400 })
  }

  // Build a summary of each document's key data for the AI prompt
  const docSummaries = analysesData.map((a: any) => {
    const doc = documents.find((d: any) => d.id === a.document_id)
    return {
      documentName: doc?.name || 'Unknown',
      documentId: a.document_id,
      analysis: a.analysis,
    }
  })

  const prompt = `You are an expert real estate transaction coordinator. I have ${docSummaries.length} analyzed documents from the same transaction. Compare them and find any discrepancies or inconsistencies.

Here are the document analyses:

${docSummaries.map((d: any, i: number) => `--- Document ${i + 1}: "${d.documentName}" ---
${JSON.stringify(d.analysis, null, 2)}`).join('\n\n')}

Respond ONLY with valid JSON (no markdown):
{
  "discrepancies": [
    {
      "field": "string (e.g. 'Purchase Price', 'Closing Date', 'Buyer Name')",
      "documents": ["doc name 1", "doc name 2"],
      "values": ["value in doc 1", "value in doc 2"],
      "severity": "high" | "medium" | "low",
      "description": "Brief explanation of the discrepancy and which value is likely correct"
    }
  ],
  "summary": "1-2 sentence overall comparison summary",
  "consistentFields": ["list of fields that match across all documents"]
}

Check for discrepancies in: purchase price, closing date, earnest money, down payment, loan amount, property address, buyer/seller names, agent names, lender, title company, contingency deadlines, and any other key terms. If no discrepancies are found, return an empty discrepancies array.`

  try {
    const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-opus-4-5',
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    const anthropicData = await anthropicResponse.json()
    if (!anthropicResponse.ok) throw new Error(anthropicData.error?.message || 'Anthropic API error')

    const responseText = anthropicData.content[0].text
    let comparison
    try { comparison = JSON.parse(responseText) } catch { const m = responseText.match(/\{[\s\S]*\}/); comparison = m ? JSON.parse(m[0]) : { discrepancies: [], summary: 'Unable to parse comparison results' } }

    // Log to timeline
    const discrepancyCount = comparison.discrepancies?.length || 0
    await (supabase as any).from('timeline_events').insert({
      transaction_id: transactionId,
      author_id: session.user.id,
      type: 'ai_analysis',
      content: discrepancyCount > 0
        ? `🔍 AI compared ${docSummaries.length} documents — found ${discrepancyCount} discrepanc${discrepancyCount === 1 ? 'y' : 'ies'}`
        : `🔍 AI compared ${docSummaries.length} documents — no discrepancies found`,
    })

    return NextResponse.json({ comparison })
  } catch (error: any) {
    console.error('Comparison error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
