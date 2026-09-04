import type { BudgetSummary, ExpenseItem } from '../types/expense';
import { isDirectedExpense } from '../types/expense';
import { INITIAL_EXPENSES, INITIAL_MONTHLY_BUDGET, PREV_MONTH_SPEND } from '../data/mockExpenses';

/* 샘플 데이터가 남아 있던 이전 저장소(v1)를 버리기 위해 키를 v2로 올림 */
const STORAGE_KEY = 'blue_ocean_card_expenses_v2';
const BUDGET_KEY = 'blue_ocean_card_budget_v2';

export function getStoredExpenses(): ExpenseItem[] {
  const data = localStorage.getItem(STORAGE_KEY);
  if (!data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_EXPENSES));
    return INITIAL_EXPENSES;
  }
  try {
    return JSON.parse(data);
  } catch (e) {
    console.error('Failed to parse expenses', e);
    return INITIAL_EXPENSES;
  }
}

export function saveExpenses(expenses: ExpenseItem[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
}

export function getMonthlyBudget(): number {
  const budget = localStorage.getItem(BUDGET_KEY);
  return budget ? parseInt(budget, 10) : INITIAL_MONTHLY_BUDGET;
}

export function setMonthlyBudget(value: number): void {
  localStorage.setItem(BUDGET_KEY, String(value));
}

export function calculateBudgetSummary(expenses: ExpenseItem[]): BudgetSummary {
  const monthlyBudget = getMonthlyBudget();

  // 개인 사용 vs 임원 지시 사용 분리 계산
  let personalSpend = 0;
  let directedSpend = 0;
  let directedCount = 0;

  for (const item of expenses) {
    if (isDirectedExpense(item)) {
      directedSpend += item.amount;
      directedCount += 1;
    } else {
      personalSpend += item.amount;
    }
  }

  const currentSpend = personalSpend + directedSpend;
  // 남은 한도는 개인 사용분만 기준 (임원 지시 사용은 한도 별도)
  const remainingBudget = monthlyBudget - personalSpend;

  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();

  let closing = new Date(year, month, 15);
  if (today.getDate() > 15) closing = new Date(year, month + 1, 15);

  const daysUntilClosing = Math.max(
    0,
    Math.ceil((closing.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  );
  const closingDateStr = `${closing.getFullYear()}.${String(closing.getMonth() + 1).padStart(2, '0')}.15`;

  const prevMonthSpend = PREV_MONTH_SPEND;
  const spendDiff = currentSpend - prevMonthSpend;
  const spendDiffPercent = prevMonthSpend > 0 ? Math.round((spendDiff / prevMonthSpend) * 100) : 0;

  return {
    monthlyBudget,
    currentSpend,
    personalSpend,
    directedSpend,
    directedCount,
    remainingBudget,
    daysUntilClosing,
    closingDateStr,
    prevMonthSpend,
    spendDiff,
    spendDiffPercent
  };
}

