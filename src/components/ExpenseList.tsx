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
    <div className="glass-card p-4 rounded-2xl mb-8 mt-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
          <FileText className="w-4 h-4 text-cyan-400" />
          결제 명세 ({filteredExpenses.length}건)
        </h2>
        <span className="text-sm text-cyan-300 font-extrabold">
          ₩{totalFilteredAmount.toLocaleString()}
        </span>
      </div>

      {/* 검색 & 카테고리 필터 - 2열 */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-field pl-8 py-2 text-xs w-full"
          />
        </div>
        <div className="relative">
          <Filter className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="input-field pl-8 py-2 text-xs bg-slate-900 text-slate-200 w-full"
          >
            <option value="ALL">전체</option>
            <option value="시설/건재/자재">시설/건재</option>
            <option value="스파/비품/소모품">비품/소모품</option>
            <option value="식비/간식/음료">식비/음료</option>
            <option value="교통/유류/주차">교통/주차</option>
            <option value="접대/회의/행사">접대/행사</option>
            <option value="기타/일반지출">기타</option>
          </select>
        </div>
      </div>

      {/* 리스트 */}
      {filteredExpenses.length === 0 ? (
        <div className="py-8 text-center text-slate-500 text-xs">
          조회된 지출 내역이 없습니다.
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {filteredExpenses.map((item) => (
            <div key={item.id} className="bg-slate-800/40 rounded-xl p-3 flex items-center gap-3">
              {/* 좌: 영수증 썸네일 */}
              {item.receiptImage ? (
                <button
                  type="button"
                  onClick={() => onViewReceipt(item.receiptImage!, `${item.storeName} 영수증`)}
                  className="shrink-0 w-10 h-10 rounded-lg overflow-hidden border border-cyan-500/30 bg-slate-900"
                >
                  <img src={item.receiptImage} alt="" className="w-full h-full object-cover" />
                </button>
              ) : (
                <div className="shrink-0 w-10 h-10 rounded-lg bg-slate-700/50 flex items-center justify-center">
                  <Image className="w-4 h-4 text-slate-500" />
                </div>
              )}

              {/* 중앙: 정보 */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="text-xs font-bold text-slate-100 truncate">{item.storeName}</span>
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-cyan-500/10 text-cyan-300 shrink-0">
                    {item.category.split('/')[0]}
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 truncate">{item.items}</div>
                <div className="text-[10px] text-slate-500">{item.date}</div>
              </div>

              {/* 우: 금액 + 액션 */}
              <div className="shrink-0 text-right">
                <div className="text-sm font-bold text-cyan-200">
                  ₩{item.amount.toLocaleString()}
                </div>
                <div className="flex items-center gap-1 mt-1 justify-end">
                  <button
                    onClick={() => onEditExpense(item)}
                    className="p-1 rounded text-slate-400 hover:text-cyan-300 transition-colors"
                  >
                    <Edit3 className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`'${item.storeName}' 삭제?`)) {
                        onDeleteExpense(item.id);
                      }
                    }}
                    className="p-1 rounded text-slate-400 hover:text-rose-400 transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
