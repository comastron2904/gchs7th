-- ================================================================
--  기숙사 학생 관리 시스템 — Supabase 스키마
--  Supabase Dashboard → SQL Editor에 붙여넣어 실행하세요.
-- ================================================================

-- 1. 교사 계정
CREATE TABLE IF NOT EXISTS teachers (
  id          TEXT PRIMARY KEY,
  password    TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 학생 정보
CREATE TABLE IF NOT EXISTS students (
  student_id   TEXT PRIMARY KEY,
  name         TEXT NOT NULL,
  room         TEXT NOT NULL DEFAULT '',
  rule_no      INT  NOT NULL DEFAULT 0,
  detail       TEXT NOT NULL DEFAULT '',
  points       INT  NOT NULL DEFAULT 0,
  process_type TEXT NOT NULL DEFAULT '',
  teacher      TEXT NOT NULL DEFAULT '',
  note         TEXT NOT NULL DEFAULT '',
  push_token   TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- 3. 커스텀 규정 조항 (교사가 편집한 내용 저장)
CREATE TABLE IF NOT EXISTS demerit_rules_custom (
  id    INT PRIMARY KEY DEFAULT 1,
  rules JSONB NOT NULL DEFAULT '[]'::jsonb
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_students_points ON students(points DESC);

-- RLS
ALTER TABLE teachers             ENABLE ROW LEVEL SECURITY;
ALTER TABLE students             ENABLE ROW LEVEL SECURITY;
ALTER TABLE demerit_rules_custom ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_all_teachers"  ON teachers             FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_students"  ON students             FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_rules"     ON demerit_rules_custom FOR ALL USING (true) WITH CHECK (true);
