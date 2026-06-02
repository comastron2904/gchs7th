'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import styles from './page.module.css'

const TEACHER_CODE = process.env.NEXT_PUBLIC_TEACHER_CODE || '17561'
type TeacherView = 'choose' | 'signup' | 'login'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()
  const [tab, setTab] = useState<'student' | 'teacher'>('student')
  const [teacherView, setTeacherView] = useState<TeacherView>('choose')

  const [sId, setSId] = useState('')
  const [sName, setSName] = useState('')
  const [sError, setSError] = useState('')

  const [tCode, setTCode] = useState('')
  const [tSignupId, setTSignupId] = useState('')
  const [tSignupPw, setTSignupPw] = useState('')
  const [tSignupPw2, setTSignupPw2] = useState('')
  const [tSignupError, setTSignupError] = useState('')

  const [tLoginId, setTLoginId] = useState('')
  const [tLoginPw, setTLoginPw] = useState('')
  const [tLoginError, setTLoginError] = useState('')

  async function handleStudentLogin() {
    setSError('')
    if (!sId || !sName) { setSError('학번과 이름을 모두 입력해 주세요.'); return }
    if (!/^\d{5}$/.test(sId)) { setSError('학번은 5자리 숫자로 입력해 주세요.'); return }
    sessionStorage.setItem('dm_student', JSON.stringify({ id: sId, name: sName }))
    router.push('/student')
  }

  async function handleTeacherSignup() {
    setTSignupError('')
    if (!tCode || !tSignupId || !tSignupPw || !tSignupPw2) { setTSignupError('모든 항목을 입력해 주세요.'); return }
    if (tCode !== TEACHER_CODE) { setTSignupError('인증코드가 올바르지 않습니다.'); return }
    if (tSignupPw.length < 8) { setTSignupError('비밀번호는 8자 이상이어야 합니다.'); return }
    if (tSignupPw !== tSignupPw2) { setTSignupError('비밀번호가 일치하지 않습니다.'); return }
    const { data: exists } = await supabase.from('teachers').select('id').eq('id', tSignupId).single()
    if (exists) { setTSignupError('이미 사용 중인 아이디입니다.'); return }
    const { error } = await supabase.from('teachers').insert({ id: tSignupId, password: tSignupPw })
    if (error) { setTSignupError('계정 생성 중 오류가 발생했습니다.'); return }
    alert(`계정이 생성되었습니다! 아이디: ${tSignupId}`)
    setTSignupId(''); setTSignupPw(''); setTSignupPw2(''); setTCode('')
    setTeacherView('login')
  }

  async function handleTeacherLogin() {
    setTLoginError('')
    if (!tLoginId || !tLoginPw) { setTLoginError('아이디와 비밀번호를 입력해 주세요.'); return }
    const { data } = await supabase.from('teachers').select('password').eq('id', tLoginId).single()
    if (!data || data.password !== tLoginPw) { setTLoginError('아이디 또는 비밀번호가 올바르지 않습니다.'); return }
    sessionStorage.setItem('dm_teacher', tLoginId)
    router.push('/teacher')
  }

  return (
    <div className={styles.page}>
      <div className={styles.wrapper}>

        <div className={styles.header}>
          <div className={styles.logoRow}>
            <div className={styles.logoMark}>
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z"/>
                <path d="M9 21V12h6v9"/>
              </svg>
            </div>
            <span className={styles.siteTitle}>기숙사 학생 관리</span>
          </div>
          <div className={styles.siteSubtitle}>DORMITORY MANAGEMENT SYSTEM</div>
        </div>

        <div className={styles.tabSelector}>
          <button className={`${styles.tabBtn} ${tab === 'student' ? styles.activeStudent : ''}`} onClick={() => setTab('student')}>학생 입장</button>
          <button className={`${styles.tabBtn} ${tab === 'teacher' ? styles.activeTeacher : ''}`} onClick={() => setTab('teacher')}>교사 입장</button>
        </div>

        {tab === 'student' && (
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <div className={`${styles.badge} ${styles.badgeStudent}`}><span className={`${styles.dot} ${styles.dotStudent}`} />STUDENT</div>
              <div className={styles.cardTitle}>학생 로그인</div>
              <div className={styles.cardDesc}>학번과 이름을 입력하면 내 벌점 현황을 확인할 수 있어요.</div>
            </div>
            <div className={styles.field}>
              <label>학번 (5자리)</label>
              <input className={styles.studentInput} value={sId} onChange={e => setSId(e.target.value)} placeholder="예: 10101" maxLength={5} onKeyDown={e => e.key === 'Enter' && handleStudentLogin()} />
            </div>
            <div className={styles.field}>
              <label>이름</label>
              <input className={styles.studentInput} value={sName} onChange={e => setSName(e.target.value)} placeholder="예: 김민준" onKeyDown={e => e.key === 'Enter' && handleStudentLogin()} />
            </div>
            {sError && <div className={styles.errorMsg}>⚠ {sError}</div>}
            <button className={`${styles.btnMain} ${styles.btnStudent}`} onClick={handleStudentLogin}>입장하기</button>
            <div className={styles.noticeBox}>💡 별도 회원가입 없이 학번과 이름으로 바로 확인합니다.</div>
          </div>
        )}

        {tab === 'teacher' && (
          <div className={styles.card}>
            {teacherView === 'choose' && (
              <>
                <div className={styles.cardHeader}>
                  <div className={`${styles.badge} ${styles.badgeTeacher}`}><span className={`${styles.dot} ${styles.dotTeacher}`} />TEACHER</div>
                  <div className={styles.cardTitle}>교사 포털</div>
                  <div className={styles.cardDesc}>학생 벌점을 등록하고 현황을 관리합니다.</div>
                </div>
                <div className={styles.chooseBtns}>
                  <button className={styles.chooseBtn} onClick={() => setTeacherView('signup')}>
                    <div className={styles.cbIcon}>✏️</div>
                    <div className={styles.cbLabel}>신규 가입</div>
                    <div className={styles.cbSub}>계정 새로 만들기</div>
                  </button>
                  <button className={styles.chooseBtn} onClick={() => setTeacherView('login')}>
                    <div className={styles.cbIcon}>🔑</div>
                    <div className={styles.cbLabel}>로그인</div>
                    <div className={styles.cbSub}>기존 계정으로 입장</div>
                  </button>
                </div>
              </>
            )}

            {teacherView === 'signup' && (
              <>
                <button className={styles.backLink} onClick={() => setTeacherView('choose')}>← 돌아가기</button>
                <div className={styles.cardHeader}>
                  <div className={`${styles.badge} ${styles.badgeTeacher}`}><span className={`${styles.dot} ${styles.dotTeacher}`} />TEACHER</div>
                  <div className={styles.cardTitle}>교사 계정 생성</div>
                </div>
                <div className={styles.field}>
                  <label>교사 인증코드</label>
                  <input className={styles.teacherInput} type="password" value={tCode} onChange={e => setTCode(e.target.value)} placeholder="관리자로부터 받은 코드" />
                </div>
                <div className={styles.field}>
                  <label>아이디</label>
                  <input className={styles.teacherInput} value={tSignupId} onChange={e => setTSignupId(e.target.value)} placeholder="영문, 숫자 조합" />
                </div>
                <div className={styles.field}>
                  <label>비밀번호</label>
                  <input className={styles.teacherInput} type="password" value={tSignupPw} onChange={e => setTSignupPw(e.target.value)} placeholder="8자 이상" />
                </div>
                <div className={styles.field}>
                  <label>비밀번호 확인</label>
                  <input className={styles.teacherInput} type="password" value={tSignupPw2} onChange={e => setTSignupPw2(e.target.value)} placeholder="비밀번호 재입력" />
                </div>
                {tSignupError && <div className={styles.errorMsg}>⚠ {tSignupError}</div>}
                <button className={`${styles.btnMain} ${styles.btnTeacher}`} onClick={handleTeacherSignup}>계정 만들기</button>
              </>
            )}

            {teacherView === 'login' && (
              <>
                <button className={styles.backLink} onClick={() => setTeacherView('choose')}>← 돌아가기</button>
                <div className={styles.cardHeader}>
                  <div className={`${styles.badge} ${styles.badgeTeacher}`}><span className={`${styles.dot} ${styles.dotTeacher}`} />TEACHER</div>
                  <div className={styles.cardTitle}>교사 로그인</div>
                </div>
                <div className={styles.field}>
                  <label>아이디</label>
                  <input className={styles.teacherInput} value={tLoginId} onChange={e => setTLoginId(e.target.value)} placeholder="아이디 입력" onKeyDown={e => e.key === 'Enter' && handleTeacherLogin()} />
                </div>
                <div className={styles.field}>
                  <label>비밀번호</label>
                  <input className={styles.teacherInput} type="password" value={tLoginPw} onChange={e => setTLoginPw(e.target.value)} placeholder="비밀번호 입력" onKeyDown={e => e.key === 'Enter' && handleTeacherLogin()} />
                </div>
                {tLoginError && <div className={styles.errorMsg}>⚠ {tLoginError}</div>}
                <button className={`${styles.btnMain} ${styles.btnTeacher}`} onClick={handleTeacherLogin}>로그인</button>
                <div className={`${styles.noticeBox} ${styles.teacherNotice}`}>🔒 교사 인증코드는 학교 관리자에게 문의하세요.</div>
              </>
            )}
          </div>
        )}

        <div className={styles.footer}>© 2025 DORMITORY SYSTEM · 기숙사 학생 관리 플랫폼</div>
      </div>
    </div>
  )
}
