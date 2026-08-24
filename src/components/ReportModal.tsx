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

// 메타 정보 불필요해짐 (하드코딩)


export const ReportModal: React.FC<ReportModalProps> = ({ isOpen, onClose, expenses, summary }) => {
  const [editing, setEditing] = useState(false);
  const [tableData, setTableData] = useState(
    expenses.map(e => ({
      id: e.id,
      date: e.date,
      amount: won(e.amount),
      purpose: e.purpose,
      note: e.note || ''
    }))
  );

  if (!isOpen) return null;

  const submitDate = new Date().toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });

  const getPeriodString = (closingDateStr: string) => {
    const match = closingDateStr.match(/(\d{4})[^\d]+(\d{1,2})/);
    if (!match) return `~ ${closingDateStr}`;
    const year = parseInt(match[1], 10);
    const month = parseInt(match[2], 10);
    
    let prevYear = year;
    let prevMonth = month - 1;
    if (prevMonth === 0) {
      prevMonth = 12;
      prevYear -= 1;
    }
    
    const prevMonthStr = String(prevMonth).padStart(2, '0');
    return `${prevYear}.${prevMonthStr}.16 ~ ${closingDateStr}`;
  };

  const ordered = [...tableData].sort((a, b) => (a.date < b.date ? -1 : 1));

  const handleTableChange = (id: string, field: string, value: string) => {
    setTableData(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

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
              <div className="sc-meta-val">{getPeriodString(summary.closingDateStr)}</div>
            </div>

            <div className="sc-meta-row">
              <div className="sc-meta-total-key">총 집행액</div>
              <div className="sc-meta-total-val">
                <span className="num">{won(summary.currentSpend)}</span>
                <span style={{ fontSize: 13, color: 'var(--muted)' }}>총 {expenses.length}건</span>
              </div>
            </div>
          </div>


          {/* 2. 사용 내역 세부 명세 */}
          <div className="sc-section-head">
            <h2 className="sc-section-title">2. 세부사용 내역</h2>
            <button
              type="button"
              className="sc-link sc-no-print"
              onClick={() => setEditing((v) => !v)}
            >
              {editing ? '표 편집 완료' : '표 내용 편집하기'}
            </button>
          </div>

          {ordered.length === 0 ? (
            <div className="sc-blankbox">등록된 결제 내역이 없습니다</div>
          ) : (
            <div className="sc-detail">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr 2fr', fontWeight: 600, padding: '12px 16px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', fontSize: '13px', color: '#475569' }}>
                <span>일자</span>
                <span>금액</span>
                <span>사용목적</span>
                <span>비고</span>
              </div>

              {ordered.map((item) => (
                <div key={item.id} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr 2fr', padding: '12px 16px', borderBottom: '1px solid #f1f5f9', fontSize: '14px', alignItems: 'center' }}>
                  {editing ? (
                    <>
                      <input className="sc-input" value={item.date} onChange={e => handleTableChange(item.id, 'date', e.target.value)} style={{ padding: '4px', fontSize: '13px' }} />
                      <input className="sc-input" value={item.amount} onChange={e => handleTableChange(item.id, 'amount', e.target.value)} style={{ padding: '4px', fontSize: '13px' }} />
                      <input className="sc-input" value={item.purpose} onChange={e => handleTableChange(item.id, 'purpose', e.target.value)} style={{ padding: '4px', fontSize: '13px' }} />
                      <input className="sc-input" value={item.note} onChange={e => handleTableChange(item.id, 'note', e.target.value)} style={{ padding: '4px', fontSize: '13px' }} />
                    </>
                  ) : (
                    <>
                      <span>{item.date}</span>
                      <span>{item.amount}</span>
                      <span>{item.purpose}</span>
                      <span style={{ color: 'var(--muted)' }}>{item.note || '-'}</span>
                    </>
                  )}
                </div>
              ))}

              <div className="sc-detail-sum">
                <span className="sc-detail-sum-label">합 계</span>
                <span className="sc-detail-sum-value">{won(summary.currentSpend)}</span>
              </div>
            </div>
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
                  top: '-4px',
                  left: '0px',
                  fontFamily: '"Nanum Pen Script", "Caveat", "궁서", cursive',
                  fontSize: '24px',
                  color: 'rgba(0, 0, 0, 0.75)',
                  transform: 'rotate(-5deg)',
                  pointerEvents: 'none',
                  whiteSpace: 'nowrap',
                  letterSpacing: '2px'
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
