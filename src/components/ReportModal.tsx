import React, { useState, useEffect, useRef, useMemo } from 'react';
import type { ExpenseItem, BudgetSummary } from '../types/expense';
import { isDirectedExpense, getDirectedBy } from '../types/expense';
import { exportReportToPDF, exportReportToJPG, printReport } from '../utils/pdfExporter';
import { Download, Image as ImageIcon, Printer, X } from 'lucide-react';
import { fetchReceiptImage } from '../api/expenseApi';

/**
 * 영수증 별지 (A4 한 장 = 영수증 최대 4장, 2 x 2 배치)
 * - 한 장(.receipt-page)에 4건씩 끊어서 배치 → 영수증이 페이지 경계에서 잘리지 않음
 * - 각 칸 안에서 영수증 이미지는 object-fit: contain 으로 전체가 보이게 맞춤
 * - PDF 저장 시 .receipt-page 하나가 PDF 한 페이지가 됨 (pdfExporter 참고)
 * - 좌상단 원형 번호 배지 = 표의 No.
 */
const RECEIPTS_PER_PAGE = 4;

const ReceiptGrid: React.FC<{
  items: ExpenseItem[];
  groupLabel: string;
  startSeq: number;        // 이 그룹의 첫 번째 순번
  borderColor?: string;
  bgColor?: string;
}> = ({ items, groupLabel, startSeq, borderColor, bgColor }) => {
  const withReceipt = items.filter(i => i.receiptImage);
  if (withReceipt.length === 0) return null;

  const pages: ExpenseItem[][] = [];
  for (let i = 0; i < withReceipt.length; i += RECEIPTS_PER_PAGE) {
    pages.push(withReceipt.slice(i, i + RECEIPTS_PER_PAGE));
  }

  return (
    <>
      {pages.map((pageItems, pageIdx) => (
        <div
          key={pageIdx}
          className="receipt-page"
          style={{
            aspectRatio: '190 / 262',
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
            marginTop: 24,
            border: borderColor ? `2px solid ${borderColor}` : '1px solid #e2e8f0',
            borderRadius: 12,
            overflow: 'hidden',
            background: bgColor || '#fff'
          }}
        >
          <div style={{
            flexShrink: 0,
            padding: '10px 16px',
            background: borderColor ? bgColor || '#fef3c7' : '#f8fafc',
            borderBottom: `1px solid ${borderColor || '#e2e8f0'}`,
            fontWeight: 700, fontSize: 14,
            color: borderColor ? '#92400e' : '#475569',
            display: 'flex',
            justifyContent: 'space-between'
          }}>
            <span>📎 영수증 첨부 (별지) — {groupLabel} ({withReceipt.length}건)</span>
            <span style={{ fontWeight: 600, fontSize: 12 }}>{pageIdx + 1} / {pages.length}</span>
          </div>
          <div style={{
            flex: 1,
            minHeight: 0,
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gridTemplateRows: '1fr 1fr',
            gap: 12,
            padding: 12
          }}>
            {pageItems.map((item) => {
              const seqNum = startSeq + items.indexOf(item); // 표의 No.와 동일한 순번
              return (
                <div
                  key={item.id}
                  style={{
                    minHeight: 0,
                    minWidth: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    border: '1px solid #e2e8f0',
                    borderRadius: 8,
                    overflow: 'hidden',
                    background: '#fff'
                  }}
                >
                  {/* 캡션: 상호명 + 일자 + 금액 */}
                  <div style={{
                    flexShrink: 0,
                    padding: '6px 10px',
                    background: '#f1f5f9',
                    fontSize: 11,
                    color: '#475569',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 6
                  }}>
                    <span style={{ fontWeight: 600, minWidth: 0, wordBreak: 'break-all', lineHeight: 1.3 }}>
                      {item.storeName}
                    </span>
                    <span style={{ whiteSpace: 'nowrap' }}>{item.date} · {'₩' + Math.round(item.amount).toLocaleString('ko-KR')}</span>
                  </div>

                  {/* 영수증 이미지 (칸 안에 전체가 보이도록 contain) */}
                  <div style={{
                    flex: 1,
                    minHeight: 0,
                    position: 'relative',
                    background: '#f8fafc'
                  }}>
                    <img
                      src={item.receiptImage!}
                      alt={`${item.storeName} 영수증`}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        objectFit: 'contain',
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
                  <div style={{ flexShrink: 0, padding: '5px 10px', fontSize: 11, color: '#64748b', borderTop: '1px solid #f1f5f9' }}>
                    {item.purpose || item.items || '-'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </>
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
  if (d === 'chairman') return '회장 지시';
  return '';
};

export const ReportModal: React.FC<ReportModalProps> = ({ isOpen, onClose, expenses, summary }) => {
  const [editing, setEditing] = useState(false);

  // ── 영수증 이미지 지연 로딩 ──
  // 목록 조회(fetchExpenses)는 DB 타임아웃 방지를 위해 receipt_image_url 을 가져오지 않으므로
  // 보고서를 열 때 영수증이 있는 내역의 이미지를 개별로 불러와 별지에 채운다.
  // ※ 앱이 주기적으로 목록을 다시 받아와 expenses 배열 참조가 계속 바뀌므로,
  //   effect 의존성은 "id 목록 문자열"로 고정하고 진행 상태는 ref 로 관리한다 (재시작/중복 요청 방지).
  const receiptCache = useRef<Record<string, string>>({});   // id -> 이미지 ('' = 영수증 없음/조회 실패)
  const receiptInflight = useRef<Set<string>>(new Set());    // 요청 진행 중인 id
  const [receiptVersion, setReceiptVersion] = useState(0);   // 캐시가 채워질 때마다 리렌더용
  const idsKey = expenses.map(e => e.id).join(',');

  useEffect(() => {
    if (!isOpen) return;
    const queue = expenses
      .filter(e => !e.receiptImage && !(e.id in receiptCache.current) && !receiptInflight.current.has(e.id))
      .map(e => e.id);
    if (queue.length === 0) return;
    queue.forEach(id => receiptInflight.current.add(id));

    // 동시 요청 3개씩 (큰 Base64 데이터라 DB 부하/타임아웃 방지)
    const worker = async () => {
      while (queue.length > 0) {
        const id = queue.shift();
        if (!id) break;
        let img = '';
        try {
          img = await fetchReceiptImage(id);
        } catch {
          img = '';
        }
        receiptCache.current[id] = img;
        receiptInflight.current.delete(id);
        setReceiptVersion(v => v + 1);
      }
    };
    void Promise.all([worker(), worker(), worker()]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, idsKey]);

  // 아직 영수증을 불러오지 못한 내역이 있으면 로딩 중
  const receiptLoading = isOpen && expenses.some(e => !e.receiptImage && !(e.id in receiptCache.current));

  // 목록 데이터 + 불러온 영수증 이미지 합치기 (금액/건수 계산에는 영향 없음)
  const expensesWithReceipts = useMemo(
    () => expenses.map(e => (e.receiptImage ? e : { ...e, receiptImage: receiptCache.current[e.id] || e.receiptImage })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [expenses, receiptVersion]
  );

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

  // 모달이 열려 있을 때 문서 제목(document.title)을 변경하여
  // 브라우저 '프린트 출력(PDF로 저장)' 시에도 파일명이 자동으로 '법인카드_5947_결산보고서_YYYY.MM.DD.pdf'가 되도록 설정
  useEffect(() => {
    if (!isOpen) return;
    const prevTitle = document.title;
    const d = new Date();
    const dateStr = `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
    document.title = `법인카드_5947_결산보고서_${dateStr}`;
    return () => {
      document.title = prevTitle;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  // ── 그룹 분리: 이사(개인) / 회장 지시 / 대표 지시 순서 ──
  const personalExpenses  = expensesWithReceipts.filter(e => getDirectedBy(e) === 'none');
  const directedExpenses  = expensesWithReceipts.filter(e => isDirectedExpense(e));

  const personalTableData  = tableData.filter(t => t.directedBy === 'none');
  const directedTableData  = tableData.filter(t => t.directedBy !== 'none');

  const personalTotal  = personalExpenses.reduce((sum, e) => sum + e.amount, 0);
  const directedTotal  = directedExpenses.reduce((sum, e) => sum + e.amount, 0);

  // 영수증 그리드용 정렬된 배열
  const personalExpensesOrdered = [...personalExpenses].sort((a, b) => (a.date < b.date ? -1 : 1));
  const directedExpensesOrdered = [...directedExpenses].sort((a, b) => (a.date < b.date ? -1 : 1));

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
            {receiptLoading && (
              <span style={{ fontSize: 12, color: '#64748b', alignSelf: 'center', marginRight: 4 }}>
                영수증 불러오는 중...
              </span>
            )}
            <button
              type="button"
              className="sc-btn sc-btn-primary sc-btn-sm"
              style={{ background: '#10b981', opacity: receiptLoading ? 0.5 : 1 }}
              disabled={receiptLoading}
              onClick={() => printReport('printable-report-area')}
            >
              <Printer size={16} strokeWidth={1.9} />
              프린트 출력
            </button>
            <button
              type="button"
              className="sc-btn sc-btn-primary sc-btn-sm"
              style={{ background: '#0284c7', opacity: receiptLoading ? 0.5 : 1 }}
              disabled={receiptLoading}
              onClick={() => {
                const d = new Date();
                const dateStr = `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
                exportReportToJPG(
                  'printable-report-area',
                  `법인카드_5947_결산보고서_${dateStr}.jpg`
                );
              }}
            >
              <ImageIcon size={16} strokeWidth={1.9} />
              JPG 저장
            </button>
            <button
              type="button"
              className="sc-btn sc-btn-primary sc-btn-sm"
              style={{ opacity: receiptLoading ? 0.5 : 1 }}
              disabled={receiptLoading}
              onClick={() => {
                const d = new Date();
                const dateStr = `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
                exportReportToPDF(
                  'printable-report-area',
                  `법인카드_5947_결산보고서_${dateStr}.pdf`
                );
              }}
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

            {/* ② 회장님, 대표님 지시 */}
            {directedTotal > 0 && (
              <div className="sc-meta-row" style={{ background: '#fffbeb', borderLeft: '4px solid #f59e0b', borderBottom: '1px solid #fde68a' }}>
                <div className="sc-meta-total-key" style={{ color: '#d97706', background: 'transparent' }}>회장님, 대표님 지시(소계)</div>
                <div className="sc-meta-total-val">
                  <span className="num" style={{ color: '#d97706' }}>{won(directedTotal)}</span>
                  <span style={{ fontSize: 13, color: '#b45309' }}>한도 별도</span>
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
          {/* 2-2. 회장님, 대표님 지시 사용 내역           */}
          {/* ─────────────────────────────────── */}
          {directedExpenses.length > 0 && (
            <>
              <div className="sc-section-head" style={{ marginTop: '32px' }}>
                <h2 className="sc-section-title" style={{ color: '#b45309' }}>
                  2-2. 회장님, 대표님 지시에 따른 사용 내용
                </h2>
              </div>
              {/* startSeq: 이사 다음 번호부터 이어서 */}
              {renderGroupTable(
                orderedDirected, directedTotal, '회장님, 대표님 지시',
                '#fef3c7', '#92400e', '#f59e0b', '#fef3c7', '#d97706',
                orderedPersonal.length + 1
              )}
            </>
          )}



          {/* 사용되지 않는 변수 참조 방지 */}
          {orderedDirected.length === 0 && null}

          {/* 서명 */}
          <div className="sc-sign" style={{ marginTop: '40px', textAlign: 'center', position: 'relative' }}>

            <div className="sc-sign-date" style={{ fontSize: '15px', marginBottom: '10px' }}>{submitDate}</div>
            <div className="sc-sign-name" style={{ fontSize: '16px', fontWeight: 600, display: 'inline-block' }}>
              보고자 : 이수용{' '}
              <span style={{ position: 'relative', display: 'inline-block' }}>
                (인)
                <span style={{
                  position: 'absolute',
                  top: '-18px',
                  left: '-4px',
                  fontFamily: '"Nanum Brush Script", "GungSeo", "궁서", "Gungsuh", cursive',
                  fontSize: '44px',
                  color: 'rgba(71, 85, 105, 0.85)',
                  transform: 'rotate(-5deg)',
                  pointerEvents: 'none',
                  whiteSpace: 'nowrap',
                  letterSpacing: '1px'
                }}>
                  이수용
                </span>
              </span>
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════ */}
          {/* 영수증 첨부 (별지) — A4 한 장당 4건, 인쇄/PDF 모두 한 장씩 분리 */}
          {/* ══════════════════════════════════════════════════════ */}
          {(personalExpensesOrdered.some(e => e.receiptImage) ||
            directedExpensesOrdered.some(e => e.receiptImage)) && (
            <div>
              <style>{`
                @media print {
                  .receipt-page {
                    aspect-ratio: auto !important;
                    height: 262mm !important;
                    margin: 0 !important;
                    break-before: page;
                    page-break-before: always;
                    break-inside: avoid;
                    page-break-inside: avoid;
                  }
                }
              `}</style>

              {/* 이수용 이사 영수증 — 1번부터 */}
              <ReceiptGrid
                items={personalExpensesOrdered}
                groupLabel="이수용 이사"
                startSeq={1}
              />

              {/* 회장님, 대표님 지시 영수증 — 이사 다음 번호 이어서 */}
              {directedExpenses.length > 0 && (
                <ReceiptGrid
                  items={directedExpensesOrdered}
                  groupLabel="회장님, 대표님 지시"
                  startSeq={orderedPersonal.length + 1}
                  borderColor="#f59e0b"
                  bgColor="#fffbeb"
                />
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
