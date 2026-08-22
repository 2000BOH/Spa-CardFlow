import React from 'react';
import type { BudgetSummary } from '../types/expense';
import { Clock, Wallet, TrendingUp, TrendingDown, Calendar, AlertCircle, ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface DashboardProps {
  summary: BudgetSummary;
  onBudgetChange?: (newBudget: number) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ summary }) => {
  const usagePercentage = Math.min(
    100,
    Math.round((summary.currentSpend / summary.monthlyBudget) * 100)
  );

  const isDiffPositive = summary.spendDiff >= 0;

  return (
    <div className="dashboard-grid">
      {/* 1. 이번 달 누적 사용 금액 (총지출) */}
      <div className="kpi-card glass-card">
        <div className="kpi-header">
          <div className="kpi-icon-wrapper bg-cyan-500/20 text-cyan-300">
            <Wallet className="w-6 h-6" />
          </div>
          <span className="kpi-badge bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
            사용률 {usagePercentage}%
          </span>
        </div>
        <div className="kpi-body">
          <div className="kpi-sublabel">이번 달 법인카드 사용액</div>
          <div className="kpi-value text-cyan-200">
            ₩{summary.currentSpend.toLocaleString()}
          </div>
          
          {/* 프로그래스 바 */}
          <div className="progress-bar-container mt-2">
            <div 
              className={`progress-bar-fill ${usagePercentage > 85 ? 'bg-gradient-to-r from-amber-500 to-rose-500' : 'bg-gradient-to-r from-cyan-500 to-emerald-400'}`}
              style={{ width: `${usagePercentage}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-slate-400 mt-1">
            <span>한도: ₩{summary.monthlyBudget.toLocaleString()}</span>
            <span>{usagePercentage}% 소진</span>
          </div>
        </div>
      </div>

      {/* 2. 이번 달 남은 금액 (잔여 예산) */}
      <div className="kpi-card glass-card">
        <div className="kpi-header">
          <div className="kpi-icon-wrapper bg-emerald-500/20 text-emerald-300">
            <AlertCircle className="w-6 h-6" />
          </div>
          <span className={`kpi-badge ${summary.remainingBudget >= 0 ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' : 'bg-rose-500/10 text-rose-300 border-rose-500/30'}`}>
            {summary.remainingBudget >= 0 ? '사용 가능' : '한도 초과 주의'}
          </span>
        </div>
        <div className="kpi-body">
          <div className="kpi-sublabel">이번 달 카드 남은 금액</div>
          <div className={`kpi-value ${summary.remainingBudget >= 0 ? 'text-emerald-300' : 'text-rose-400'}`}>
            ₩{summary.remainingBudget.toLocaleString()}
          </div>
          <div className="kpi-footer-text">
            월 정액 한도 대비 투명 여유금
          </div>
        </div>
      </div>

      {/* 3. 이번 달 결산 D-Day 카운트다운 */}
      <div className="kpi-card glass-card">
        <div className="kpi-header">
          <div className="kpi-icon-wrapper bg-amber-500/20 text-amber-300">
            <Clock className="w-6 h-6 animate-pulse" />
          </div>
          <span className="kpi-badge bg-amber-500/10 text-amber-300 border border-amber-500/30">
            매월 15일 결산
          </span>
        </div>
        <div className="kpi-body">
          <div className="kpi-sublabel">15일 보고서 제출까지</div>
          <div className="kpi-value text-amber-300">
            D-{summary.daysUntilClosing} <span className="text-xl font-normal text-slate-300">일 남음</span>
          </div>
          <div className="kpi-footer-text">
            <Calendar className="w-3.5 h-3.5 inline mr-1 text-slate-400" />
            다음 결산일: <strong>{summary.closingDateStr}</strong>
          </div>
        </div>
      </div>

      {/* 4. 지난달 대비 사용 금액 (+/-) */}
      <div className="kpi-card glass-card">
        <div className="kpi-header">
          <div className={`kpi-icon-wrapper ${isDiffPositive ? 'bg-rose-500/20 text-rose-300' : 'bg-emerald-500/20 text-emerald-300'}`}>
            {isDiffPositive ? <TrendingUp className="w-6 h-6" /> : <TrendingDown className="w-6 h-6" />}
          </div>
          <span className={`kpi-badge flex items-center gap-1 ${isDiffPositive ? 'bg-rose-500/15 text-rose-300 border-rose-500/30' : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'}`}>
            {isDiffPositive ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
            {isDiffPositive ? '+' : ''}{summary.spendDiffPercent}%
          </span>
        </div>
        <div className="kpi-body">
          <div className="kpi-sublabel">지난달 대비 사용 금액 비교</div>
          <div className={`kpi-value ${isDiffPositive ? 'text-rose-300' : 'text-emerald-300'}`}>
            {isDiffPositive ? '+' : ''}₩{summary.spendDiff.toLocaleString()}
          </div>
          <div className="kpi-footer-text">
            지난달 동기(₩{summary.prevMonthSpend.toLocaleString()}) 대비 {isDiffPositive ? '증가' : '절감'}
          </div>
        </div>
      </div>
    </div>
  );
};
