export const DEFAULT_RULES: string[] = [
  "아침 점호, 학습시간 지각, 불참자 및 기타시간 지각한 행위",
  "외부 음식물 반입 및 동조, 섭취한 사항 (차류, 견과류, 한약 등)",
  "방정리 및 개인사물 정리, 방청소 상태가 불량인 사항",
  "2층 침대에 2명 이상이 있는 행위",
  "청소시간 정해진 구역별 청소 불이행한 행위",
  "음란 서적, 만화책 학습 관련 외의 잡지를 소지 또는 유포하는 행위",
  "생활실에서 학습용이 아닌 태블릿PC, 노트북 등 컴퓨터를 소지하거나 사용한 행위",
  "학습실에서 타인의 학습에 방해가 되는 행위 (대화, 자리이석 등)",
  "인터넷 강의 수업 중 자리이탈 및 학습 외 사이트 열람하는 행위",
  "야간 소란 행위 (취침 시간이후 타인 수면 방해자 포함)",
  "소등시간 위반 및 퇴실 후 전기 미소등 및 냉난방기 가동한 행위",
  "교복 미착용으로 등교한 행위",
  "창조관 컴퓨터에 게임, 음악, 음란물 설치 및 사용한 경우",
  "사내 반입 금지 물품 (전열기 등)을 소지 및 사용한 경우",
  "무단으로 타 호실을 출입한 행위",
  "타 호실 수면 행위",
  "무단 호실 변경한 경우",
  "사감 교사 지시사항 불이행 (거짓말 포함)한 행위",
  "기숙사 자기주도학습실에서 학습용도 외 휴대전화를 사용하거나 소지한 행위",
  "창조관 입사생 외의 타 학생을 창조관에 출입시킨 경우",
  "불건전한 이성교제 등의 풍기를 문란케 한 행위",
  "학교명예를 훼손한 경우",
  "고의적으로 창조관 기물이나 시설을 파손 및 훼손한 행위",
  "사감 교사에 불손 행위, 인권 침해한 행위",
  "선후배 간이나 동료에게 물리적·심리적 폭력, 성추행·성폭력 등의 행위",
  "무단 외출, 학습 불참, 외박한 행위",
  "흡연, 음주, 절도, 도박 행위",
]

export const PROCESS_TYPES = ['', '경고', '주의', '봉사', '귀가조치']

/** 강화 규정 prefix — DB에 저장될 때 텍스트 앞에 붙는 마커 */
export const ENFORCED_PREFIX = '⚠️'

/** 규정 텍스트가 강화 규정인지 확인 */
export function isEnforced(ruleText: string): boolean {
  return ruleText.startsWith(ENFORCED_PREFIX)
}

/** 강화 규정에서 실제 텍스트만 반환 */
export function getRuleText(ruleText: string): string {
  return isEnforced(ruleText) ? ruleText.slice(ENFORCED_PREFIX.length).trimStart() : ruleText
}

/** reason 문자열이 강화 규정으로 부과된 것인지 확인 */
export function isEnforcedReason(reason: string): boolean {
  return reason.startsWith(ENFORCED_PREFIX)
}
