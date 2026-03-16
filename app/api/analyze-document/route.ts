import { NextRequest, NextResponse } from 'next/server'
import { createServerClient2 } from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
  const supabase = await createServerClient2()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { documentId, documentUrl, documentName } = await req.json()
  if (!documentUrl) return NextResponse.json({ error: 'No document URL' }, { status: 400 })

  try {
    const docResponse = await fetch(documentUrl)
    const docBuffer = await docResponse.arrayBuffer()
    const base64Doc = Buffer.from(docBuffer).toString('base64')
    const mimeType = documentName?.endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream'

    const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY!, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: 'claude-opus-4-5',
        max_tokens: 2000,
        messages: [{
          role: 'user',
          content: [
            { type: 'document', source: { type: 'base64', media_type: mimeType, data: base64Doc } },
            { type: 'text', text: `You are an expert real estate transaction coordinator. Analyze this document and respond ONLY with valid JSON (no markdown) with this structure:
{"summary":"2-3 sentence summary","parties":{"buyer":null,"seller":null,"buyerAgent":null,"sellerAgent":null,"titleCompany":null,"lender":null},"keyTerms":{"purchasePrice":null,"closingDate":null,"earnestMoney":null,"downPayment":null,"loanAmount":null,"propertyAddress":null,"propertyType":null},"contingencies":[{"name":"string","deadline":null,"status":"pending"}],"criticalDates":[{"label":"string","date":"string","daysUntil":0}],"actionItems":[{"priority":"high","task":"string","responsible":"agent"}],"risks":[{"severity":"high","issue":"string"}],"documentType":"Purchase Agreement","completionScore":85}
Today is ${new Date().toISOString().split('T')[0]}. Extract real data. Use null for missing fields.` }
          ]
        }]
      })
    })

    const anthropicData = await anthropicResponse.json()
    const analysisText = anthropicData.content[0].text
    let analysis
    try { analysis = JSON.parse(analysisText) } catch { const m = analysisText.match(/\{[\s\S]*\}/); analysis = m ? JSON.parse(m[0]) : {} }

    await (supabase as any).from('document_analyses').upsert({ document_id: documentId, analysis, analyzed_at: new Date().toISOString() })
    return NextResponse.json({ analysis })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
