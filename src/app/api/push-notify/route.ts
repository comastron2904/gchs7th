import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendWebPush } from '@/lib/webpush'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// POST /api/push-notify
// body: { studentId: string, title: string, body: string }
// 해당 학생의 최근 등록 기기 구독에만 알림 전송
export async function POST(req: NextRequest) {
  try {
    const { studentId, title, body } = await req.json()

    if (!studentId) {
      return NextResponse.json({ error: '학번 필요' }, { status: 400 })
    }

    // 해당 학생의 구독 정보 조회 (가장 최근 기기)
    const { data: sub, error: fetchError } = await supabase
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth')
      .eq('student_id', studentId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .single()

    if (fetchError || !sub) {
      // 구독 없음 = 앱 미설치 또는 알림 미허용 → 조용히 성공 처리
      return NextResponse.json({ success: true, sent: false, reason: '구독 없음' })
    }

    const payload = JSON.stringify({
      title: title || '기숙사 벌점 알림',
      body: body || '새로운 벌점이 등록되었습니다.',
      url: '/student',
      studentId,
      tag: `demerit-${studentId}-${Date.now()}`,
    })

    const subscription = {
      endpoint: sub.endpoint,
      keys: { p256dh: sub.p256dh, auth: sub.auth },
    }

    const result = await sendWebPush(subscription, payload)

    if (!result.ok) {
      // 410 Gone = 구독 만료 → DB에서 제거
      if (result.status === 410) {
        await supabase.from('push_subscriptions').delete().eq('student_id', studentId)
      }
      console.error('Push send failed:', result.status, await result.text())
      return NextResponse.json({ success: false, status: result.status }, { status: 500 })
    }

    return NextResponse.json({ success: true, sent: true })
  } catch (err) {
    console.error('push-notify error:', err)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}
