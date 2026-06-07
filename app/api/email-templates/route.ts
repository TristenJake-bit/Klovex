import { NextRequest, NextResponse } from 'next/server'
import { createServerClient2 } from '@/lib/supabase-server'

export async function GET() {
  const supabase = await createServerClient2()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await (supabase as any)
    .from('email_templates')
    .select('*')
    .eq('user_id', session.user.id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data || [])
}

export async function POST(req: NextRequest) {
  const supabase = await createServerClient2()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { name, subject, body } = await req.json()
  if (!name || !subject || !body) {
    return NextResponse.json({ error: 'Missing name, subject, or body' }, { status: 400 })
  }

  const { data, error } = await (supabase as any)
    .from('email_templates')
    .insert({ user_id: session.user.id, name, subject, body })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PUT(req: NextRequest) {
  const supabase = await createServerClient2()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, name, subject, body } = await req.json()
  if (!id) return NextResponse.json({ error: 'Missing template id' }, { status: 400 })

  const { data, error } = await (supabase as any)
    .from('email_templates')
    .update({ name, subject, body, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', session.user.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(req: NextRequest) {
  const supabase = await createServerClient2()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'Missing template id' }, { status: 400 })

  const { error } = await (supabase as any)
    .from('email_templates')
    .delete()
    .eq('id', id)
    .eq('user_id', session.user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
