import React, { useState, useEffect } from 'react';
import type { ExpenseItem, BudgetSummary } from '../types/expense';
import { isDirectedExpense, getDirectedBy } from '../types/expense';
import { exportReportToPDF, exportReportToJPG, printReport } from '../utils/pdfExporter';
import { Download, Image as ImageIcon, Printer, X } from 'lucide-react';

/** 영수증 이미지의 가로세로 비율을 판단해서 landscape 여부를 반환 */
function isLandscapeImage(src: string): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img.naturalWidth > img.naturalHeight * 1.3);
    img.onerror = () => resolve(false);
    img.src = src;
  });
}

/**
 * 영수증 그리드 섹션
 * - 세로 영수증: 3열 그리드(한 행에 3장)
 * - 가로 영수증(landscape): colspan 2 (왼쪽 2칸 차지)
 * - 좌상단 원형 번호 배지
 */
const ReceiptGrid: React.FC<{
  items: ExpenseItem[];
  groupLabel: string;
  startSeq: number;        // 이 그룹의 첫 번째 순번
  borderColor?: string;
  bgColor?: string;
}> = ({ items, groupLabel, startSeq, borderColor, bgColor }) => {
  const withReceipt = items.filter(i => i.receiptImage);
  const [landscapeMap, setLandscapeMap] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let alive = true;
    withReceipt.forEach(async (item) => {
      if (!item.receiptImage) return;
      const isLand = await isLandscapeImage(item.receiptImage);
      if (alive) setLandscapeMap(prev => ({ ...prev, [item.id]: isLand }));
    });
    return () => { alive = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [withReceipt.map(i => i.id).join(',')]);

  if (withReceipt.length === 0) return null;

  return (
    <div style={{
      marginTop: 24,
      border: borderColor ? `2px solid ${borderColor}` : '1px solid #e2e8f0',
      borderRadius: 12,
      overflow: 'hidden',
      background: bgColor || '#fff'
    }}>
      <div style={{
        padding: '10px 16px',
        background: borderColor ? bgColor || '#fef3c7' : '#f8fafc',
        borderBottom: `1px solid ${borderColor || '#e2e8f0'}`,
        fontWeight: 700, fontSize: 14,
        color: borderColor ? '#92400e' : '#475569'
      }}>
        📎 {groupLabel} — 영수증 첨부 ({withReceipt.length}건)
      </div>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: 16,
        padding: 16
      }}>
        {withReceipt.map((item, idx) => {
          const isLand = landscapeMap[item.id] ?? false;
          const seqNum = startSeq + idx; // 전체 문서 기준 순번
          return (
            <div
              key={item.id}
              style={{
                gridColumn: isLand ? 'span 2' : 'span 1',
                border: '1px solid #e2e8f0',
                borderRadius: 8,
                overflow: 'hidden',
                background: '#fff',
                boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                position: 'relative'
              }}
            >
              {/* 쾐션: 상호명 + 일자 + 금액 */}
              <div style={{
                padding: '6px 10px',
                background: '#f1f5f9',
                fontSize: 11,
                color: '#475569',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '60%' }}>
                  {item.storeName}
                </span>
                <span>{item.date} · {'₩' + Math.round(item.amount).toLocaleString('ko-KR')}</span>
              </div>

              {/* 영수증 이미지 (좌상단 순번 배지 포함) */}
              <div style={{
                width: '100%',
                maxHeight: isLand ? 260 : 400,
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'center',
                background: '#f8fafc',
                position: 'relative'
              }}>
                <img
                  src={item.receiptImage!}
                  alt={`${item.storeName} 영수증`}
                  style={{
                    width: '100%',
                    height: isLand ? 260 : undefined,
                    maxHeight: isLand ? 260 : 400,
                    objectFit: isLand ? 'cover' : 'contain',
                    display: 'block'
                  }}
                />
                {/* 좌상단 원형 순번 배지 */}
                <div style={{
                  position: 'absolute',
                  top: 8,
                  left: 8,
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  background: borderColor || '#475569',
                  color: '#fff',
                  fontSize: 13,
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.35)',
                  lineHeight: 1,
                  zIndex: 1
                }}>
                  {seqNum}
                </div>
              </div>

              {/* 사용 목적 */}
              <div style={{ padding: '5px 10px', fontSize: 11, color: '#64748b', borderTop: '1px solid #f1f5f9' }}>
                {item.purpose || item.items || '-'}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};


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

  // expenses 가 변경될 때마다 tableData 재동기화
  const buildTableData = (exps: ExpenseItem[]) =>
    exps.map(e => ({
      id: e.id,
      date: e.date,
      amount: won(e.amount),
      storeName: e.storeName || '',
      items: e.items || '',
      purpose: e.purpose || '',
      note: e.note || '',
      directedBy: getDirectedBy(e)
    }));

  const [tableData, setTableData] = useState(() => buildTableData(expenses));

  useEffect(() => {
    setTableData(buildTableData(expenses));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expenses]);

  if (!isOpen) return null;

  // ── 그룹 분리: 이사(개인) / 회장 지시 / 대표 지시 순서 ──
  const personalExpenses  = expenses.filter(e => getDirectedBy(e) === 'none');
  const chairmanExpenses  = expenses.filter(e => getDirectedBy(e) === 'chairman');
  const ceoExpenses       = expenses.filter(e => getDirectedBy(e) === 'ceo');
  const directedExpenses  = expenses.filter(e => isDirectedExpense(e));

  const personalTableData  = tableData.filter(t => t.directedBy === 'none');
  const chairmanTableData  = tableData.filter(t => t.directedBy === 'chairman');
  const ceoTableData       = tableData.filter(t => t.directedBy === 'ceo');
  const directedTableData  = tableData.filter(t => t.directedBy !== 'none');

  const personalTotal  = personalExpenses.reduce((sum, e) => sum + e.amount, 0);
  const chairmanTotal  = chairmanExpenses.reduce((sum, e) => sum + e.amount, 0);
  const ceoTotal       = ceoExpenses.reduce((sum, e) => sum + e.amount, 0);
  const directedTotal  = directedExpenses.reduce((sum, e) => sum + e.amount, 0);

  // 영수증 그리드용 정렬된 배열
  const personalExpensesOrdered = [...personalExpenses].sort((a, b) => (a.date < b.date ? -1 : 1));
  const chairmanExpensesOrdered = [...chairmanExpenses].sort((a, b) => (a.date < b.date ? -1 : 1));
  const ceoExpensesOrdered      = [...ceoExpenses].sort((a, b) => (a.date < b.date ? -1 : 1));

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

  const orderedPersonal  = [...personalTableData].sort((a, b) => (a.date < b.date ? -1 : 1));
  const orderedChairman  = [...chairmanTableData].sort((a, b) => (a.date < b.date ? -1 : 1));
  const orderedCeo       = [...ceoTableData].sort((a, b) => (a.date < b.date ? -1 : 1));
  const orderedDirected  = [...directedTableData].sort((a, b) => (a.date < b.date ? -1 : 1));

  const handleTableChange = (id: string, field: string, value: string) => {
    setTableData(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  /** 공통 테이블 행 렌더링 — startSeq: 이 테이블의 첫 순번 */
  const renderRows = (items: typeof tableData, isDirected: boolean, startSeq: number) =>
    items.map((item, idx) => {
      const original = expenses.find(e => e.id === item.id);
      const badge = original ? directedLabel(original) : '';
      // No. 컨럼 포함: 개인은 6컨, 임원지시는 7컨
      const cols = isDirected
        ? '32px 0.8fr 1.2fr 1fr 1.5fr 1fr 0.9fr'
        : '32px 0.8fr 1.2fr 1fr 1.5fr 1fr';
      const seqNum = startSeq + idx;
      return (
        <div
          key={item.id}
          style={{
            display: 'grid',
            gridTemplateColumns: cols,
            padding: '10px 16px',
            borderBottom: '1px solid #f1f5f9',
            fontSize: '13px',
            alignItems: 'center',
            background: isDirected ? '#fffbeb' : undefined
          }}
        >
          {/* 순번 셀 */}
          <span style={{
            fontSize: 11, fontWeight: 700, color: '#94a3b8',
            textAlign: 'center', lineHeight: 1
          }}>
            {seqNum}
          </span>
          {editing ? (
            <>
              <input className="sc-input" value={item.date} onChange={e => handleTableChange(item.id, 'date', e.target.value)} style={{ padding: '4px', fontSize: '12px' }} />
              <input className="sc-input" value={item.storeName} onChange={e => handleTableChange(item.id, 'storeName', e.target.value)} style={{ padding: '4px', fontSize: '12px' }} />
              <input className="sc-input" value={item.amount} onChange={e => handleTableChange(item.id, 'amount', e.target.value)} style={{ padding: '4px', fontSize: '12px' }} />
              <input className="sc-input" value={item.purpose} onChange={e => handleTableChange(item.id, 'purpose', e.target.value)} style={{ padding: '4px', fontSize: '12px' }} />
              <input className="sc-input" value={item.note} onChange={e => handleTableChange(item.id, 'note', e.target.value)} style={{ padding: '4px', fontSize: '12px' }} />
              {isDirected && <span style={{ fontSize: '12px', color: '#d97706', fontWeight: 600 }}>{badge}</span>}
            </>
          ) : (
            <>
              <span>{item.date}</span>
              <span style={{ fontWeight: 500 }}>{item.storeName || '-'}</span>
              <span style={{ fontWeight: 600, color: '#0f172a' }}>{item.amount}</span>
              <span style={{ color: '#334155' }}>{item.purpose || item.items || '-'}</span>
              <span style={{ color: 'var(--muted)', fontSize: '12px' }}>{item.note || '-'}</span>
              {isDirected && <span style={{ fontSize: '12px', color: '#d97706', fontWeight: 600 }}>{badge}</span>}
            </>
          )}
        </div>
      );
    });


  /** 개별 지시자 그룹 테이블 렌더 — startSeq: 첫 행의 순번 */
  const renderGroupTable = (
    items: typeof tableData,
    total: number,
    label: string,
    headerBg: string,
    headerColor: string,
    headerBorder: string,
    sumBg: string,
    sumColor: string,
    startSeq: number
  ) => {
    if (items.length === 0) return null;
    return (
      <div className="sc-detail" style={{ border: `2px solid ${headerBorder}`, borderRadius: '12px' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '32px 0.8fr 1.2fr 1fr 1.5fr 1fr 0.9fr',
          fontWeight: 600, padding: '10px 16px',
          borderBottom: `1px solid ${headerBorder}`,
          background: headerBg, fontSize: '13px', color: headerColor,
          borderRadius: '10px 10px 0 0'
        }}>
          <span style={{ textAlign: 'center' }}>No.</span>
          <span>일자</span><span>구입처</span><span>금액</span><span>사용목적</span><span>비고</span><span>지시자</span>
        </div>
        {renderRows(items, true, startSeq)}
        <div className="sc-detail-sum" style={{ background: sumBg, color: sumColor }}>
          <span className="sc-detail-sum-label">{label}(소계)</span>
          <span className="sc-detail-sum-value" style={{ color: sumColor }}>{won(total)}</span>
        </div>
      </div>
    );
  };


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
              onClick={() => printReport('printable-report-area')}
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

            {/* ① 이수용 이사 */}
            <div className="sc-meta-row">
              <div className="sc-meta-total-key">이수용 이사 사용(소계)</div>
              <div className="sc-meta-total-val">
                <span className="num">{won(personalTotal)}</span>
                <span style={{ fontSize: 13, color: 'var(--muted)' }}>({personalExpenses.length}건 · 한도 {won(summary.monthlyBudget)})</span>
              </div>
            </div>

            {/* ② 회장님 지시 */}
            {summary.chairmanSpend > 0 && (
              <div className="sc-meta-row" style={{ background: '#fffbeb', borderLeft: '4px solid #f59e0b', borderBottom: '1px solid #fde68a' }}>
                <div className="sc-meta-total-key" style={{ color: '#d97706', background: 'transparent' }}>회장님 지시(소계)</div>
                <div className="sc-meta-total-val">
                  <span className="num" style={{ color: '#d97706' }}>{won(summary.chairmanSpend)}</span>
                  <span style={{ fontSize: 13, color: '#b45309' }}>한도 별도</span>
                </div>
              </div>
            )}

            {/* ③ 대표님 지시 — 노란색 박스 강조 */}
            {summary.ceoSpend > 0 && (
              <div className="sc-meta-row" style={{
                background: '#fefce8',
                borderLeft: '4px solid #eab308',
                borderBottom: '1px solid #fef08a',
                outline: '2px solid #facc15',
                outlineOffset: '-2px',
                borderRadius: 6
              }}>
                <div className="sc-meta-total-key" style={{ color: '#854d0e', background: 'transparent' }}>대표님 지시(소계)</div>
                <div className="sc-meta-total-val">
                  <span className="num" style={{ color: '#854d0e' }}>{won(summary.ceoSpend)}</span>
                  <span style={{ fontSize: 13, color: '#a16207' }}>한도 별도</span>
                </div>
              </div>
            )}

            <div className="sc-meta-row">
              <div className="sc-meta-total-key">총 집행액</div>
              <div className="sc-meta-total-val">
                <span className="num">{won(summary.currentSpend)}</span>
                <span style={{ fontSize: 13, color: 'var(--muted)' }}>총 {expenses.length}건</span>
              </div>
            </div>
          </div>


          {/* ─────────────────────────────────── */}
          {/* 2-1. 이수용 이사 사용 내역           */}
          {/* ─────────────────────────────────── */}
          <div className="sc-section-head">
            <h2 className="sc-section-title">2-1. 이수용 이사 사용 내역 (한도 내)</h2>
            <button type="button" className="sc-link sc-no-print" onClick={() => setEditing(v => !v)}>
              {editing ? '표 편집 완료' : '표 내용 편집하기'}
            </button>
          </div>

          {orderedPersonal.length === 0 ? (
            <div className="sc-blankbox">개인 사용 결제 내역이 없습니다</div>
          ) : (
            <div className="sc-detail">
              {/* No. 컬럼 포함 헤더 */}
              <div style={{
                display: 'grid', gridTemplateColumns: '32px 0.8fr 1.2fr 1fr 1.5fr 1fr',
                fontWeight: 600, padding: '10px 16px', borderBottom: '1px solid #e2e8f0',
                background: '#f8fafc', fontSize: '13px', color: '#475569'
              }}>
                <span style={{ textAlign: 'center' }}>No.</span>
                <span>일자</span><span>구입처</span><span>금액</span><span>사용목적</span><span>비고</span>
              </div>
              {/* startSeq=1: 이수용 이사 섹션은 1번부터 시작 */}
              {renderRows(orderedPersonal, false, 1)}
              <div className="sc-detail-sum">
                <span className="sc-detail-sum-label">이수용 이사 사용(소계)</span>
                <span className="sc-detail-sum-value">{won(personalTotal)}</span>
              </div>
            </div>
          )}

          {/* ─────────────────────────────────── */}
          {/* 2-2. 회장님 지시 사용 내역           */}
          {/* ─────────────────────────────────── */}
          {chairmanExpenses.length > 0 && (
            <>
              <div className="sc-section-head" style={{ marginTop: '32px' }}>
                <h2 className="sc-section-title" style={{ color: '#b45309' }}>
                  2-2. 회장님 지시에 따른 사용 내용
                </h2>
              </div>
              {/* startSeq: 이사 다음 번호부터 이어서 */}
              {renderGroupTable(
                orderedChairman, chairmanTotal, '회장님 지시',
                '#fef3c7', '#92400e', '#f59e0b', '#fef3c7', '#d97706',
                orderedPersonal.length + 1
              )}
            </>
          )}

          {/* ─────────────────────────────────── */}
          {/* 2-3. 대표님 지시 사용 내역 (노란 박스) */}
          {/* ─────────────────────────────────── */}
          {ceoExpenses.length > 0 && (
            <>
              <div className="sc-section-head" style={{ marginTop: '32px' }}>
                <h2 className="sc-section-title" style={{ color: '#854d0e' }}>
                  2-3. 대표님 지시에 따른 사용 내용
                </h2>
              </div>
              {/* ★ 대표님 내역: 노란색 박스 테두리 강조 */}
              <div style={{
                border: '3px solid #facc15',
                borderRadius: 14,
                overflow: 'hidden',
                boxShadow: '0 0 0 4px #fef9c3'
              }}>
                {/* startSeq: 이사 + 회장 다음 번호부터 */}
                {renderGroupTable(
                  orderedCeo, ceoTotal, '대표님 지시',
                  '#fefce8', '#713f12', '#eab308', '#fefce8', '#854d0e',
                  orderedPersonal.length + orderedChairman.length + 1
                )}
              </div>
            </>
          )}

          {/* 임원 지시 전체 합산 */}
          {directedExpenses.length > 0 && (
            <div style={{
              marginTop: 24, padding: '12px 16px',
              background: '#fefce8', border: '1px solid #fde047', borderRadius: 8,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
              <span style={{ fontWeight: 600, color: '#713f12', fontSize: 14 }}>
                합산 ({directedExpenses.length}건)
              </span>
              <span style={{ fontWeight: 700, fontSize: 16, color: '#854d0e' }}>{won(directedTotal)}</span>
            </div>
          )}

          {/* 사용되지 않는 변수 참조 방지 */}
          {orderedDirected.length === 0 && null}

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

          {/* ══════════════════════════════════════════════════════ */}
          {/* 영수증 첨부 (서명 다음 페이지 — 인쇄 시 page-break)   */}
          {/* ══════════════════════════════════════════════════════ */}
          {(personalExpensesOrdered.some(e => e.receiptImage) ||
            chairmanExpensesOrdered.some(e => e.receiptImage) ||
            ceoExpensesOrdered.some(e => e.receiptImage)) && (
            <div style={{
              paddingTop: 40,
              pageBreakBefore: 'always',
              borderTop: '3px dashed #cbd5e1',
              marginTop: 48
            }}>
              {/* 별지 헤더 */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24
              }}>
                <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
                <span style={{
                  fontSize: 15, fontWeight: 700, color: '#475569',
                  whiteSpace: 'nowrap', padding: '0 12px'
                }}>
                  📎 영수증 첨부 (별지)
                </span>
                <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
              </div>

              {/* 이수용 이사 영수증 — 1번부터 */}
              <ReceiptGrid
                items={personalExpensesOrdered}
                groupLabel="이수용 이사"
                startSeq={1}
              />

              {/* 회장님 지시 영수증 — 이사 다음 번호 이어서 */}
              {chairmanExpenses.length > 0 && (
                <ReceiptGrid
                  items={chairmanExpensesOrdered}
                  groupLabel="회장님 지시"
                  startSeq={orderedPersonal.length + 1}
                  borderColor="#f59e0b"
                  bgColor="#fffbeb"
                />
              )}

              {/* 대표님 지시 영수증 — 이사 + 회장 다음 번호 이어서 */}
              {ceoExpenses.length > 0 && (
                <ReceiptGrid
                  items={ceoExpensesOrdered}
                  groupLabel="대표님 지시"
                  startSeq={orderedPersonal.length + orderedChairman.length + 1}
                  borderColor="#eab308"
                  bgColor="#fefce8"
                />
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
