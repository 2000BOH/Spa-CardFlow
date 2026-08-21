import type { BudgetSummary, ExpenseItem } from '../types/expense';
import { INITIAL_EXPENSES, INITIAL_MONTHLY_BUDGET, PREV_MONTH_SPEND } from '../data/mockExpenses';

const STORAGE_KEY = 'blue_ocean_card_expenses_v1';
const BUDGET_KEY = 'blue_ocean_card_budget_v1';

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

export function calculateBudgetSummary(expenses: ExpenseItem[]): BudgetSummary {
  const monthlyBudget = getMonthlyBudget();
  const currentSpend = expenses.reduce((sum, item) => sum + item.amount, 0);
  const remainingBudget = monthlyBudget - currentSpend;

  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth();

  let targetClosingDate = new Date(currentYear, currentMonth, 15);
  if (today.getDate() > 15) {
    targetClosingDate = new Date(currentYear, currentMonth + 1, 15);
  }

  const diffTime = targetClosingDate.getTime() - today.getTime();
  const daysUntilClosing = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  const closingDateStr = `${targetClosingDate.getFullYear()}.${String(targetClosingDate.getMonth() + 1).padStart(2, '0')}.15`;

  const prevMonthSpend = PREV_MONTH_SPEND;
  const spendDiff = currentSpend - prevMonthSpend;
  const spendDiffPercent = prevMonthSpend > 0 
    ? Math.round((spendDiff / prevMonthSpend) * 100)
    : 0;

  return {
    monthlyBudget,
    currentSpend,
    remainingBudget,
    daysUntilClosing,
    closingDateStr,
    prevMonthSpend,
    spendDiff,
    spendDiffPercent
  };
}
