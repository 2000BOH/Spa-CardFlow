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
  | '기타/일반지출';

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
  createdAt: string;       // 생성 일시
}

export interface BudgetSummary {
  monthlyBudget: number;      // 한 달 카드 한도/예산
  currentSpend: number;       // 이번 달 총 사용 금액
  remainingBudget: number;    // 남은 금액
  daysUntilClosing: number;   // 15일 결산일까지 남은 날
  closingDateStr: string;     // 다음 결산일 문자열
  prevMonthSpend: number;     // 지난달 동기 사용 금액
  spendDiff: number;          // 지난달 대비 차이 (+/-)
  spendDiffPercent: number;   // 지난달 대비 비율 (+/- %)
}
