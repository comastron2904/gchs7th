'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { isEnforcedReason, getRuleText } from '@/lib/rules'
import styles from './page.module.css'

interface Student {
  student_id: string
  name: string
  room: string
  gender: string
  study_seat: string
  points: number
}

interface DemeritEntry {
  id: string
  student_id: string
  rule_no: number
  reason: string
  detail: string
  process_type: string
  teacher: string
  note: string
  created_at?: string
}

// Base64URL → Uint8Array (VAPID 공개키 변환용)
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)))
}

export default function StudentPage() {
  const router = useRouter()
  const supabase = createClient()

  const [student, setStudent] = useState<Student | null>(null)
  const [demerits, setDemerits] = useState<DemeritEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [pushStatus, setPushStatus] = useState<'idle' | 'requesting' | 'granted' | 'denied' | 'unsupported'>('idle')
  const [pushMsg, setPushMsg] = useState('')
  const studentIdRef = useRef<string>('')

  const loadData = useCallback(async (id: string) => {
    setLoading(true)
    const [{ data: s }, { data: d }] = await Promise.all([
      supabase.from('students').select('*').eq('student_id', id).single(),
      supabase.from('demerit_entries').select('*').eq('student_id', id).order('created_at', { ascending: false }),
    ])
    if (s) setStudent(s as Student)
    if (d) setDemerits(d as DemeritEntry[])
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    const raw = sessionStorage.getItem('dm_student')
    if (!raw) { router.push('/'); return }
    const { id } = JSON.parse(raw)
    studentIdRef.current = id
    loadData(id)
  }, [router, loadData])

  // 로그인 직후 Push 구독 상태 초기화
  useEffect(() => {
    if (!student) return
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setPushStatus('unsupported')
      return
    }
    const perm = Notification.permission
    if (perm === 'granted') {
      setPushStatus('granted')
      // 이미 허용 → 기기 등록 갱신 (앱 재설치 등 대비)
      registerPushSubscription(student.student_id)
    } else if (perm === 'denied') {
      setPushStatus('denied')
    } else {
      setPushStatus('idle')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [student])

  /** Service Worker를 통해 Push 구독 생성 후 서버에 저장 */
  async function registerPushSubscription(studentId: string) {
    try {
      const reg = await navigator.serviceWorker.ready
      const existing = await reg.pushManager.getSubscription()
      let sub = existing

      if (!sub) {
        const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
        if (!vapidKey) { console.warn('VAPID public key 없음'); return }
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidKey),
        })
      }

      const subJson = sub.toJSON()
      const res = await fetch('/api/push-subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId, subscription: subJson }),
      })

      if (res.ok) {
        setPushMsg('✅ 이 기기에서 벌점 알림을 받습니다')
      } else {
        setPushMsg('⚠ 알림 등록 중 오류가 발생했습니다')
      }
    } catch (err) {
      console.error('push register error:', err)
      setPushMsg('⚠ 알림 등록에 실패했습니다')
    }
  }

  /** 알림 권한 요청 버튼 클릭 */
  async function requestPushPermission() {
    if (!student) return
    setPushStatus('requesting')
    try {
      const permission = await Notification.requestPermission()
      if (permission === 'granted') {
        setPushStatus('granted')
        await registerPushSubscription(student.student_id)
      } else {
        setPushStatus('denied')
        setPushMsg('알림이 거부되었습니다. 브라우저 설정에서 허용해 주세요.')
      }
    } catch (err) {
      console.error('permission error:', err)
      setPushStatus('denied')
    }
  }

  /** 알림 구독 해제 */
  async function unsubscribePush() {
    if (!student) return
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (sub) await sub.unsubscribe()
      await fetch('/api/push-subscribe', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId: student.student_id }),
      })
      setPushStatus('idle')
      setPushMsg('알림 구독이 해제되었습니다')
    } catch (err) {
      console.error('unsubscribe error:', err)
    }
  }

  function pointColor(p: number) {
    if (p === 0) return '#22C55E'
    if (p <= 2) return '#E8913A'
    if (p <= 4) return '#E05252'
    return '#B91C1C'
  }

  function pointLabel(p: number) {
    if (p === 0) return '정상'
    if (p <= 2) return '주의'
    if (p <= 4) return '경고'
    return '위험'
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#9A97A0', fontSize: 14 }}>
      불러오는 중...
    </div>
  )

  if (!student) return null

  const pts = student.points

  return (
    <div className={styles.page}>
      {/* 헤더 */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.logoMark}>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z"/><path d="M9 21V12h6v9"/>
            </svg>
          </div>
          <div>
            <div className={styles.pageTitle}>내 기숙사 현황</div>
            <div className={styles.pageSub}>학생 포털</div>
          </div>
        </div>
        <button className={styles.logoutBtn} onClick={() => { sessionStorage.removeItem('dm_student'); router.push('/') }}>
          로그아웃
        </button>
      </div>

      {/* ── Push 알림 배너 ── */}
      {pushStatus !== 'unsupported' && (
        <div className={styles.pushBanner}>
          {pushStatus === 'idle' && (
            <div className={styles.pushIdle}>
              <div className={styles.pushIdleText}>
                <span className={styles.pushBell}>🔔</span>
                <div>
                  <div className={styles.pushIdleTitle}>벌점 알림 받기</div>
                  <div className={styles.pushIdleSub}>벌점 등록 시 이 기기로 즉시 알림을 받을 수 있어요</div>
                </div>
              </div>
              <button className={styles.pushBtn} onClick={requestPushPermission}>허용하기</button>
            </div>
          )}
          {pushStatus === 'requesting' && (
            <div className={styles.pushRequesting}>알림 권한 요청 중...</div>
          )}
          {pushStatus === 'granted' && (
            <div className={styles.pushGranted}>
              <span>🔔 벌점 알림이 이 기기에 등록되었습니다</span>
              <button className={styles.pushOffBtn} onClick={unsubscribePush}>해제</button>
            </div>
          )}
          {pushStatus === 'denied' && (
            <div className={styles.pushDenied}>
              🔕 알림이 차단되어 있습니다. 브라우저 설정에서 알림을 허용해 주세요.
            </div>
          )}
          {pushMsg && <div className={styles.pushMsg}>{pushMsg}</div>}
        </div>
      )}

      {/* 학생 정보 카드 */}
      <div className={styles.profileCard}>
        <div className={styles.profileTop}>
          <div className={styles.avatar}>
            {student.name[0]}
          </div>
          <div className={styles.profileInfo}>
            <div className={styles.profileName}>{student.name}</div>
            <div className={styles.profileMeta}>
              <span>학번 {student.student_id}</span>
              <span className={styles.dot}>·</span>
              <span>{student.room}호실</span>
              {student.gender && <><span className={styles.dot}>·</span><span>{student.gender}</span></>}
            </div>
          </div>
          <div className={styles.pointsBadge} style={{ background: `${pointColor(pts)}18`, borderColor: `${pointColor(pts)}44` }}>
            <div className={styles.pointsNum} style={{ color: pointColor(pts) }}>{pts}점</div>
            <div className={styles.pointsLabel} style={{ color: pointColor(pts) }}>{pointLabel(pts)}</div>
          </div>
        </div>

        <div className={styles.infoGrid}>
          <div className={styles.infoItem}>
            <div className={styles.infoLabel}>호실</div>
            <div className={styles.infoVal}>{student.room || '—'}</div>
          </div>
          <div className={styles.infoItem}>
            <div className={styles.infoLabel}>학습실 좌석</div>
            <div className={styles.infoVal}>{student.study_seat || '—'}</div>
          </div>
          <div className={styles.infoItem}>
            <div className={styles.infoLabel}>성별</div>
            <div className={styles.infoVal}>{student.gender || '—'}</div>
          </div>
          <div className={styles.infoItem}>
            <div className={styles.infoLabel}>누적 벌점</div>
            <div className={styles.infoVal} style={{ color: pointColor(pts), fontWeight: 700 }}>{pts}점</div>
          </div>
        </div>
      </div>

      {/* 벌점 내역 */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionTitle}>벌점 내역</div>
          <div className={styles.sectionCount}>{demerits.length}건</div>
        </div>

        {demerits.length === 0 ? (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>✅</div>
            <div className={styles.emptyText}>벌점 내역이 없습니다</div>
          </div>
        ) : (
          <div className={styles.demeritList}>
            {demerits.map((d, i) => {
              const enforced = isEnforcedReason(d.reason)
              return (
              <div key={d.id} className={`${styles.demeritItem} ${enforced ? styles.demeritItemEnforced : ''}`}>
                <div className={styles.demeritNum}>{demerits.length - i}</div>
                <div className={styles.demeritBody}>
                  <div className={styles.demeritReason}>
                    {d.rule_no > 0 && (
                      <span className={`${styles.ruleTag} ${enforced ? styles.ruleTagEnforced : ''}`}>
                        {enforced && '⚠ '}{d.rule_no}조
                      </span>
                    )}
                    {getRuleText(d.reason) || '사유 미입력'}
                  </div>
                  {enforced && (
                    <div className={styles.enforcedWarning}>
                      ⚠ 기숙사 관리위원회 심의를 거쳐 퇴사 조치 될 수 있습니다
                    </div>
                  )}
                  {d.detail && <div className={styles.demeritDetail}>{d.detail}</div>}
                  <div className={styles.demeritMeta}>
                    {d.process_type && <span className={styles.processTag}>{d.process_type}</span>}
                    {d.teacher && <span>담당: {d.teacher}</span>}
                    {d.note && <span>비고: {d.note}</span>}
                  </div>
                </div>
              </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
