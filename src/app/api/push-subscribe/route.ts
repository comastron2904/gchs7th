import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// POST /api/push-subscribe
// body: { studentId: string, subscription: PushSubscriptionJSON }
export async function POST(req: NextRequest) {
  try {
    const { studentId, subscription } = await req.json()

    if (!studentId || !subscription?.endpoint) {
      return NextResponse.json({ error: '필수 파라미터 누락' }, { status: 400 })
    }

    // 해당 학생의 push_subscriptions를 upsert (endpoint 기준)
    // 기존 다른 기기 구독은 모두 삭제 후 최신 기기만 유지
    await supabase
      .from('push_subscriptions')
      .delete()
      .eq('student_id', studentId)

    const { error } = await supabase.from('push_subscriptions').insert({
      student_id: studentId,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys?.p256dh ?? '',
      auth: subscription.keys?.auth ?? '',
      updated_at: new Date().toISOString(),
    })

    if (error) {
      console.error('Supabase insert error:', error)
      return NextResponse.json({ error: '구독 저장 실패' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('push-subscribe error:', err)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}

// DELETE /api/push-subscribe
// body: { studentId: string }
export async function DELETE(req: NextRequest) {
  try {
    const { studentId } = await req.json()
    if (!studentId) return NextResponse.json({ error: '학번 필요' }, { status: 400 })

    await supabase.from('push_subscriptions').delete().eq('student_id', studentId)
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('push-unsubscribe error:', err)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}
