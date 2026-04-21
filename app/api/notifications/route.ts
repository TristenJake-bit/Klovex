import { NextRequest, NextResponse } from 'next/server'
import { createServerClient2 } from '@/lib/supabase-server'

// GET — fetch user's notifications
export async function GET() {
  const supabase = await createServerClient2()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: notifications } = await (supabase as any)
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(30)

  const unreadCount = (notifications || []).filter((n: any) => !n.read).length

  return NextResponse.json({ notifications: notifications || [], unreadCount })
}

// PATCH — mark notifications as read
export async function PATCH(req: NextRequest) {
  const supabase = await createServerClient2()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { ids, all } = await req.json()

  if (all) {
    await (supabase as any)
      .from('notifications')
      .update({ read: true })
      .eq('user_id', user.id)
      .eq('read', false)
  } else if (ids && ids.length > 0) {
    await (supabase as any)
      .from('notifications')
      .update({ read: true })
      .eq('user_id', user.id)
      .in('id', ids)
  }

  return NextResponse.json({ success: true })
}
