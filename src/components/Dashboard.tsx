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
    <div className="mb-8">
      {/* 메인: 사용액 + 프로그래스 바 */}
      <div className="glass-card p-5 mb-4 border-t-4 border-t-blue-500">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">이번 달 사용 금액</span>
          <span className="text-sm font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">{usagePercentage}%</span>
        </div>
        <div className="text-3xl font-extrabold text-slate-800 tracking-tight mb-4" style={{ fontFamily: "'Outfit', sans-serif" }}>
          ₩{summary.currentSpend.toLocaleString()}
        </div>
        
        <div className="w-full h-2.5 bg-slate-100 rounded-full mb-2 overflow-hidden shadow-inner">
          <div
            className={`h-full rounded-full transition-all duration-700 ${usagePercentage > 85 ? 'bg-gradient-to-r from-orange-400 to-red-500' : 'bg-gradient-to-r from-blue-400 to-indigo-500'}`}
            style={{ width: `${usagePercentage}%` }}
          />
        </div>
        <div className="flex justify-between items-center text-[11px] font-semibold text-slate-400">
          <span>한도 ₩{summary.monthlyBudget.toLocaleString()}</span>
          {usagePercentage >= 100 && <span className="text-red-500">초과 주의</span>}
        </div>
      </div>

      {/* 서브: 3개 미니 지표를 1행에 */}
      <div className="grid grid-cols-3 gap-3">
        {/* 남은 금액 */}
        <div className="glass-card p-4 text-center">
          <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-2">
            <Wallet className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-[10px] font-bold text-slate-400 mb-1">남은 금액</div>
          <div className={`text-sm font-extrabold ${summary.remainingBudget >= 0 ? 'text-slate-700' : 'text-red-500'}`} style={{ fontFamily: "'Outfit', sans-serif" }}>
            ₩{Math.abs(summary.remainingBudget).toLocaleString()}
          </div>
        </div>

        {/* D-Day */}
        <div className="glass-card p-4 text-center">
          <div className="w-8 h-8 rounded-full bg-orange-50 flex items-center justify-center mx-auto mb-2">
            <Clock className="w-4 h-4 text-orange-500" />
          </div>
          <div className="text-[10px] font-bold text-slate-400 mb-1">결산까지</div>
          <div className="text-sm font-extrabold text-slate-700" style={{ fontFamily: "'Outfit', sans-serif" }}>
            D-{summary.daysUntilClosing}
          </div>
        </div>

        {/* 전월 대비 */}
        <div className="glass-card p-4 text-center">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center mx-auto mb-2 ${isDiffPositive ? 'bg-red-50' : 'bg-blue-50'}`}>
            {isDiffPositive
              ? <TrendingUp className="w-4 h-4 text-red-500" />
              : <TrendingDown className="w-4 h-4 text-blue-500" />
            }
          </div>
          <div className="text-[10px] font-bold text-slate-400 mb-1">전월 대비</div>
          <div className={`text-sm font-extrabold ${isDiffPositive ? 'text-red-500' : 'text-blue-600'}`} style={{ fontFamily: "'Outfit', sans-serif" }}>
            {isDiffPositive ? '+' : ''}{summary.spendDiffPercent}%
          </div>
        </div>
      </div>
    </div>
  );
};
