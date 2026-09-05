import React, { useState } from 'react';
import type { ExpenseItem, BudgetSummary } from '../types/expense';
import { isDirectedExpense, getDirectedBy } from '../types/expense';
import { exportReportToPDF, exportReportToJPG } from '../utils/pdfExporter';
import { Download, Image as ImageIcon, Printer, X } from 'lucide-react';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  expenses: ExpenseItem[];
  summary: BudgetSummary;
}

const won = (n: number) => '₩' + Math.round(n).toLocaleString('ko-KR');

/** 임원 지시 라벨 */
const directedLabel = (item: ExpenseItem): string => {
  const d = getDirectedBy(item);
  if (d === 'ceo') return '🏢 대표 지시';
  if (d === 'chairman') return '👔 회장 지시';
  return '';
};

export const ReportModal: React.FC<ReportModalProps> = ({ isOpen, onClose, expenses, summary }) => {
  const [editing, setEditing] = useState(false);
  const [tableData, setTableData] = useState(
    expenses.map(e => ({
      id: e.id,
      date: e.date,
      amount: won(e.amount),
      purpose: e.purpose,
      note: e.note || '',
      directedBy: getDirectedBy(e)
    }))
  );

  if (!isOpen) return null;

  // 개인 사용 / 임원 지시 사용 분리
  const personalExpenses = expenses.filter(e => !isDirectedExpense(e));
  const directedExpenses = expenses.filter(e => isDirectedExpense(e));

  const personalTableData = tableData.filter(t => t.directedBy === 'none');
  const directedTableData = tableData.filter(t => t.directedBy !== 'none');

  const personalTotal = personalExpenses.reduce((sum, e) => sum + e.amount, 0);
  const directedTotal = directedExpenses.reduce((sum, e) => sum + e.amount, 0);

  const submitDate = new Date().toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });

  const getPeriodString = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth() + 1;
    const day = today.getDate();

    let startYear = year;
    let startMonth = month;
    let endYear = year;
    let endMonth = month + 1;

    if (day < 15) {
      startMonth = month - 1;
      endMonth = month;
      if (startMonth === 0) {
        startMonth = 12;
        startYear -= 1;
      }
    } else {
      if (endMonth > 12) {
        endMonth = 1;
        endYear += 1;
      }
    }
    
    const curMonthStr = String(startMonth).padStart(2, '0');
    const nextMonthStr = String(endMonth).padStart(2, '0');
    return `${startYear}.${curMonthStr}.15 ~ ${endYear}.${nextMonthStr}.14`;
  };

  const orderedPersonal = [...personalTableData].sort((a, b) => (a.date < b.date ? -1 : 1));
  const orderedDirected = [...directedTableData].sort((a, b) => (a.date < b.date ? -1 : 1));

  const handleTableChange = (id: string, field: string, value: string) => {
    setTableData(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  /** 공통 테이블 행 렌더링 */
  const renderRows = (items: typeof tableData, isDirected: boolean) =>
    items.map((item) => {
      const original = expenses.find(e => e.id === item.id);
      const badge = original ? directedLabel(original) : '';
      return (
        <div
          key={item.id}
          style={{
            display: 'grid',
            gridTemplateColumns: isDirected ? '1fr 1fr 2fr 1.5fr 1fr' : '1fr 1fr 2fr 2fr',
            padding: '12px 16px',
            borderBottom: '1px solid #f1f5f9',
            fontSize: '14px',
            alignItems: 'center',
            background: isDirected ? '#fffbeb' : undefined
          }}
        >
          {editing ? (
            <>
              <input className="sc-input" value={item.date} onChange={e => handleTableChange(item.id, 'date', e.target.value)} style={{ padding: '4px', fontSize: '13px' }} />
              <input className="sc-input" value={item.amount} onChange={e => handleTableChange(item.id, 'amount', e.target.value)} style={{ padding: '4px', fontSize: '13px' }} />
              <input className="sc-input" value={item.purpose} onChange={e => handleTableChange(item.id, 'purpose', e.target.value)} style={{ padding: '4px', fontSize: '13px' }} />
              <input className="sc-input" value={item.note} onChange={e => handleTableChange(item.id, 'note', e.target.value)} style={{ padding: '4px', fontSize: '13px' }} />
              {isDirected && <span style={{ fontSize: '12px', color: '#d97706', fontWeight: 600 }}>{badge}</span>}
            </>
          ) : (
            <>
              <span>{item.date}</span>
              <span>{item.amount}</span>
              <span>{item.purpose}</span>
              <span style={{ color: 'var(--muted)' }}>{item.note || '-'}</span>
              {isDirected && <span style={{ fontSize: '12px', color: '#d97706', fontWeight: 600 }}>{badge}</span>}
            </>
          )}
        </div>
      );
    });

  return (
    <div className="sc-overlay">
      <div className="sc-sheet">
        {/* 툴바 */}
        <div className="sc-sheet-bar sc-no-print" style={{ justifyContent: 'flex-end' }}>
          <div className="sc-sheet-actions">
            <button
              type="button"
              className="sc-btn sc-btn-primary sc-btn-sm"
              style={{ background: '#10b981' }}
              onClick={() => {
                const reportEl = document.getElementById('printable-report-area');
                if (!reportEl) return;
                const printWin = window.open('', '_blank', 'width=900,height=700');
                if (!printWin) {
                  alert('팝업이 차단되었습니다. 팝업 허용 후 다시 시도해주세요.');
                  return;
                }
                // CSS 스타일 시트 수집 (스타일 쿨레시 방지)
                const styleSheets = Array.from(document.styleSheets)
                  .map(s => {
                    try { return Array.from(s.cssRules).map(r => r.cssText).join('\n'); } catch { return ''; }
                  })
                  .join('\n');

                printWin.document.write(`
                  <!DOCTYPE html><html><head><meta charset="utf-8"><title>결산 보고서 출력</title>
                  <style>
                    ${styleSheets}
                    body { margin: 20px; font-family: -apple-system, BlinkMacSystemFont, sans-serif; background: #fff !important; color: #0f172a !important; }
                    img { max-width: 60px; }
                    table { width: 100%; border-collapse: collapse; }
                    td, th { border: 1px solid #ddd; padding: 8px; }
                    .sc-no-print { display: none !important; }
                    .sc-overlay, .sc-sheet-bar { display: none !important; }
                  </style>
                  </head><body>${reportEl.innerHTML}</body></html>
                `);
                printWin.document.close();
                // onload 이후에 print() 호출 → 화면 나탄다 사라지는 문제 해결
                printWin.onload = () => {
                  printWin.focus();
                  printWin.print();
                };
              }}
            >
              <Printer size={16} strokeWidth={1.9} />
              프린트 출력
            </button>
            <button
              type="button"
              className="sc-btn sc-btn-primary sc-btn-sm"
              style={{ background: '#0284c7' }}
              onClick={() =>
                exportReportToJPG(
                  'printable-report-area',
                  `SpaCardFlow_결산보고서_${summary.closingDateStr}.jpg`
                )
              }
            >
              <ImageIcon size={16} strokeWidth={1.9} />
              JPG 저장
            </button>
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
              PDF 저장
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
                <img src="/logo.svg" alt="" />
                <div>
                  <div className="sc-report-org-name">BLUE OCEAN WELLNESS SPA</div>
                </div>
              </div>
              <h1 className="sc-report-title">법인카드 월간 사용 내역 결산 보고서</h1>
              <div className="sc-report-dates">
                제출일자 {submitDate}
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
            <div className="sc-meta-row">
              <div className="sc-meta-key">카드 정보</div>
              <div className="sc-meta-val">기업은행 (동반상생카드) 5292 **** **** 5947</div>
            </div>

            <div className="sc-meta-row">
              <div className="sc-meta-key">결산 기간</div>
              <div className="sc-meta-val">{getPeriodString()}</div>
            </div>

            <div className="sc-meta-row">
              <div className="sc-meta-total-key">이수용 이사 사용 소계</div>
              <div className="sc-meta-total-val">
                <span className="num">{won(personalTotal)}</span>
                <span style={{ fontSize: 13, color: 'var(--muted)' }}>({personalExpenses.length}건 · 한도 {won(summary.monthlyBudget)})</span>
              </div>
            </div>

            {directedExpenses.length > 0 && (
              <>
                {summary.ceoSpend > 0 && (
                  <div className="sc-meta-row" style={{ background: '#eef2ff', borderLeft: '4px solid #6366f1' }}>
                    <div className="sc-meta-total-key" style={{ color: '#4338ca' }}>🏢 대표님 지시 소계</div>
                    <div className="sc-meta-total-val">
                      <span className="num" style={{ color: '#4338ca' }}>{won(summary.ceoSpend)}</span>
                      <span style={{ fontSize: 13, color: '#6366f1' }}>한도 별도</span>
                    </div>
                  </div>
                )}
                {summary.chairmanSpend > 0 && (
                  <div className="sc-meta-row" style={{ background: '#fffbeb', borderLeft: '4px solid #f59e0b' }}>
                    <div className="sc-meta-total-key" style={{ color: '#d97706' }}>👔 회장님 지시 소계</div>
                    <div className="sc-meta-total-val">
                      <span className="num" style={{ color: '#d97706' }}>{won(summary.chairmanSpend)}</span>
                      <span style={{ fontSize: 13, color: '#b45309' }}>한도 별도</span>
                    </div>
                  </div>
                )}
              </>
            )}

            <div className="sc-meta-row">
              <div className="sc-meta-total-key">총 집행액</div>
              <div className="sc-meta-total-val">
                <span className="num">{won(summary.currentSpend)}</span>
                <span style={{ fontSize: 13, color: 'var(--muted)' }}>총 {expenses.length}건</span>
              </div>
            </div>
          </div>


          {/* 2. 개인 사용 내역 세부 명세 */}
          <div className="sc-section-head">
            <h2 className="sc-section-title">2-1. 이수용 이사 사용 내역 (한도 내)</h2>
            <button
              type="button"
              className="sc-link sc-no-print"
              onClick={() => setEditing((v) => !v)}
            >
              {editing ? '표 편집 완료' : '표 내용 편집하기'}
            </button>
          </div>

          {orderedPersonal.length === 0 ? (
            <div className="sc-blankbox">개인 사용 결제 내역이 없습니다</div>
          ) : (
            <div className="sc-detail">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr 2fr', fontWeight: 600, padding: '12px 16px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', fontSize: '13px', color: '#475569' }}>
                <span>일자</span>
                <span>금액</span>
                <span>사용목적</span>
                <span>비고</span>
              </div>

              {renderRows(orderedPersonal, false)}

              <div className="sc-detail-sum">
                <span className="sc-detail-sum-label">이수용 이사 소계</span>
                <span className="sc-detail-sum-value">{won(personalTotal)}</span>
              </div>
            </div>
          )}

          {/* 2-2. 임원 지시 사용 내역 (한도 외) — 눈에 띄게 강조 */}
          {directedExpenses.length > 0 && (
            <>
              <div className="sc-section-head" style={{ marginTop: '32px' }}>
                <h2 className="sc-section-title" style={{ color: '#d97706' }}>
                  ⚡ 2-2. 임원 지시 사용 내역 (한도 외)
                </h2>
              </div>

              <div className="sc-detail" style={{ border: '2px solid #f59e0b', borderRadius: '12px' }}>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr 2fr 1.5fr 1fr',
                  fontWeight: 600,
                  padding: '12px 16px',
                  borderBottom: '1px solid #fcd34d',
                  background: '#fef3c7',
                  fontSize: '13px',
                  color: '#92400e',
                  borderRadius: '10px 10px 0 0'
                }}>
                  <span>일자</span>
                  <span>금액</span>
                  <span>사용목적</span>
                  <span>비고</span>
                  <span>지시자</span>
                </div>

                {renderRows(orderedDirected, true)}

                <div className="sc-detail-sum" style={{ background: '#fef3c7', color: '#92400e' }}>
                  <span className="sc-detail-sum-label">임원 지시 소계</span>
                  <span className="sc-detail-sum-value" style={{ color: '#d97706' }}>{won(directedTotal)}</span>
                </div>
              </div>
            </>
          )}

          {/* 서명 */}
          <div className="sc-sign" style={{ marginTop: '40px', textAlign: 'center', position: 'relative' }}>
            <p className="sc-sign-note" style={{ fontSize: '15px', color: '#0f172a', marginBottom: '20px' }}>
              위 법인카드는 블루오션 웰니스 스파의 투명한 운영을 위해 업무 목적에 적합하게 집행되었습니다.
            </p>
            <div className="sc-sign-date" style={{ fontSize: '15px', marginBottom: '10px' }}>{submitDate}</div>
            <div className="sc-sign-name" style={{ fontSize: '16px', fontWeight: 600, display: 'inline-block' }}>
              이수용 이사{' '}
              <span style={{ position: 'relative', display: 'inline-block' }}>
                (인)
                <span style={{
                  position: 'absolute',
                  top: '-9px',
                  left: '1px',
                  fontFamily: '"궁서", "Gungsuh", serif',
                  fontSize: '28px',
                  color: 'rgba(71, 85, 105, 0.75)',
                  transform: 'rotate(-2deg)',
                  pointerEvents: 'none',
                  whiteSpace: 'nowrap',
                  letterSpacing: '3px'
                }}>
                  이수용
                </span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
