import { useState, useEffect } from 'react';
import type { ExpenseItem } from './types/expense';
import { getStoredExpenses, saveExpenses, calculateBudgetSummary } from './utils/storage';
import { Header } from './components/Header';
import { Dashboard } from './components/Dashboard';
import { ExpenseForm } from './components/ExpenseForm';
import { ExpenseList } from './components/ExpenseList';
import { ReportModal } from './components/ReportModal';
import { ReceiptModal } from './components/ReceiptModal';
import { ShieldCheck } from 'lucide-react';

export function App() {
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [editingItem, setEditingItem] = useState<ExpenseItem | null>(null);

  // 모달 상태
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [receiptModalState, setReceiptModalState] = useState<{
    isOpen: boolean;
    url: string;
    title: string;
  }>({
    isOpen: false,
    url: '',
    title: ''
  });

  // 1. 초기 데이터 마운트
  useEffect(() => {
    const loaded = getStoredExpenses();
    setExpenses(loaded);
  }, []);

  // 2. 대시보드 요약 통계 실시간 산출
  const summary = calculateBudgetSummary(expenses);

  // 3. 지출 항목 신규 저장 및 수정
  const handleSaveExpense = (itemData: Omit<ExpenseItem, 'id' | 'createdAt'>) => {
    if (editingItem) {
      // 수정 모드
      const updated = expenses.map((item) =>
        item.id === editingItem.id
          ? { ...item, ...itemData }
          : item
      );
      setExpenses(updated);
      saveExpenses(updated);
      setEditingItem(null);
    } else {
      // 신규 추가 모드
      const newItem: ExpenseItem = {
        ...itemData,
        id: `exp-${Date.now()}`,
        createdAt: new Date().toISOString()
      };
      const updated = [newItem, ...expenses];
      setExpenses(updated);
      saveExpenses(updated);
    }
  };

  // 4. 삭제 처리
  const handleDeleteExpense = (id: string) => {
    const updated = expenses.filter((item) => item.id !== id);
    setExpenses(updated);
    saveExpenses(updated);
  };

  // 5. 영수증 원본 보기
  const handleViewReceipt = (url: string, title: string) => {
    setReceiptModalState({
      isOpen: true,
      url,
      title
    });
  };

  return (
    <div className="min-h-screen pb-16">
      {/* 1. 브랜드 헤더 */}
      <Header onOpenReport={() => setIsReportOpen(true)} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* 2. 대시보드 KPI (D-Day 남은날, 이번달 사용금액, 남은 금액, 전월 대비 +/-) */}
        <Dashboard summary={summary} />

        {/* 3. 영수증/텍스트 스마트 파싱 & 활성화된 수정 입력 폼 */}
        <ExpenseForm
          onSaveExpense={handleSaveExpense}
          editingItem={editingItem}
          onCancelEdit={() => setEditingItem(null)}
        />

        {/* 4. 법인카드 내역 리스트 & 관리 */}
        <ExpenseList
          expenses={expenses}
          onEditExpense={(item) => setEditingItem(item)}
          onDeleteExpense={handleDeleteExpense}
          onViewReceipt={handleViewReceipt}
        />
      </main>

      {/* 푸터 */}
      <footer className="max-w-7xl mx-auto px-4 text-center text-xs text-slate-500 pt-8 border-t border-slate-800/80 mt-12 flex flex-col sm:flex-row justify-between items-center gap-2">
        <div className="flex items-center gap-1.5 text-slate-400">
          <ShieldCheck className="w-4 h-4 text-cyan-400" />
          <span>블루오션 웰니스 스파 (Blue Ocean Wellness Spa) 법인 지출 정산 시스템</span>
        </div>
        <div>
          매월 15일 결산 기준 | 상급자 보고서 PDF/JPG 자동 생성 지원
        </div>
      </footer>

      {/* 5. 상급자 보고서 모달 */}
      <ReportModal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        expenses={expenses}
        summary={summary}
      />

      {/* 6. 영수증 원본 확대 모달 */}
      <ReceiptModal
        isOpen={receiptModalState.isOpen}
        onClose={() => setReceiptModalState({ ...receiptModalState, isOpen: false })}
        imageUrl={receiptModalState.url}
        title={receiptModalState.title}
      />
    </div>
  );
}

export default App;
