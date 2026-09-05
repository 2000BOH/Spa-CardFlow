import React from 'react';
import type { BudgetSummary } from '../types/expense';

interface DashboardProps {
  summary: BudgetSummary;
  count: number;
}

const won = (n: number) => '₩' + Math.round(n).toLocaleString('ko-KR');

export const Dashboard: React.FC<DashboardProps> = ({ summary, count }) => {
  // 한도 비율은 '개인 사용분'만 기준
  const usagePct =
    summary.monthlyBudget > 0
      ? Math.min(100, Math.round((summary.personalSpend / summary.monthlyBudget) * 100))
      : 0;

  const hasPrev = summary.prevMonthSpend > 0;
  const up = summary.spendDiff >= 0;
  const diffText = hasPrev ? `${up ? '+' : ''}${summary.spendDiffPercent}%` : '—';
  const diffColor = !hasPrev ? 'rgba(255,255,255,0.45)' : up ? '#f0616d' : '#4ed0a7';

  const hasCeo = summary.ceoSpend > 0;
  const hasChairman = summary.chairmanSpend > 0;

  return (
    <>
      <section className="sc-hero">
        <div className="sc-hero-in">
          {/* 왼쪽: 개인 사용 금액 + 한도 바 */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="sc-hero-label">이번 달 이수용 이사 사용</div>
            <div className="sc-hero-amount">{won(summary.personalSpend)}</div>

            <div className="sc-bar">
              <i style={{ width: `${usagePct}%` }} />
            </div>

            <div className="sc-hero-foot">
              <span>한도 {won(summary.monthlyBudget)} 중 {usagePct}%</span>
              <span>결산 D-{summary.daysUntilClosing}</span>
            </div>
          </div>

          {/* 오른쪽: 검은 배경 위 통계 카드들 */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            minWidth: '200px',
            alignItems: 'flex-end',
          }}>
            {/* 남은금액 / 건수 / 전월대비 */}
            <div style={{ display: 'flex', gap: '16px' }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.55)', marginBottom: '2px' }}>남은 금액</div>
                <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#fff' }}>
                  {won(Math.max(0, summary.remainingBudget))}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.55)', marginBottom: '2px' }}>건수</div>
                <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#fff' }}>{count}건</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.55)', marginBottom: '2px' }}>전월 대비</div>
                <div style={{ fontSize: '1.05rem', fontWeight: 700, color: diffColor }}>{diffText}</div>
              </div>
            </div>

            {/* 대표님 지시 금액 */}
            {hasCeo && (
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: '5px',
                background: 'rgba(99,102,241,0.25)', border: '1px solid rgba(99,102,241,0.45)',
                borderRadius: '16px', padding: '3px 10px',
                fontSize: '0.72rem', color: 'rgba(255,255,255,0.92)',
              }}>
                <span>🏢 대표님 지시</span>
                <span style={{ fontWeight: 700 }}>{won(summary.ceoSpend)}</span>
                <span style={{ opacity: 0.65 }}>· 한도 별도</span>
              </div>
            )}

            {/* 회장님 지시 금액 */}
            {hasChairman && (
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: '5px',
                background: 'rgba(245,158,11,0.22)', border: '1px solid rgba(245,158,11,0.45)',
                borderRadius: '16px', padding: '3px 10px',
                fontSize: '0.72rem', color: 'rgba(255,255,255,0.92)',
              }}>
                <span>👔 회장님 지시</span>
                <span style={{ fontWeight: 700 }}>{won(summary.chairmanSpend)}</span>
                <span style={{ opacity: 0.65 }}>· 한도 별도</span>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 모바일: 흰 배경 카드 (남은금액/건수/전월대비) */}
      <div className="sc-stats sc-only-mobile">
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
          <div className="sc-stat-value" style={{ color: !hasPrev ? '#5b616e' : up ? '#cf202f' : '#00a35c' }}>
            {diffText}
          </div>
        </div>
        {/* 모바일 임원 지시 요약 */}
        {(hasCeo || hasChairman) && (
          <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '8px', flexWrap: 'wrap', paddingTop: '4px' }}>
            {hasCeo && (
              <div style={{ fontSize: '0.78rem', color: '#4f46e5', fontWeight: 600, background: '#eef2ff', padding: '3px 10px', borderRadius: '12px' }}>
                🏢 대표님 지시 {won(summary.ceoSpend)}
              </div>
            )}
            {hasChairman && (
              <div style={{ fontSize: '0.78rem', color: '#92400e', fontWeight: 600, background: '#fffbeb', padding: '3px 10px', borderRadius: '12px' }}>
                👔 회장님 지시 {won(summary.chairmanSpend)}
              </div>
            )}
          </div>
        )}
      </div>
      {/* 노란 배너(sc-directed-summary) 완전 제거 — 보고서 출력 시만 표시 */}
    </>
  );
};
