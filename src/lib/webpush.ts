/**
 * Web Push 전송 유틸리티
 * web-push 라이브러리 기반 (npm install web-push 필요)
 */

// web-push 타입 선언 (설치 전 빌드 오류 방지)
// eslint-disable-next-line @typescript-eslint/no-require-imports
const webpush = require('web-push')

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY!
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin@gchs.ac.kr'

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)

export interface PushSubscription {
  endpoint: string
  keys: { p256dh: string; auth: string }
}

export async function sendWebPush(
  subscription: PushSubscription,
  payload: string
): Promise<{ ok: boolean; status: number; text: () => Promise<string> }> {
  try {
    const result = await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.keys.p256dh, auth: subscription.keys.auth },
      },
      payload,
      { TTL: 86400 }
    )
    return {
      ok: result.statusCode >= 200 && result.statusCode < 300,
      status: result.statusCode,
      text: async () => result.body || '',
    }
  } catch (err: any) {
    return {
      ok: false,
      status: err?.statusCode ?? 500,
      text: async () => err?.body ?? String(err),
    }
  }
}
