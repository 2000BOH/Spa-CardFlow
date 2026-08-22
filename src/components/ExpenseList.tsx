import React, { useState } from 'react';
import type { ExpenseItem } from '../types/expense';
import { Search, Filter, Edit3, Trash2, Image, FileText } from 'lucide-react';

interface ExpenseListProps {
  expenses: ExpenseItem[];
  onEditExpense: (expense: ExpenseItem) => void;
  onDeleteExpense: (id: string) => void;
  onViewReceipt: (imageUrl: string, title: string) => void;
}

export const ExpenseList: React.FC<ExpenseListProps> = ({
  expenses,
  onEditExpense,
  onDeleteExpense,
  onViewReceipt
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // 필터링 적용
  const filteredExpenses = expenses.filter((item) => {
    const matchesSearch = 
      item.storeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.items.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.purpose.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.note && item.note.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesCategory = selectedCategory === 'ALL' || item.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const totalFilteredAmount = filteredExpenses.reduce((sum, item) => sum + item.amount, 0);

  return (
    <div className="glass-card p-6 rounded-2xl mb-8 mt-12 shadow-2xl">
      {/* 리스트 헤더 및 필터 바 */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-10">
        <div>
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-3">
            <FileText className="w-6 h-6 text-cyan-400" />
            이번 달 법인카드 결제 명세 ({filteredExpenses.length}건)
          </h2>
        </div>

        {/* 검색 & 카테고리 필터 */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="장소, 품목, 목적 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field pl-9 py-1.5 text-xs w-48 focus:w-60 transition-all"
            />
          </div>

          <div className="relative">
            <Filter className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="input-field pl-9 py-1.5 text-xs bg-slate-900 text-slate-200"
            >
              <option value="ALL">전체 카테고리</option>
              <option value="시설/건재/자재">시설/건재/자재</option>
              <option value="스파/비품/소모품">스파/비품/소모품</option>
              <option value="식비/간식/음료">식비/간식/음료</option>
              <option value="교통/유류/주차">교통/유류/주차</option>
              <option value="접대/회의/행사">접대/회의/행사</option>
              <option value="기타/일반지출">기타/일반지출</option>
            </select>
          </div>
        </div>
      </div>

      {/* 리스트 카드 뷰 (모바일 친화적) */}
      {filteredExpenses.length === 0 ? (
        <div className="py-12 text-center text-slate-400">
          <p className="text-sm">조회된 지출 내역이 없습니다.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filteredExpenses.map((item) => (
            <div key={item.id} className="bg-slate-900/50 border border-slate-700/60 rounded-xl p-4 flex flex-col gap-3 hover:bg-slate-800/50 transition-colors">
              
              {/* 카드 상단: 날짜, 카테고리, 관리버튼 */}
              <div className="flex justify-between items-center border-b border-slate-700/50 pb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-300">{item.date} {item.time}</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                    {item.category}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => onEditExpense(item)}
                    className="p-1.5 rounded text-slate-400 hover:text-cyan-300 bg-slate-800 hover:bg-slate-700 transition-colors"
                    title="내역 수정"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`'${item.storeName}' 지출 항목을 삭제하시겠습니까?`)) {
                        onDeleteExpense(item.id);
                      }
                    }}
                    className="p-1.5 rounded text-slate-400 hover:text-rose-400 bg-slate-800 hover:bg-slate-700 transition-colors"
                    title="내역 삭제"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* 카드 본문: 장소, 사용 목적, 품목 */}
              <div className="flex justify-between items-start gap-2">
                <div className="flex flex-col gap-1 flex-1">
                  <div className="font-bold text-slate-100 text-sm">{item.storeName}</div>
                  <div className="text-xs text-slate-300 line-clamp-2">{item.purpose}</div>
                  <div className="text-[11px] text-slate-400">품목: {item.items} ({item.quantity}개)</div>
                  {item.note && <div className="text-[10px] text-amber-300/80 mt-0.5">※ {item.note}</div>}
                </div>
                
                {/* 우측: 금액 및 영수증 */}
                <div className="flex flex-col items-end justify-between gap-2 h-full min-w-[90px]">
                  <div className="font-bold text-cyan-200 text-lg whitespace-nowrap">
                    ₩{item.amount.toLocaleString()}
                  </div>
                  {item.receiptImage ? (
                    <button
                      onClick={() => onViewReceipt(item.receiptImage!, `${item.storeName} 영수증`)}
                      className="px-2 py-1.5 rounded-lg bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/40 transition-colors inline-flex items-center justify-center gap-1 text-[11px] w-full mt-1"
                    >
                      <Image className="w-3.5 h-3.5" />
                      <span>보기</span>
                    </button>
                  ) : (
                    <span className="text-slate-500 text-[11px] px-2 py-1.5 border border-slate-700/50 rounded-lg bg-slate-800/30 text-center w-full mt-1">미첨부</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 실시간 지출 합계 하단바 (구분선 제거) */}
      <div className="mt-8 flex items-center justify-between text-xs font-semibold text-slate-300 bg-slate-900/40 p-4 rounded-xl">
        <span>선택 조건 지출 합계</span>
        <span className="text-lg text-cyan-300 font-extrabold">
          ₩{totalFilteredAmount.toLocaleString()}
        </span>
      </div>
    </div>
  );
};
