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
    <div className="glass-card p-5 mb-8 mt-12">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
          <FileText className="w-5 h-5 text-blue-500" />
          결제 내역 ({filteredExpenses.length})
        </h2>
        <span className="text-sm font-extrabold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg">
          ₩{totalFilteredAmount.toLocaleString()}
        </span>
      </div>

      {/* 검색 & 카테고리 필터 */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="검색어 입력"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-field pl-10 py-2.5 text-xs w-full font-medium"
          />
        </div>
        <div className="relative">
          <Filter className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="input-field pl-10 py-2.5 text-xs w-full font-medium text-slate-700 bg-slate-50"
          >
            <option value="ALL">모든 카테고리</option>
            <option value="시설/건재/자재">시설/건재</option>
            <option value="스파/비품/소모품">비품/소모품</option>
            <option value="식비/간식/음료">식비/음료</option>
            <option value="교통/유류/주차">교통/주차</option>
            <option value="접대/회의/행사">접대/행사</option>
            <option value="기타/일반지출">기타 지출</option>
          </select>
        </div>
      </div>

      {/* 리스트 */}
      {filteredExpenses.length === 0 ? (
        <div className="py-12 text-center text-slate-400 text-xs font-semibold bg-slate-50 rounded-xl border border-dashed border-slate-200">
          내역이 없습니다.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filteredExpenses.map((item) => (
            <div key={item.id} className="bg-white border border-slate-100 shadow-sm rounded-xl p-3.5 flex items-center gap-3 hover:shadow-md transition-shadow">
              {/* 좌: 영수증 썸네일 */}
              {item.receiptImage ? (
                <button
                  type="button"
                  onClick={() => onViewReceipt(item.receiptImage!, `${item.storeName} 영수증`)}
                  className="shrink-0 w-11 h-11 rounded-lg overflow-hidden border border-slate-200 bg-slate-50 flex-shrink-0"
                >
                  <img src={item.receiptImage} alt="" className="w-full h-full object-cover" />
                </button>
              ) : (
                <div className="shrink-0 w-11 h-11 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center flex-shrink-0">
                  <Image className="w-4 h-4 text-slate-300" />
                </div>
              )}

              {/* 중앙: 정보 */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-sm font-bold text-slate-800 truncate">{item.storeName}</span>
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-50 text-blue-600 shrink-0">
                    {item.category.split('/')[0]}
                  </span>
                </div>
                <div className="text-[11px] font-medium text-slate-500 truncate mb-0.5">{item.items}</div>
                <div className="text-[10px] font-semibold text-slate-400">{item.date}</div>
              </div>

              {/* 우: 금액 + 액션 */}
              <div className="shrink-0 text-right">
                <div className="text-sm font-extrabold text-slate-800" style={{ fontFamily: "'Outfit', sans-serif" }}>
                  ₩{item.amount.toLocaleString()}
                </div>
                <div className="flex items-center gap-0.5 mt-1.5 justify-end">
                  <button
                    onClick={() => onEditExpense(item)}
                    className="p-1.5 rounded-md text-slate-400 hover:text-blue-500 hover:bg-blue-50 transition-colors"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`'${item.storeName}' 내역을 삭제하시겠습니까?`)) {
                        onDeleteExpense(item.id);
                      }
                    }}
                    className="p-1.5 rounded-md text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
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
