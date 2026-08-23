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
  const diffUp = summary.spendDiff >= 0;

  return (
    <section className="bg-ink text-white">
      <div className="mx-auto max-w-page px-5 md:px-8 py-7 md:py-14 md:grid md:grid-cols-[1.15fr_1fr] md:gap-16 md:items-end">
        {/* 주 지표 */}
        <div>
          <div className="text-[12px] md:text-[13px] font-medium uppercase tracking-[0.1em] text-white/50 mb-3 md:mb-4">
            이번 달 사용 금액
          </div>

          <div className="flex items-baseline gap-3 md:gap-4 mb-5 md:mb-7">
            <div className="num text-[46px] md:text-[76px] leading-none tracking-[-0.03em]">
              {won(summary.currentSpend)}
            </div>
            <div className="hidden md:block text-[16px] font-medium text-white/50 whitespace-nowrap">
              / {won(summary.monthlyBudget)}
            </div>
          </div>

          <div className="h-1.5 rounded-full bg-white/15 overflow-hidden mb-3">
            <div
              className="h-full rounded-full bg-brand transition-[width] duration-500 ease-in-out"
              style={{ width: `${usagePct}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[13px] md:text-[14px] text-white/55">
            <span>
              한도 {won(summary.monthlyBudget)} 중 {usagePct}%
            </span>
            <span>결산 D-{summary.daysUntilClosing}</span>
          </div>
        </div>

        {/* 보조 지표 3종 */}
        <div className="hidden md:grid grid-cols-3 mt-0">
          <div className="pr-6 border-r border-white/15">
            <div className="text-[13px] text-white/50 mb-2.5">남은 금액</div>
            <div className="num text-[26px] leading-tight">
              {won(Math.max(0, summary.remainingBudget))}
            </div>
          </div>
          <div className="px-6 border-r border-white/15">
            <div className="text-[13px] text-white/50 mb-2.5">건수</div>
            <div className="num text-[26px] leading-tight">{count}건</div>
          </div>
          <div className="pl-6">
            <div className="text-[13px] text-white/50 mb-2.5">전월 대비</div>
            <div
              className="num text-[26px] leading-tight"
              style={{ color: !hasPrev ? 'rgba(255,255,255,0.5)' : diffUp ? '#f0616d' : '#4ed0a7' }}
            >
              {hasPrev ? `${diffUp ? '+' : ''}${summary.spendDiffPercent}%` : '—'}
            </div>
          </div>
        </div>
      </div>

      {/* 모바일 보조 지표 — 흰 배경으로 분리 */}
      <div className="md:hidden grid grid-cols-3 bg-white text-ink border-b border-line">
        <div className="px-4 py-[18px] border-r border-line">
          <div className="text-[12px] text-muted mb-1.5">남은 금액</div>
          <div className="num text-[18px] leading-tight">
            {won(Math.max(0, summary.remainingBudget))}
          </div>
        </div>
        <div className="px-4 py-[18px] border-r border-line">
          <div className="text-[12px] text-muted mb-1.5">건수</div>
          <div className="num text-[18px] leading-tight">{count}건</div>
        </div>
        <div className="px-4 py-[18px]">
          <div className="text-[12px] text-muted mb-1.5">전월 대비</div>
          <div
            className="num text-[18px] leading-tight"
            style={{ color: !hasPrev ? '#5b616e' : diffUp ? '#cf202f' : '#00a35c' }}
          >
            {hasPrev ? `${diffUp ? '+' : ''}${summary.spendDiffPercent}%` : '—'}
          </div>
        </div>
      </div>
    </section>
  );
};
