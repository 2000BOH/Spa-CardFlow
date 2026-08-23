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
const shortDate = (d: string) => d.slice(5).replace('-', '월 ') + '일';

interface ExpenseListProps {
  expenses: ExpenseItem[];
  onEditExpense: (expense: ExpenseItem) => void;
  onViewReceipt: (imageUrl: string, title: string) => void;
  /** 홈 화면의 "최근 내역"처럼 일부만 보여줄 때 */
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
    <div className="cb-card overflow-hidden">
      <div className="px-5 md:px-7 pt-6 md:pt-7 flex items-baseline justify-between gap-4">
        <h2 className="text-[17px] md:text-[21px] font-bold tracking-tight">{title}</h2>
        {headerAction ?? (
          <div className="flex items-baseline gap-2.5">
            <span className="text-[14px] text-muted">{filtered.length}건</span>
            <span className="num text-[17px] md:text-[18px]">{won(total)}</span>
          </div>
        )}
      </div>

      {showFilters && (
        <div className="px-5 md:px-7 pt-4 pb-5 flex flex-col gap-3">
          <div className="relative">
            <Search className="w-[18px] h-[18px] text-muted absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="결제처, 품목, 목적 검색"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="cb-input pl-11 h-[50px]"
            />
          </div>

          <div className="cb-scroll-x flex gap-2 pb-0.5">
            <button
              type="button"
              onClick={() => setCategory('ALL')}
              className={`cb-chip shrink-0 ${category === 'ALL' ? 'cb-chip-on' : ''}`}
            >
              전체
            </button>
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                className={`cb-chip shrink-0 ${category === cat ? 'cb-chip-on' : ''}`}
              >
                {shortCat(cat)}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 데스크톱 표 머리글 */}
      <div className="hidden md:grid grid-cols-[1.5fr_1.7fr_116px_96px_128px] gap-4 px-7 pb-3 border-b border-line text-[12px] font-medium uppercase tracking-[0.08em] text-muted">
        <div>결제처</div>
        <div>품목 · 목적</div>
        <div>분류</div>
        <div>날짜</div>
        <div className="text-right">금액</div>
      </div>

      {shown.length === 0 ? (
        <div className="px-6 py-16 text-center">
          <Receipt className="w-8 h-8 text-muted mx-auto" strokeWidth={1.5} />
          <div className="mt-3.5 text-[15px] text-muted">
            {expenses.length === 0 ? '아직 등록된 내역이 없습니다' : '조건에 맞는 내역이 없습니다'}
          </div>
          {onRequestAdd && (
            <button type="button" onClick={onRequestAdd} className="cb-btn cb-btn-primary h-12 px-6 mt-5">
              내역 등록하기
            </button>
          )}
        </div>
      ) : (
        <div>
          {shown.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-3 px-5 md:px-7 py-3.5 md:py-4 border-b border-line-soft last:border-b-0 md:hover:bg-[#f7f8fa] transition-colors"
            >
              {/* 영수증 썸네일 — 누르면 원본 */}
              <button
                type="button"
                onClick={() =>
                  item.receiptImage
                    ? onViewReceipt(item.receiptImage, `${item.storeName} 영수증`)
                    : onEditExpense(item)
                }
                aria-label={item.receiptImage ? '영수증 원본 보기' : '내역 수정'}
                className="w-11 h-11 shrink-0 rounded-[10px] bg-surface border border-line overflow-hidden flex items-center justify-center cursor-pointer"
              >
                {item.receiptImage ? (
                  <img src={item.receiptImage} alt="" className="w-full h-full object-cover" />
                ) : (
                  <Store className="w-[18px] h-[18px] text-muted" strokeWidth={1.6} />
                )}
              </button>

              {/* 본문 — 누르면 수정 */}
              <button
                type="button"
                onClick={() => onEditExpense(item)}
                className="flex-1 min-w-0 flex items-center gap-3 bg-transparent border-none p-0 py-1.5 text-left cursor-pointer md:grid md:grid-cols-[1.5fr_1.7fr_116px_96px_128px_20px] md:gap-4 md:items-center"
              >
                <div className="flex-1 min-w-0 md:flex-none">
                  <div className="text-[16px] md:text-[15px] font-medium leading-snug truncate">
                    {item.storeName}
                  </div>
                  {/* 모바일에서만: 품목 + 분류·날짜 */}
                  <div className="md:hidden text-[13px] text-muted leading-snug mt-0.5 truncate">
                    {item.items}
                  </div>
                  <div className="md:hidden text-[12px] text-muted leading-snug mt-[3px]">
                    {shortCat(item.category)} · {shortDate(item.date)}
                  </div>
                </div>

                <div className="hidden md:block min-w-0">
                  <div className="text-[15px] leading-snug truncate">{item.items}</div>
                  <div className="text-[13px] text-muted leading-snug mt-0.5 truncate">
                    {item.purpose}
                  </div>
                </div>

                <div className="hidden md:block">
                  <span className="inline-block px-2.5 py-1 rounded-md bg-surface text-[13px] whitespace-nowrap">
                    {shortCat(item.category)}
                  </span>
                </div>

                <div className="hidden md:block text-[14px] text-muted tabular-nums">
                  {item.date.slice(5).replace('-', '. ')}
                </div>

                <div className="shrink-0 num text-[17px] md:text-[16px] md:text-right">
                  {won(item.amount)}
                </div>

                <ChevronRight className="w-4 h-4 text-muted shrink-0" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
