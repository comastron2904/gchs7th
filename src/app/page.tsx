'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { DEFAULT_RULES, PROCESS_TYPES } from '@/lib/rules'
import styles from './page.module.css'

interface Student {
  student_id: string
  name: string
  room: string
  gender: string
  study_seat: string
  points: number
}

// 벌점 관리 탭의 행 단위 기록
interface DemeritEntry {
  id: string           // 로컬 고유 키
  student_id: string
  name: string
  room: string
  rule_no: number
  reason: string       // 자동입력
  detail: string       // 직접입력
  process_type: string
  teacher: string
  note: string
}

export default function TeacherPage() {
  const router = useRouter()
  const supabase = createClient()

  const [activeTab, setActiveTab] = useState<'info' | 'demerit' | 'rules'>('info')
  const [teacherId, setTeacherId] = useState('')
  const [students, setStudents] = useState<Student[]>([])
  const [rules, setRules] = useState<string[]>(DEFAULT_RULES)
  const [search1, setSearch1] = useState('')
  const [loading, setLoading] = useState(true)

  // ── 벌점 관리 상태 ──
  const [demeritEntries, setDemeritEntries] = useState<DemeritEntry[]>([])
  const [showStudentPicker, setShowStudentPicker] = useState(false)
  const [pickerSearch, setPickerSearch] = useState('')

  // ── 학생 정보 탭 모달 ──
  const [showAdd, setShowAdd] = useState(false)
  const [inpId, setInpId] = useState('')
  const [inpName, setInpName] = useState('')
  const [inpRoom, setInpRoom] = useState('')
  const [addErr, setAddErr] = useState('')

  const [showDel, setShowDel] = useState(false)
  const [pendingDel, setPendingDel] = useState<Student | null>(null)

  // ── 규정 조항 탭 ──
  const [newRule, setNewRule] = useState('')

  // ── 토스트 ──
  const [toast, setToast] = useState('')
  const [toastShow, setToastShow] = useState(false)

  function showToast(msg: string) {
    setToast(msg); setToastShow(true)
    setTimeout(() => setToastShow(false), 2000)
  }

  useEffect(() => {
    const tid = sessionStorage.getItem('dm_teacher')
    if (!tid) { router.push('/'); return }
    setTeacherId(tid)
  }, [router])

  const loadStudents = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('students').select('*').order('student_id')
    if (data) setStudents(data as Student[])
    setLoading(false)
  }, [supabase])

  const loadRules = useCallback(async () => {
    const { data } = await supabase.from('demerit_rules_custom').select('rules').eq('id', 1).single()
    if (data?.rules) setRules(data.rules)
  }, [supabase])

  useEffect(() => {
    if (teacherId) { loadStudents(); loadRules() }
  }, [teacherId, loadStudents, loadRules])

  async function saveRulesToDB(newRules: string[]) {
    await supabase.from('demerit_rules_custom').upsert({ id: 1, rules: newRules })
  }

  function demerClass(p: number) {
    if (p === 0) return styles.demerZero
    if (p <= 2) return styles.demerLow
    if (p <= 4) return styles.demerMid
    return styles.demerHigh
  }

  const filtered1 = students.filter(s =>
    !search1 || s.student_id.includes(search1) || s.name.includes(search1)
  )

  // ── 학생 정보 탭: 필드 업데이트 ──
  async function updateStudentField(id: string, field: string, value: string | number) {
    await supabase.from('students').update({ [field]: value }).eq('student_id', id)
    setStudents(prev => prev.map(s => s.student_id === id ? { ...s, [field]: value } : s))
  }

  async function addStudent() {
    setAddErr('')
    if (!inpId || !inpName || !inpRoom) { setAddErr('학번, 성명, 호실을 모두 입력해 주세요.'); return }
    if (!/^\d{5}$/.test(inpId)) { setAddErr('학번은 5자리 숫자여야 합니다.'); return }
    if (students.find(s => s.student_id === inpId)) { setAddErr('이미 등록된 학번입니다.'); return }
    const { error } = await supabase.from('students').insert({
      student_id: inpId, name: inpName, room: inpRoom,
      gender: '', study_seat: '', points: 0
    })
    if (error) { setAddErr('저장 중 오류가 발생했습니다.'); return }
    setShowAdd(false); setInpId(''); setInpName(''); setInpRoom('')
    await loadStudents()
    showToast(`${inpName} 학생이 추가됐습니다`)
  }

  async function confirmDelete() {
    if (!pendingDel) return
    await supabase.from('students').delete().eq('student_id', pendingDel.student_id)
    setShowDel(false); setPendingDel(null)
    await loadStudents()
    showToast('학생이 삭제됐습니다')
  }

  // ── 벌점 관리 탭 ──

  // 학생 선택 → 새 행 추가
  function pickStudent(s: Student) {
    const entry: DemeritEntry = {
      id: `${Date.now()}-${s.student_id}`,
      student_id: s.student_id,
      name: s.name,
      room: s.room,
      rule_no: 0,
      reason: '',
      detail: '',
      process_type: '',
      teacher: teacherId,
      note: '',
    }
    setDemeritEntries(prev => [...prev, entry])
    setShowStudentPicker(false)
    setPickerSearch('')
  }

  // 행 필드 업데이트
  function updateEntry(id: string, field: keyof DemeritEntry, value: string | number) {
    setDemeritEntries(prev => prev.map(e => {
      if (e.id !== id) return e
      const updated = { ...e, [field]: value }
      // 규정 조항 바뀌면 reason 자동갱신
      if (field === 'rule_no') {
        const ruleIdx = (value as number) - 1
        updated.reason = (value as number) > 0 ? (rules[ruleIdx] ?? '') : ''
      }
      return updated
    }))
  }

  // 행 삭제
  function removeEntry(id: string) {
    setDemeritEntries(prev => prev.filter(e => e.id !== id))
  }

  // ── 규정 조항 탭 ──
  function updateRuleText(idx: number, val: string) {
    const updated = [...rules]; updated[idx] = val
    setRules(updated); saveRulesToDB(updated)
    showToast(`${idx + 1}조 수정됐습니다`)
  }

  function deleteRule(idx: number) {
    if (!confirm(`${idx + 1}조를 삭제하시겠습니까?\n이후 조항 번호가 자동으로 당겨집니다.`)) return
    const updated = rules.filter((_, i) => i !== idx)
    setRules(updated); saveRulesToDB(updated)
    showToast('조항이 삭제됐습니다')
  }

  function addRule() {
    if (!newRule.trim()) return
    const updated = [...rules, newRule.trim()]
    setRules(updated); saveRulesToDB(updated)
    setNewRule('')
    showToast(`${updated.length}조가 추가됐습니다`)
  }

  const pickerFiltered = students.filter(s =>
    !pickerSearch || s.student_id.includes(pickerSearch) || s.name.includes(pickerSearch)
  )

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#9A97A0', fontSize: 14 }}>
      불러오는 중...
    </div>
  )

  return (
    <div className={styles.page}>

      {/* Nav */}
      <div className={styles.nav}>
        <button className={`${styles.navBtn} ${activeTab === 'info' ? styles.navActive : ''}`} onClick={() => setActiveTab('info')}>👤 학생 정보</button>
        <button className={`${styles.navBtn} ${activeTab === 'demerit' ? styles.navActive : ''}`} onClick={() => setActiveTab('demerit')}>⚠️ 벌점 관리</button>
        <button className={`${styles.navBtn} ${activeTab === 'rules' ? styles.navActive : ''}`} onClick={() => setActiveTab('rules')}>📖 규정 조항 편집</button>
      </div>

      {/* ── TAB 1: 학생 정보 ── */}
      {activeTab === 'info' && (
        <>
          <div className={styles.topbar}>
            <div className={styles.topbarLeft}>
              <div className={styles.logoMark}>
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z"/><path d="M9 21V12h6v9"/>
                </svg>
              </div>
              <div>
                <div className={styles.pageTitle}>기숙사 학생 관리</div>
                <div className={styles.pageSub}>교사 포털 · 학생 정보</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className={styles.btnPrimary} onClick={() => setShowAdd(true)}>+ 학생 추가</button>
              <button className={styles.logoutBtn} onClick={() => { sessionStorage.removeItem('dm_teacher'); router.push('/') }}>로그아웃</button>
            </div>
          </div>

          <div className={styles.statsRow}>
            <div className={styles.statCard}><div className={styles.statLabel}>전체 학생</div><div className={styles.statVal}>{students.length}</div></div>
            <div className={styles.statCard}><div className={styles.statLabel}>벌점 보유</div><div className={`${styles.statVal} ${styles.statWarn}`}>{students.filter(s => s.points > 0).length}</div></div>
            <div className={styles.statCard}><div className={styles.statLabel}>5점 이상</div><div className={`${styles.statVal} ${styles.statDanger}`}>{students.filter(s => s.points >= 5).length}</div></div>
          </div>

          <div className={styles.tableWrap}>
            <div className={styles.tableToolbar}>
              <div className={styles.tableTitle}>학생 목록</div>
              <div className={styles.searchBox}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#B8B5BE" strokeWidth="2.5" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                <input placeholder="이름 또는 학번 검색" value={search1} onChange={e => setSearch1(e.target.value)} />
              </div>
            </div>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.t1ColId}>학번</th>
                  <th className={styles.t1ColName}>성명</th>
                  <th className={styles.t1ColRoom}>호실</th>
                  <th className={styles.t1ColGender}>성별</th>
                  <th className={styles.t1ColSeat}>학습실 좌석</th>
                  <th className={styles.t1ColPts}>벌점</th>
                  <th className={styles.t1ColDel}></th>
                </tr>
              </thead>
              <tbody>
                {filtered1.length === 0 ? (
                  <tr className={styles.emptyRow}><td colSpan={7}>등록된 학생이 없습니다</td></tr>
                ) : filtered1.map(s => (
                  <tr key={s.student_id}>
                    <td style={{ fontFamily: 'monospace', fontSize: 12, color: '#7A7880' }}>{s.student_id}</td>
                    <td style={{ fontWeight: 600 }}>{s.name}</td>
                    <td>
                      <input className={styles.editable} defaultValue={s.room} placeholder="호실" onBlur={e => updateStudentField(s.student_id, 'room', e.target.value)} />
                    </td>
                    <td>
                      <select className={styles.editable} value={s.gender} onChange={e => updateStudentField(s.student_id, 'gender', e.target.value)}>
                        <option value=""></option>
                        <option value="남">남</option>
                        <option value="여">여</option>
                      </select>
                    </td>
                    <td>
                      <input className={styles.editable} defaultValue={s.study_seat} placeholder="좌석번호" onBlur={e => updateStudentField(s.student_id, 'study_seat', e.target.value)} />
                    </td>
                    <td>
                      <span className={`${styles.demerNum} ${demerClass(s.points)}`}>{s.points}점</span>
                    </td>
                    <td>
                      <button className={styles.btnDel} onClick={() => { setPendingDel(s); setShowDel(true) }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ── TAB 2: 벌점 관리 ── */}
      {activeTab === 'demerit' && (
        <>
          <div className={styles.topbar}>
            <div className={styles.topbarLeft}>
              <div className={`${styles.logoMark} ${styles.logoMarkWarn}`}>
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                  <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
              </div>
              <div>
                <div className={styles.pageTitle}>벌점 관리</div>
                <div className={styles.pageSub}>학생 선택 후 규정 조항 및 사유 입력</div>
              </div>
            </div>
            <button className={styles.btnPrimary} onClick={() => { setShowStudentPicker(true); setPickerSearch('') }}>
              + 학생 추가
            </button>
          </div>

          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.t2ColId}>학번</th>
                  <th className={styles.t2ColName}>성명</th>
                  <th className={styles.t2ColRoom}>호실</th>
                  <th className={styles.t2ColRule}>규정 조항<div className={styles.thSub}>번호 선택</div></th>
                  <th className={styles.t2ColReason}>사유 내용<div className={styles.thSub}>자동입력</div></th>
                  <th className={styles.t2ColDetail}>상세 사유<div className={styles.thSub}>직접입력</div></th>
                  <th className={styles.t2ColType}>처리 유형</th>
                  <th className={styles.t2ColTeacher}>담당자<div className={styles.thSub}>지도교사</div></th>
                  <th className={styles.t2ColNote}>비고</th>
                  <th className={styles.t2ColDel}></th>
                </tr>
              </thead>
              <tbody>
                {demeritEntries.length === 0 ? (
                  <tr className={styles.emptyRow}>
                    <td colSpan={10}>
                      상단 [+ 학생 추가] 버튼으로 학생을 선택하세요
                    </td>
                  </tr>
                ) : demeritEntries.map(e => (
                  <tr key={e.id}>
                    <td style={{ fontFamily: 'monospace', fontSize: 12, color: '#7A7880' }}>{e.student_id}</td>
                    <td style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{e.name}</td>
                    <td style={{ fontSize: 13, color: '#5A5870' }}>{e.room}</td>
                    <td>
                      <select
                        className={styles.editable}
                        value={e.rule_no}
                        onChange={ev => updateEntry(e.id, 'rule_no', parseInt(ev.target.value) || 0)}
                      >
                        <option value={0}></option>
                        {rules.map((r, i) => (
                          <option key={i} value={i + 1}>{i + 1}조. {r.substring(0, 16)}{r.length > 16 ? '…' : ''}</option>
                        ))}
                      </select>
                    </td>
                    <td
                      className={styles.reasonCell}
                      title={e.reason}
                    >
                      {e.reason || '—'}
                    </td>
                    <td>
                      <input
                        className={styles.editable}
                        defaultValue={e.detail}
                        placeholder="직접 입력"
                        onBlur={ev => updateEntry(e.id, 'detail', ev.target.value)}
                      />
                    </td>
                    <td>
                      <select
                        className={styles.editable}
                        value={e.process_type}
                        onChange={ev => updateEntry(e.id, 'process_type', ev.target.value)}
                      >
                        {PROCESS_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </td>
                    <td>
                      <input
                        className={styles.editable}
                        defaultValue={e.teacher}
                        placeholder="담당교사"
                        onBlur={ev => updateEntry(e.id, 'teacher', ev.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        className={styles.editable}
                        defaultValue={e.note}
                        placeholder="비고"
                        onBlur={ev => updateEntry(e.id, 'note', ev.target.value)}
                      />
                    </td>
                    <td>
                      <button className={styles.btnDel} onClick={() => removeEntry(e.id)}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ── TAB 3: 규정 조항 편집 ── */}
      {activeTab === 'rules' && (
        <>
          <div className={styles.rulesHeader}>
            <div className={styles.rulesTitle}>규정 조항 편집</div>
            <div className={styles.rulesDesc}>조항 내용을 직접 클릭해서 수정하거나, 하단에서 새 조항을 추가할 수 있습니다.</div>
          </div>
          <div className={styles.tableWrap}>
            {rules.map((r, i) => (
              <div key={i} className={styles.ruleItem}>
                <div className={styles.ruleNum}>{i + 1}조</div>
                <div className={styles.ruleTextWrap}>
                  <input className={styles.ruleText} defaultValue={r} onBlur={e => updateRuleText(i, e.target.value)} />
                </div>
                <div className={styles.ruleActions}>
                  <button className={styles.btnIcon} onClick={() => deleteRule(i)} title="삭제">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M9 6V4h6v2"/></svg>
                  </button>
                </div>
              </div>
            ))}
            <div className={styles.addRuleRow}>
              <input className={styles.addRuleInput} value={newRule} onChange={e => setNewRule(e.target.value)} placeholder="새 조항 내용을 입력하세요..." onKeyDown={e => e.key === 'Enter' && addRule()} />
              <button className={styles.btnAddRule} onClick={addRule}>+ 조항 추가</button>
            </div>
          </div>
        </>
      )}

      {/* ── 학생 선택 팝업 (벌점 관리 탭) ── */}
      {showStudentPicker && (
        <div className={styles.overlay} onClick={() => setShowStudentPicker(false)}>
          <div className={styles.pickerModal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div className={styles.modalTitle}>학생 선택</div>
              <button className={styles.modalClose} onClick={() => setShowStudentPicker(false)}>✕</button>
            </div>
            <div className={styles.pickerSearch}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#B8B5BE" strokeWidth="2.5" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input
                autoFocus
                placeholder="이름 또는 학번 검색"
                value={pickerSearch}
                onChange={e => setPickerSearch(e.target.value)}
              />
            </div>
            <div className={styles.pickerList}>
              {pickerFiltered.length === 0 ? (
                <div className={styles.pickerEmpty}>검색 결과가 없습니다</div>
              ) : pickerFiltered.map(s => (
                <button key={s.student_id} className={styles.pickerItem} onClick={() => pickStudent(s)}>
                  <span className={styles.pickerName}>{s.name}</span>
                  <span className={styles.pickerMeta}>{s.student_id} · {s.room}호실</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── 학생 추가 모달 (학생 정보 탭) ── */}
      {showAdd && (
        <div className={styles.overlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <div className={styles.modalTitle}>학생 추가</div>
              <button className={styles.modalClose} onClick={() => setShowAdd(false)}>✕</button>
            </div>
            <div className={styles.mfield}>
              <label>학번 (5자리)</label>
              <input value={inpId} onChange={e => setInpId(e.target.value)} placeholder="예: 10101" maxLength={5} />
            </div>
            <div className={styles.mfield}>
              <label>성명</label>
              <input value={inpName} onChange={e => setInpName(e.target.value)} placeholder="예: 김민준" />
            </div>
            <div className={styles.mfield}>
              <label>호실</label>
              <input value={inpRoom} onChange={e => setInpRoom(e.target.value)} placeholder="예: 301" />
              <div className={styles.mfieldHint}>나머지 항목은 표에서 직접 입력하세요.</div>
            </div>
            {addErr && <div className={styles.addErr}>⚠ {addErr}</div>}
            <div className={styles.modalFooter}>
              <button className={styles.btnCancel} onClick={() => setShowAdd(false)}>취소</button>
              <button className={styles.btnConfirm} onClick={addStudent}>추가하기</button>
            </div>
          </div>
        </div>
      )}

      {/* ── 학생 삭제 확인 모달 ── */}
      {showDel && pendingDel && (
        <div className={styles.overlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <div className={styles.modalTitle}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#E05252" strokeWidth="2.5" strokeLinecap="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                학생 삭제
              </div>
              <button className={styles.modalClose} onClick={() => setShowDel(false)}>✕</button>
            </div>
            <div className={styles.delInfoBox}>
              <div className={styles.delInfoName}>{pendingDel.name}</div>
              <div className={styles.delInfoId}>학번 {pendingDel.student_id} · {pendingDel.room}호실</div>
            </div>
            <p className={styles.delWarnText}>삭제하면 해당 학생의 모든 기록이 <strong>복구 불가</strong>하게 삭제됩니다. 정말 삭제하시겠습니까?</p>
            <div className={styles.modalFooter}>
              <button className={styles.btnCancel} onClick={() => setShowDel(false)}>취소</button>
              <button className={styles.btnDelConfirm} onClick={confirmDelete}>삭제하기</button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      <div className={`toast ${toastShow ? 'show' : ''}`}>{toast}</div>
    </div>
  )
}
