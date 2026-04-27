import { NextRequest, NextResponse } from 'next/server'
import { createServerClient2 } from '@/lib/supabase-server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  const authClient = await createServerClient2()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  const { documentId } = await req.json()
  if (!documentId) return NextResponse.json({ error: 'Missing documentId' }, { status: 400 })

  // Get document to find storage path
  const { data: doc } = await (supabase as any).from('documents').select('url, transaction_id, name').eq('id', documentId).single()
  if (!doc) return NextResponse.json({ error: 'Document not found' }, { status: 404 })

  // Delete analysis
  await (supabase as any).from('document_analyses').delete().eq('document_id', documentId)

  // Delete document record
  await (supabase as any).from('documents').delete().eq('id', documentId)

  // Try to delete from storage (extract path from URL)
  try {
    const url = new URL(doc.url)
    const pathMatch = url.pathname.match(/\/storage\/v1\/object\/public\/documents\/(.+)/)
    if (pathMatch) {
      await supabase.storage.from('documents').remove([decodeURIComponent(pathMatch[1])])
    }
  } catch {}

  // Log to timeline
  await (supabase as any).from('timeline_events').insert({
    transaction_id: doc.transaction_id,
    author_id: user.id,
    type: 'note',
    content: `Document deleted: "${doc.name}"`,
  })

  return NextResponse.json({ success: true })
}
