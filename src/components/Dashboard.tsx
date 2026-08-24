import React from 'react';
import type { BudgetSummary } from '../types/expense';

interface DashboardProps {
  summary: BudgetSummary;
  count: number;
}

const won = (n: number) => '₩' + Math.round(n).toLocaleString('ko-KR');

export const Dashboard: React.FC<DashboardProps> = ({ summary, count }) => {
  const usagePct =
    summary.monthlyBudget > 0
      ? Math.min(100, Math.round((summary.currentSpend / summary.monthlyBudget) * 100))
      : 0;

  const hasPrev = summary.prevMonthSpend > 0;
  const up = summary.spendDiff >= 0;
  const diffText = hasPrev ? `${up ? '+' : ''}${summary.spendDiffPercent}%` : '—';

  const stats = (onDark: boolean) => (
    <>
      <div className="sc-stat">
        <div className="sc-stat-label">남은 금액</div>
        <div className="sc-stat-value">{won(Math.max(0, summary.remainingBudget))}</div>
      </div>
      <div className="sc-stat">
        <div className="sc-stat-label">건수</div>
        <div className="sc-stat-value">{count}건</div>
      </div>
      <div className="sc-stat">
        <div className="sc-stat-label">전월 대비</div>
        <div
          className="sc-stat-value"
          style={{
            color: !hasPrev
              ? onDark
                ? 'rgba(255,255,255,0.5)'
                : '#5b616e'
              : up
                ? onDark
                  ? '#f0616d'
                  : '#cf202f'
                : onDark
                  ? '#4ed0a7'
                  : '#00a35c'
          }}
        >
          {diffText}
        </div>
      </div>
    </>
  );

  return (
    <>
      <section className="sc-hero">
        <div className="sc-hero-in">
          <div>
            <div className="sc-hero-label">이번 달 사용 금액</div>
            <div className="sc-hero-amount">{won(summary.currentSpend)}</div>

            <div className="sc-bar">
              <i style={{ width: `${usagePct}%` }} />
            </div>

            <div className="sc-hero-foot">
              <span>
                한도 {won(summary.monthlyBudget)} 중 {usagePct}%
              </span>
              <span>결산 D-{summary.daysUntilClosing}</span>
            </div>
          </div>

          {/* 데스크톱: 어두운 배경 위 3칸 */}
          <div className="sc-hero-stats sc-only-desktop">{stats(true)}</div>
        </div>
      </section>

      {/* 모바일: 흰 배경으로 분리한 3칸 */}
      <div className="sc-stats sc-only-mobile">{stats(false)}</div>
    </>
  );
};
