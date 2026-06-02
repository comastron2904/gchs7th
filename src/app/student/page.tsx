'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function StudentPage() {
  const router = useRouter()
  useEffect(() => {
    const s = sessionStorage.getItem('dm_student')
    if (!s) router.push('/')
  }, [router])

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#F4F2EE', color: '#9A97A0', fontSize: 14 }}>
      학생 페이지 준비 중...
    </div>
  )
}
