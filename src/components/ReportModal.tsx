import React, { useState } from 'react';
import type { ExpenseItem, BudgetSummary } from '../types/expense';
import { exportReportToPDF } from '../utils/pdfExporter';
import { Download, X } from 'lucide-react';

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
    if (raw) return { team: '', drafter: '', card: '', ...JSON.parse(raw) };
  } catch {
    /* noop */
  }
  return { team: '', drafter: '', card: '' };
};

const META_FIELDS: [string, keyof Meta][] = [
  ['기안 부서', 'team'],
  ['기 안 자', 'drafter'],
  ['카드 정보', 'card']
];

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

  const submitDate = new Date().toLocaleDateString('ko-KR', {
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

  const shown = (v: string) => (v.trim() ? v : '미입력');
  const blankCls = (v: string) => (v.trim() ? '' : ' sc-meta-val-blank');

  return (
    <div className="sc-overlay">
      <div className="sc-sheet">
        {/* 툴바 */}
        <div className="sc-sheet-bar sc-no-print">
          <div className="sc-sheet-bar-title">결산 보고서</div>
          <div className="sc-sheet-actions">
            <button
              type="button"
              className="sc-btn sc-btn-primary sc-btn-sm"
              onClick={() =>
                exportReportToPDF(
                  'printable-report-area',
                  `SpaCardFlow_결산보고서_${summary.closingDateStr}.pdf`
                )
              }
            >
              <Download size={16} strokeWidth={1.9} />
              PDF로 저장
            </button>
            <button type="button" className="sc-icon-btn" aria-label="닫기" onClick={onClose}>
              <X size={18} strokeWidth={2} />
            </button>
          </div>
        </div>

        <div id="printable-report-area" className="sc-report">
          {/* 문서 머리 + 결재란 */}
          <div className="sc-report-head">
            <div style={{ minWidth: 0 }}>
              <div className="sc-report-org">
                <img src="/logo.png" alt="" />
                <div>
                  <div className="sc-report-org-name">BLUE OCEAN WELLNESS SPA</div>
                  <div className="sc-report-org-sub">Spa CardFlow 지출 정산 시스템</div>
                </div>
              </div>
              <h1 className="sc-report-title">법인카드 월간 사용 내역 결산 보고서</h1>
              <div className="sc-report-dates">
                결산일 {summary.closingDateStr} · 제출일자 {submitDate}
              </div>
            </div>

            <div className="sc-approval">
              <div className="sc-approval-spine">결재</div>
              <div className="sc-approval-cells">
                {['기 안', '검 토', '승 인'].map((label) => (
                  <div key={label} className="sc-approval-cell">
                    <div className="sc-approval-cap">{label}</div>
                    <div className="sc-approval-sign" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 1. 기본 기안 정보 */}
          <div className="sc-section-head">
            <h2 className="sc-section-title">1. 기본 기안 정보</h2>
            <button
              type="button"
              className="sc-link sc-no-print"
              onClick={() => setEditing((v) => !v)}
            >
              {editing ? '입력 완료' : '기안 정보 입력'}
            </button>
          </div>

          <div className="sc-meta">
            {META_FIELDS.map(([label, key]) => (
              <div key={key} className="sc-meta-row">
                <div className="sc-meta-key">{label}</div>
                <div className={'sc-meta-val' + blankCls(meta[key])}>
                  {editing ? (
                    <input
                      type="text"
                      className="sc-input"
                      placeholder={label}
                      value={meta[key]}
                      onChange={(e) => saveMeta({ ...meta, [key]: e.target.value })}
                    />
                  ) : (
                    shown(meta[key])
                  )}
                </div>
              </div>
            ))}

            <div className="sc-meta-row">
              <div className="sc-meta-key">결산 기간</div>
              <div className="sc-meta-val">~ {summary.closingDateStr}</div>
            </div>

            <div className="sc-meta-row">
              <div className="sc-meta-total-key">총 집행액</div>
              <div className="sc-meta-total-val">
                <span className="num">{won(summary.currentSpend)}</span>
                <span style={{ fontSize: 13, color: 'var(--muted)' }}>총 {expenses.length}건</span>
              </div>
            </div>
          </div>

          {/* 2. 비목별 집행 요약 */}
          <div className="sc-section-head">
            <h2 className="sc-section-title">2. 비목별 집행 요약</h2>
          </div>

          {breakdown.length === 0 ? (
            <div className="sc-blankbox">집행 내역이 없습니다</div>
          ) : (
            <div className="sc-bd">
              {breakdown.map(([cat, amt]) => {
                const pct =
                  summary.currentSpend > 0 ? Math.round((amt / summary.currentSpend) * 100) : 0;
                return (
                  <div key={cat}>
                    <div className="sc-bd-head">
                      <span className="sc-bd-label">{cat}</span>
                      <span className="sc-bd-right">
                        <span className="sc-bd-pct">{pct}%</span>
                        <span className="sc-bd-amount">{won(amt)}</span>
                      </span>
                    </div>
                    <div className="sc-bd-track">
                      <i style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* 3. 사용 내역 세부 명세 */}
          <div className="sc-section-head">
            <h2 className="sc-section-title">3. 사용 내역 세부 명세</h2>
          </div>

          {ordered.length === 0 ? (
            <div className="sc-blankbox">등록된 결제 내역이 없습니다</div>
          ) : (
            <div className="sc-detail">
              <div className="sc-detail-grid sc-detail-thead sc-only-desktop">
                <span>No</span>
                <span>결제일자</span>
                <span>상호 · 품목 · 목적</span>
                <span>구분</span>
                <span>금액</span>
              </div>

              {ordered.map((item, idx) => (
                <div key={item.id} className="sc-detail-item">
                  {/* 모바일 */}
                  <div className="sc-only-mobile">
                    <div className="sc-detail-top">
                      <span className="sc-detail-no">
                        No.{idx + 1} · {item.date}
                      </span>
                      <span className="sc-detail-amount">{won(item.amount)}</span>
                    </div>
                    <div className="sc-detail-store">{item.storeName}</div>
                    <div className="sc-detail-tags">
                      <span className="sc-tag">{item.category}</span>
                      <span className="sc-detail-items">
                        {item.items} ({item.quantity}개)
                      </span>
                    </div>
                    <div className="sc-detail-purpose">{item.purpose}</div>
                  </div>

                  {/* 데스크톱 */}
                  <div className="sc-detail-grid sc-only-desktop">
                    <span className="sc-detail-cell sc-detail-cell-muted">{idx + 1}</span>
                    <span className="sc-detail-cell" style={{ fontVariantNumeric: 'tabular-nums' }}>
                      {item.date}
                    </span>
                    <span className="sc-detail-cell" style={{ minWidth: 0 }}>
                      <span style={{ fontWeight: 500, display: 'block' }}>{item.storeName}</span>
                      <span
                        style={{
                          display: 'block',
                          color: 'var(--muted)',
                          lineHeight: 1.55,
                          marginTop: 2
                        }}
                      >
                        {item.items} ({item.quantity}개) · {item.purpose}
                      </span>
                    </span>
                    <span className="sc-detail-cell sc-detail-cell-muted">{item.category}</span>
                    <span className="sc-detail-cell-amount">{won(item.amount)}</span>
                  </div>
                </div>
              ))}

              <div className="sc-detail-sum">
                <span className="sc-detail-sum-label">합 계</span>
                <span className="sc-detail-sum-value">{won(summary.currentSpend)}</span>
              </div>
            </div>
          )}

          {/* 서명 */}
          <div className="sc-sign">
            <p className="sc-sign-note">
              위 법인카드 사용 내역은 블루오션 웰니스 스파의 투명한 운영을 위해 업무 목적에 적합하게
              집행되었음을 증명합니다.
            </p>
            <div className="sc-sign-date">{submitDate}</div>
            <div
              className="sc-sign-name"
              style={{ color: meta.drafter.trim() ? undefined : 'var(--muted)' }}
            >
              블루오션 웰니스 스파 기안자 {shown(meta.drafter)} (인)
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
