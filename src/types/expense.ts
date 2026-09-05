/**
 * 법인카드 지출 항목 및 보고서 데이터 타입 정의
 * 회사: 블루오션 웰니스 스파 (Blue Ocean Wellness Spa)
 */

export type ExpenseCategory = 
  | '시설/건재/자재'
  | '스파/비품/소모품'
  | '식비/간식/음료'
  | '교통/유류/주차'
  | '접대/회의/행사'
  | '직원사기진작'
  | '기타/일반지출';

/**
 * 임원 지시 사용 구분
 * - 'none': 일반 사용 (개인 한도 30만원에 포함)
 * - 'ceo': 대표님 지시에 의한 사용 (한도 별도)
 * - 'chairman': 회장님 지시에 의한 사용 (한도 별도)
 */
export type DirectedBy = 'none' | 'ceo' | 'chairman';

export interface ExpenseItem {
  id: string;
  storeName: string;       // 장소 (상호명, 예: 강원건재)
  date: string;            // 날짜 (YYYY-MM-DD)
  time: string;            // 시간 (HH:mm)
  items: string;           // 품목 (예: 인테리어 타일, 수건 세트 등)
  quantity: number;        // 수량
  amount: number;          // 금액 (원)
  category: ExpenseCategory; // 카테고리/사용처
  purpose: string;         // 내용 (사용 목적)
  note?: string;           // 비고
  receiptImage?: string;   // 영수증 이미지 DataURL 또는 URL
  directedBy?: DirectedBy; // 임원 지시 사용 여부 (기존 데이터 호환 위해 optional, 없으면 'none' 취급)
  createdAt: string;       // 생성 일시
}

/** directedBy가 없는 기존 데이터도 'none'으로 안전하게 처리하는 헬퍼 */
export const getDirectedBy = (item: ExpenseItem): DirectedBy =>
  item.directedBy ?? 'none';

/** 임원 지시 사용인지 빠르게 판별하는 헬퍼 */
export const isDirectedExpense = (item: ExpenseItem): boolean =>
  getDirectedBy(item) !== 'none';

export interface BudgetSummary {
  monthlyBudget: number;      // 한 달 카드 한도/예산 (개인)
  currentSpend: number;       // 이번 달 총 사용 금액 (전체)
  personalSpend: number;      // 개인 사용 금액 (한도 포함 대상)
  directedSpend: number;      // 임원 지시 사용 금액 (한도 별도)
  directedCount: number;      // 임원 지시 사용 건수
  ceoSpend: number;           // 대표님 지시 사용 금액
  chairmanSpend: number;      // 회장님 지시 사용 금액
  remainingBudget: number;    // 남은 금액 (개인 한도 기준)
  daysUntilClosing: number;   // 15일 결산일까지 남은 날
  closingDateStr: string;     // 다음 결산일 문자열
  prevMonthSpend: number;     // 지난달 동기 사용 금액
  spendDiff: number;          // 지난달 대비 차이 (+/-)
  spendDiffPercent: number;   // 지난달 대비 비율 (+/- %)
}
