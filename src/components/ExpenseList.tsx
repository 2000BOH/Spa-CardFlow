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
    <div className="glass-card p-6 rounded-2xl mb-8">
      {/* 리스트 헤더 및 필터 바 */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-700/60 mb-6">
        <div>
          <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <FileText className="w-5 h-5 text-cyan-400" />
            이번 달 법인카드 결제 명세 ({filteredExpenses.length}건)
          </h3>
          <p className="text-xs text-slate-400">
            입력된 모든 지출 내역을 확인하고 수정하거나 영수증 증빙을 검토할 수 있습니다.
          </p>
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

      {/* 리스트 테이블 */}
      {filteredExpenses.length === 0 ? (
        <div className="py-12 text-center text-slate-400">
          <p className="text-sm">조회된 지출 내역이 없습니다.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-700/80 text-xs font-semibold text-cyan-300 uppercase tracking-wider bg-slate-900/40">
                <th className="p-3">일시</th>
                <th className="p-3">장소(상호)</th>
                <th className="p-3">품목명 / 수량</th>
                <th className="p-3">카테고리</th>
                <th className="p-3">사용 목적 (내용)</th>
                <th className="p-3 text-right">사용 금액</th>
                <th className="p-3 text-center">영수증</th>
                <th className="p-3 text-center">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-xs text-slate-200">
              {filteredExpenses.map((item) => (
                <tr key={item.id} className="hover:bg-cyan-950/20 transition-colors">
                  {/* 일시 */}
                  <td className="p-3 whitespace-nowrap text-slate-300">
                    <div className="font-semibold text-slate-200">{item.date}</div>
                    <div className="text-[11px] text-slate-400">{item.time}</div>
                  </td>

                  {/* 장소 */}
                  <td className="p-3 whitespace-nowrap">
                    <span className="font-bold text-slate-100">{item.storeName}</span>
                  </td>

                  {/* 품목 / 수량 */}
                  <td className="p-3 max-w-[180px] truncate">
                    <div className="text-slate-200 font-medium">{item.items}</div>
                    <div className="text-[11px] text-slate-400">수량: {item.quantity}개</div>
                  </td>

                  {/* 카테고리 배지 */}
                  <td className="p-3 whitespace-nowrap">
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                      {item.category}
                    </span>
                  </td>

                  {/* 사용 목적 */}
                  <td className="p-3 max-w-[240px]">
                    <p className="line-clamp-2 text-slate-300">{item.purpose}</p>
                    {item.note && <span className="text-[10px] text-amber-300/80 block mt-0.5">※ {item.note}</span>}
                  </td>

                  {/* 금액 */}
                  <td className="p-3 text-right whitespace-nowrap font-bold text-cyan-200 text-sm">
                    ₩{item.amount.toLocaleString()}
                  </td>

                  {/* 영수증 이미지 미리보기 */}
                  <td className="p-3 text-center whitespace-nowrap">
                    {item.receiptImage ? (
                      <button
                        onClick={() => onViewReceipt(item.receiptImage!, `${item.storeName} 영수증`)}
                        className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/40 transition-colors inline-flex items-center gap-1 text-[11px]"
                        title="영수증 원본 보기"
                      >
                        <Image className="w-3.5 h-3.5" />
                        <span>보기</span>
                      </button>
                    ) : (
                      <span className="text-slate-500 text-[11px]">미첨부</span>
                    )}
                  </td>

                  {/* 관리 버튼 (수정/삭제) */}
                  <td className="p-3 text-center whitespace-nowrap">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => onEditExpense(item)}
                        className="p-1.5 rounded text-slate-400 hover:text-cyan-300 hover:bg-slate-800 transition-colors"
                        title="내역 수정"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`'${item.storeName}' 지출 항목을 삭제하시겠습니까?`)) {
                            onDeleteExpense(item.id);
                          }
                        }}
                        className="p-1.5 rounded text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                        title="내역 삭제"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 실시간 지출 합계 하단바 */}
      <div className="mt-4 pt-3 border-t border-slate-700/60 flex items-center justify-between text-xs font-semibold text-slate-300">
        <span>선택 조건 지출 합계</span>
        <span className="text-base text-cyan-300 font-extrabold">
          ₩{totalFilteredAmount.toLocaleString()}
        </span>
      </div>
    </div>
  );
};
