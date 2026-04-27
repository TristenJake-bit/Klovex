import { NextRequest, NextResponse } from 'next/server'
import { createServerClient2 } from '@/lib/supabase-server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  const authClient = await createServerClient2()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  const formData = await req.formData()
  const file = formData.get('file') as File
  const transactionId = formData.get('transactionId') as string

  if (!file || !transactionId) {
    return NextResponse.json({ error: 'Missing file or transactionId' }, { status: 400 })
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const filePath = `${transactionId}/${Date.now()}_${Math.random().toString(36).slice(2)}_${safeName}`

  // Upload to storage
  const arrayBuffer = await file.arrayBuffer()
  const { error: uploadError } = await supabase.storage.from('documents').upload(filePath, arrayBuffer, {
    contentType: file.type,
  })

  if (uploadError) {
    console.error('Storage upload error:', uploadError)
    return NextResponse.json({ error: uploadError.message }, { status: 500 })
  }

  // Get public URL
  const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(filePath)

  // Insert into documents table
  const { data: docData, error: dbError } = await (supabase as any).from('documents').insert({
    transaction_id: transactionId,
    name: file.name,
    url: publicUrl,
    uploaded_by: user.id,
    file_type: file.type,
    file_size: file.size,
  }).select().single()

  if (dbError) {
    console.error('Document insert error:', dbError)
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }

  return NextResponse.json({ document: docData })
}
