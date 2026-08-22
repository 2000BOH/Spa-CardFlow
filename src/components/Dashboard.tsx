import React from 'react';
import type { BudgetSummary } from '../types/expense';
import { Wallet, Clock, TrendingUp, TrendingDown } from 'lucide-react';

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
    <div className="mb-6">
      {/* 메인: 사용액 + 프로그래스 바 */}
      <div className="glass-card rounded-2xl p-4 mb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-slate-400 font-medium">이번 달 사용</span>
          <span className="text-xs font-bold text-cyan-300">{usagePercentage}%</span>
        </div>
        <div className="text-2xl font-extrabold text-white tracking-tight" style={{ fontFamily: "'Outfit', sans-serif" }}>
          ₩{summary.currentSpend.toLocaleString()}
        </div>
        <div className="w-full h-2 bg-slate-700/60 rounded-full mt-2 mb-1.5 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${usagePercentage > 85 ? 'bg-gradient-to-r from-amber-500 to-rose-500' : 'bg-gradient-to-r from-cyan-400 to-emerald-400'}`}
            style={{ width: `${usagePercentage}%` }}
          />
        </div>
        <div className="text-[11px] text-slate-500">
          한도 ₩{summary.monthlyBudget.toLocaleString()}
        </div>
      </div>

      {/* 서브: 3개 미니 지표를 1행에 */}
      <div className="grid grid-cols-3 gap-2">
        {/* 남은 금액 */}
        <div className="glass-card rounded-xl p-3 text-center">
          <Wallet className="w-4 h-4 text-emerald-400 mx-auto mb-1" />
          <div className="text-[10px] text-slate-400 mb-0.5">남은 금액</div>
          <div className={`text-sm font-bold ${summary.remainingBudget >= 0 ? 'text-emerald-300' : 'text-rose-400'}`} style={{ fontFamily: "'Outfit', sans-serif" }}>
            ₩{Math.abs(summary.remainingBudget).toLocaleString()}
          </div>
        </div>

        {/* D-Day */}
        <div className="glass-card rounded-xl p-3 text-center">
          <Clock className="w-4 h-4 text-amber-400 mx-auto mb-1" />
          <div className="text-[10px] text-slate-400 mb-0.5">결산까지</div>
          <div className="text-sm font-bold text-amber-300" style={{ fontFamily: "'Outfit', sans-serif" }}>
            D-{summary.daysUntilClosing}
          </div>
        </div>

        {/* 전월 대비 */}
        <div className="glass-card rounded-xl p-3 text-center">
          {isDiffPositive
            ? <TrendingUp className="w-4 h-4 text-rose-400 mx-auto mb-1" />
            : <TrendingDown className="w-4 h-4 text-emerald-400 mx-auto mb-1" />
          }
          <div className="text-[10px] text-slate-400 mb-0.5">전월 대비</div>
          <div className={`text-sm font-bold ${isDiffPositive ? 'text-rose-300' : 'text-emerald-300'}`} style={{ fontFamily: "'Outfit', sans-serif" }}>
            {isDiffPositive ? '+' : ''}{summary.spendDiffPercent}%
          </div>
        </div>
      </div>
    </div>
  );
};
