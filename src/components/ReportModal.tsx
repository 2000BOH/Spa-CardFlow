import React, { useState } from 'react';
import type { ExpenseItem, BudgetSummary } from '../types/expense';
import { exportReportToPDF, printReportWindow } from '../utils/pdfExporter';
import { Download, Printer, X } from 'lucide-react';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  expenses: ExpenseItem[];
  summary: BudgetSummary;
}

const won = (n: number) => '₩' + Math.round(n).toLocaleString('ko-KR');

/** 기안 정보는 한 번 입력하면 브라우저에 저장된다 */
const META_KEY = 'spa_cardflow_report_meta_v1';
type Meta = { team: string; drafter: string; card: string };
const loadMeta = (): Meta => {
  try {
    const raw = localStorage.getItem(META_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* noop */
  }
  return { team: '', drafter: '', card: '' };
};

export const ReportModal: React.FC<ReportModalProps> = ({ isOpen, onClose, expenses, summary }) => {
  const [meta, setMeta] = useState<Meta>(loadMeta);
  const [editing, setEditing] = useState(false);

  if (!isOpen) return null;

  const saveMeta = (next: Meta) => {
    setMeta(next);
    try {
      localStorage.setItem(META_KEY, JSON.stringify(next));
    } catch {
      /* noop */
    }
  };

  const today = new Date();
  const submitDate = today.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });

  const byCategory: Record<string, number> = {};
  expenses.forEach((item) => {
    byCategory[item.category] = (byCategory[item.category] ?? 0) + item.amount;
  });
  const breakdown = Object.entries(byCategory).sort((a, b) => b[1] - a[1]);

  const ordered = [...expenses].sort((a, b) => (a.date < b.date ? -1 : 1));
  const blank = (v: string) => (v.trim() ? v : '미입력');
  const blankClass = (v: string) => (v.trim() ? 'text-ink' : 'text-muted');

  return (
    <div className="fixed inset-0 z-[10000] bg-[rgba(10,11,13,0.6)] flex items-start justify-center overflow-auto md:p-8">
      <div className="w-full md:max-w-[860px] bg-white md:rounded-[20px] min-h-screen md:min-h-0 overflow-hidden">
        {/* 툴바 */}
        <div className="cb-no-print sticky top-0 z-10 flex items-center justify-between gap-3 px-5 md:px-8 py-4 bg-white border-b border-line">
          <div className="text-[15px] font-bold tracking-tight">결산 보고서</div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() =>
                exportReportToPDF(
                  'printable-report-area',
                  `SpaCardFlow_결산보고서_${summary.closingDateStr}.pdf`
                )
              }
              className="cb-btn cb-btn-primary h-11 px-5 text-[15px]"
            >
              <Download className="w-4 h-4" />
              PDF
            </button>
            <button
              type="button"
              onClick={() => printReportWindow()}
              className="cb-btn cb-btn-secondary h-11 px-5 text-[15px] hidden md:inline-flex"
            >
              <Printer className="w-4 h-4" />
              인쇄
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="닫기"
              className="w-11 h-11 shrink-0 flex items-center justify-center rounded-full bg-surface border-none cursor-pointer"
            >
              <X className="w-[18px] h-[18px]" />
            </button>
          </div>
        </div>

        <div id="printable-report-area" className="px-5 md:px-8 py-6 md:py-8 bg-white text-ink">
          {/* 문서 머리 + 결재란 */}
          <div className="md:flex md:items-start md:justify-between md:gap-8 border-b-2 border-ink pb-6 mb-7">
            <div className="min-w-0">
              <div className="flex items-center gap-2.5 mb-3">
                <img src="/logo.png" alt="" className="w-9 h-9 rounded-lg object-cover" />
                <div>
                  <div className="text-[12px] font-bold tracking-[0.14em] leading-tight">
                    BLUE OCEAN WELLNESS SPA
                  </div>
                  <div className="text-[12px] text-muted leading-tight mt-0.5">
                    Spa CardFlow 지출 정산 시스템
                  </div>
                </div>
              </div>
              <h1 className="text-[22px] md:text-[28px] font-bold tracking-tight leading-tight">
                법인카드 월간 사용 내역 결산 보고서
              </h1>
              <p className="text-[13px] text-muted mt-2.5 leading-relaxed">
                결산일 {summary.closingDateStr} · 제출일자 {submitDate}
              </p>
            </div>

            <div className="flex mt-5 md:mt-0 border border-[rgba(91,97,110,0.3)] rounded-lg overflow-hidden shrink-0">
              <div className="w-[34px] bg-surface flex items-center justify-center text-[12px] font-bold tracking-[0.3em] writing-mode-vertical border-r border-[rgba(91,97,110,0.3)]">
                결재
              </div>
              <div className="grid grid-cols-3 flex-1 md:w-[220px]">
                {['기 안', '검 토', '승 인'].map((label, i) => (
                  <div key={label} className={i < 2 ? 'border-r border-[rgba(91,97,110,0.3)]' : ''}>
                    <div className="py-1.5 text-center text-[12px] font-medium bg-surface border-b border-[rgba(91,97,110,0.3)]">
                      {label}
                    </div>
                    <div className="h-14" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 1. 기본 기안 정보 */}
          <div className="flex items-center justify-between gap-3 mb-2.5">
            <div className="flex items-center gap-2">
              <span className="w-[7px] h-[7px] bg-brand inline-block" />
              <h2 className="text-[15px] font-bold">1. 기본 기안 정보</h2>
            </div>
            <button
              type="button"
              onClick={() => setEditing((v) => !v)}
              className="cb-no-print border-none bg-transparent text-brand text-[14px] cursor-pointer p-0"
            >
              {editing ? '입력 완료' : '기안 정보 입력'}
            </button>
          </div>

          <div className="border border-line rounded-xl overflow-hidden mb-7">
            {(
              [
                ['기안 부서', 'team'],
                ['기 안 자', 'drafter'],
                ['카드 정보', 'card']
              ] as const
            ).map(([label, key]) => (
              <div key={key} className="grid grid-cols-[104px_1fr] border-b border-line-soft">
                <div className="px-3.5 py-3 bg-surface text-[13px] font-medium text-muted">
                  {label}
                </div>
                <div className="px-3.5 py-2 flex items-center">
                  {editing ? (
                    <input
                      type="text"
                      value={meta[key]}
                      onChange={(e) => saveMeta({ ...meta, [key]: e.target.value })}
                      placeholder={label}
                      className="cb-input h-10 text-[15px]"
                    />
                  ) : (
                    <span className={`text-[14px] ${blankClass(meta[key])}`}>
                      {blank(meta[key])}
                    </span>
                  )}
                </div>
              </div>
            ))}

            <div className="grid grid-cols-[104px_1fr] border-b border-line-soft">
              <div className="px-3.5 py-3 bg-surface text-[13px] font-medium text-muted">
                결산 기간
              </div>
              <div className="px-3.5 py-3 text-[14px]">~ {summary.closingDateStr}</div>
            </div>

            <div className="grid grid-cols-[104px_1fr]">
              <div className="px-3.5 py-3.5 bg-ink text-white text-[13px] font-medium">총 집행액</div>
              <div className="px-3.5 py-3.5 flex items-baseline gap-2">
                <span className="num text-[20px]">{won(summary.currentSpend)}</span>
                <span className="text-[13px] text-muted">총 {expenses.length}건</span>
              </div>
            </div>
          </div>

          {/* 2. 비목별 집행 요약 */}
          <div className="flex items-center gap-2 mb-3">
            <span className="w-[7px] h-[7px] bg-brand inline-block" />
            <h2 className="text-[15px] font-bold">2. 비목별 집행 요약</h2>
          </div>

          {breakdown.length === 0 ? (
            <div className="py-7 px-4 border border-dashed border-[rgba(91,97,110,0.35)] rounded-xl text-center text-[14px] text-muted mb-7">
              집행 내역이 없습니다
            </div>
          ) : (
            <div className="flex flex-col gap-4 mb-7">
              {breakdown.map(([cat, amt]) => {
                const pct =
                  summary.currentSpend > 0 ? Math.round((amt / summary.currentSpend) * 100) : 0;
                return (
                  <div key={cat}>
                    <div className="flex items-baseline justify-between gap-3 mb-2">
                      <span className="text-[14px]">{cat}</span>
                      <span className="flex items-baseline gap-2.5">
                        <span className="text-[13px] text-muted">{pct}%</span>
                        <span className="num text-[16px]">{won(amt)}</span>
                      </span>
                    </div>
                    <div className="h-[5px] rounded-full bg-surface overflow-hidden">
                      <div className="h-full rounded-full bg-brand" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* 3. 사용 내역 세부 명세 */}
          <div className="flex items-center gap-2 mb-3">
            <span className="w-[7px] h-[7px] bg-brand inline-block" />
            <h2 className="text-[15px] font-bold">3. 사용 내역 세부 명세</h2>
          </div>

          {ordered.length === 0 ? (
            <div className="py-7 px-4 border border-dashed border-[rgba(91,97,110,0.35)] rounded-xl text-center text-[14px] text-muted">
              등록된 결제 내역이 없습니다
            </div>
          ) : (
            <div className="border border-line rounded-xl overflow-hidden">
              {/* 데스크톱 표 머리글 */}
              <div className="hidden md:grid grid-cols-[44px_104px_1fr_132px_120px] gap-3 px-4 py-3 bg-surface text-[12px] font-medium uppercase tracking-[0.06em] text-muted">
                <div>No</div>
                <div>결제일자</div>
                <div>상호 · 품목 · 목적</div>
                <div>구분</div>
                <div className="text-right">금액</div>
              </div>

              {ordered.map((item, idx) => (
                <div
                  key={item.id}
                  className="px-4 py-3.5 border-t border-line-soft md:grid md:grid-cols-[44px_104px_1fr_132px_120px] md:gap-3 md:items-start"
                >
                  {/* 모바일 */}
                  <div className="md:hidden">
                    <div className="flex items-baseline justify-between gap-2.5">
                      <div className="text-[12px] text-muted">
                        No.{idx + 1} · {item.date}
                      </div>
                      <div className="num text-[16px]">{won(item.amount)}</div>
                    </div>
                    <div className="text-[15px] font-medium mt-1.5">{item.storeName}</div>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="px-2 py-1 rounded-md bg-surface text-[12px]">
                        {item.category}
                      </span>
                      <span className="text-[13px] text-muted truncate">
                        {item.items} ({item.quantity}개)
                      </span>
                    </div>
                    <div className="text-[13px] text-muted leading-relaxed mt-1.5">
                      {item.purpose}
                    </div>
                  </div>

                  {/* 데스크톱 */}
                  <div className="hidden md:block text-[14px] text-muted">{idx + 1}</div>
                  <div className="hidden md:block text-[14px] tabular-nums">{item.date}</div>
                  <div className="hidden md:block min-w-0 text-[14px]">
                    <div className="font-medium">{item.storeName}</div>
                    <div className="text-muted leading-relaxed mt-0.5">
                      {item.items} ({item.quantity}개) · {item.purpose}
                    </div>
                  </div>
                  <div className="hidden md:block text-[14px] text-muted">{item.category}</div>
                  <div className="hidden md:block num text-[15px] text-right">
                    {won(item.amount)}
                  </div>
                </div>
              ))}

              <div className="flex items-baseline justify-between gap-3 px-4 py-4 bg-ink text-white">
                <span className="text-[14px] font-medium">합 계</span>
                <span className="num text-[19px]">{won(summary.currentSpend)}</span>
              </div>
            </div>
          )}

          {/* 서명 */}
          <div className="mt-7 pt-5 border-t border-line text-center">
            <p className="text-[13px] text-muted leading-relaxed">
              위 법인카드 사용 내역은 블루오션 웰니스 스파의 투명한 운영을 위해 업무 목적에 적합하게
              집행되었음을 증명합니다.
            </p>
            <div className="text-[14px] font-medium mt-4">{submitDate}</div>
            <div className={`text-[15px] font-bold mt-1.5 ${blankClass(meta.drafter)}`}>
              블루오션 웰니스 스파 기안자 {blank(meta.drafter)} (인)
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
