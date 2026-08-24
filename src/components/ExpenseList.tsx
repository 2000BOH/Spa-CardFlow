import React, { useState } from 'react';
import type { ExpenseItem, ExpenseCategory } from '../types/expense';
import { Search, ChevronRight, Store, Receipt } from 'lucide-react';

const CATEGORIES: ExpenseCategory[] = [
  '시설/건재/자재',
  '스파/비품/소모품',
  '식비/간식/음료',
  '교통/유류/주차',
  '접대/회의/행사',
  '기타/일반지출'
];

const won = (n: number) => '₩' + Math.round(n).toLocaleString('ko-KR');
const shortCat = (c: string) => c.split('/').slice(0, 2).join('/');
const mobileDate = (d: string) => d.slice(5).replace('-', '월 ') + '일';
const deskDate = (d: string) => d.slice(5).replace('-', '. ');

interface ExpenseListProps {
  expenses: ExpenseItem[];
  onEditExpense: (expense: ExpenseItem) => void;
  onViewReceipt: (imageUrl: string, title: string) => void;
  limit?: number;
  showFilters?: boolean;
  title?: string;
  onRequestAdd?: () => void;
  headerAction?: React.ReactNode;
}

export const ExpenseList: React.FC<ExpenseListProps> = ({
  expenses,
  onEditExpense,
  onViewReceipt,
  limit,
  showFilters = true,
  title = '결제 내역',
  onRequestAdd,
  headerAction
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [category, setCategory] = useState<string>('ALL');

  const q = searchTerm.trim().toLowerCase();
  const filtered = expenses.filter((item) => {
    if (category !== 'ALL' && item.category !== category) return false;
    if (!q) return true;
    return `${item.storeName} ${item.items} ${item.purpose} ${item.note ?? ''}`
      .toLowerCase()
      .includes(q);
  });

  const shown = typeof limit === 'number' ? filtered.slice(0, limit) : filtered;
  const total = filtered.reduce((sum, item) => sum + item.amount, 0);

  return (
    <div className="sc-card">
      <div className="sc-card-head">
        <h2 className="sc-card-title">{title}</h2>
        {headerAction ?? (
          <div className="sc-total">
            <span className="sc-total-count">{filtered.length}건</span>
            <span className="sc-total-sum">{won(total)}</span>
          </div>
        )}
      </div>

      {showFilters && (
        <div className="sc-list-filters" style={{ marginTop: 16 }}>
          <div className="sc-search">
            <Search size={18} strokeWidth={1.8} />
            <input
              type="text"
              className="sc-input"
              placeholder="결제처, 품목, 목적 검색"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="sc-chips">
            <button
              type="button"
              onClick={() => setCategory('ALL')}
              className={category === 'ALL' ? 'sc-chip sc-chip-on' : 'sc-chip'}
            >
              전체
            </button>
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                className={category === cat ? 'sc-chip sc-chip-on' : 'sc-chip'}
              >
                {shortCat(cat)}
              </button>
            ))}
          </div>

          <div className="sc-list-meta">
            <span className="sc-total-count">{filtered.length}건</span>
            <span className="sc-total-sum">{won(total)}</span>
          </div>
        </div>
      )}

      {!showFilters && <div style={{ height: 16 }} />}

      {/* 데스크톱 표 머리글 */}
      <div className="sc-thead">
        <span>결제처</span>
        <span>품목 · 목적</span>
        <span>분류</span>
        <span>날짜</span>
        <span>금액</span>
        <span />
      </div>

      {shown.length === 0 ? (
        <div className="sc-empty">
          <Receipt size={32} strokeWidth={1.5} />
          <div className="sc-empty-text">
            {expenses.length === 0 ? '아직 등록된 내역이 없습니다' : '조건에 맞는 내역이 없습니다'}
          </div>
          {onRequestAdd && (
            <button type="button" onClick={onRequestAdd} className="sc-btn sc-btn-primary">
              내역 등록하기
            </button>
          )}
        </div>
      ) : (
        <div>
          {shown.map((item) => (
            <div key={item.id} className="sc-row">
              {/* 영수증 썸네일 — 누르면 원본, 없으면 수정 */}
              <button
                type="button"
                className="sc-thumb"
                aria-label={item.receiptImage ? '영수증 원본 보기' : '내역 수정'}
                onClick={() =>
                  item.receiptImage
                    ? onViewReceipt(item.receiptImage, `${item.storeName} 영수증`)
                    : onEditExpense(item)
                }
              >
                {item.receiptImage ? (
                  <img src={item.receiptImage} alt="" />
                ) : (
                  <Store size={18} strokeWidth={1.6} />
                )}
              </button>

              {/* 본문 — 누르면 수정 */}
              <button type="button" className="sc-row-main" onClick={() => onEditExpense(item)}>
                <div className="sc-row-text">
                  <div className="sc-row-store">{item.storeName}</div>
                  <div className="sc-row-items sc-only-mobile">{item.items}</div>
                  <div className="sc-row-meta sc-only-mobile">
                    {shortCat(item.category)} · {mobileDate(item.date)}
                  </div>
                </div>

                <div className="sc-only-desktop" style={{ minWidth: 0 }}>
                  <div className="sc-row-store" style={{ fontWeight: 400 }}>
                    {item.items}
                  </div>
                  <div className="sc-row-items">{item.purpose}</div>
                </div>

                <div className="sc-only-desktop">
                  <span className="sc-tag">{shortCat(item.category)}</span>
                </div>

                <div
                  className="sc-only-desktop"
                  style={{ fontSize: 14, color: 'var(--muted)', fontVariantNumeric: 'tabular-nums' }}
                >
                  {deskDate(item.date)}
                </div>

                <div className="sc-row-amount">{won(item.amount)}</div>

                <ChevronRight size={16} strokeWidth={1.8} className="sc-row-caret" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
