'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
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

export default function StudentPage() {
  const router = useRouter()
  const supabase = createClient()

  const [student, setStudent] = useState<Student | null>(null)
  const [demerits, setDemerits] = useState<DemeritEntry[]>([])
  const [loading, setLoading] = useState(true)

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
    loadData(id)
  }, [router, loadData])

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
            {demerits.map((d, i) => (
              <div key={d.id} className={styles.demeritItem}>
                <div className={styles.demeritNum}>{demerits.length - i}</div>
                <div className={styles.demeritBody}>
                  <div className={styles.demeritReason}>
                    {d.rule_no > 0 && <span className={styles.ruleTag}>{d.rule_no}조</span>}
                    {d.reason || '사유 미입력'}
                  </div>
                  {d.detail && <div className={styles.demeritDetail}>{d.detail}</div>}
                  <div className={styles.demeritMeta}>
                    {d.process_type && <span className={styles.processTag}>{d.process_type}</span>}
                    {d.teacher && <span>담당: {d.teacher}</span>}
                    {d.note && <span>비고: {d.note}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
