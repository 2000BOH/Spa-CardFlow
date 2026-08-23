import type { ExpenseItem } from '../types/expense';

/**
 * 초기 데이터.
 * 실제 운영 데이터는 직접 등록하므로 샘플은 비워둔다.
 */
export const INITIAL_EXPENSES: ExpenseItem[] = [];

/** 법인카드 월 사용 한도 */
export const INITIAL_MONTHLY_BUDGET = 300000;

/** 전월 사용액 — 실적이 쌓이기 전에는 0 (화면에는 '—'로 표시됨) */
export const PREV_MONTH_SPEND = 0;
