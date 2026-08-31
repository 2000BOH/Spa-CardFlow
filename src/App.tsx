import { useState, useEffect, useCallback } from 'react';
import type { ExpenseItem } from './types/expense';
import { calculateBudgetSummary } from './utils/storage';
import { fetchExpenses, createExpense, updateExpense, deleteExpense } from './api/expenseApi';
import { Header } from './components/Header';
import { Dashboard } from './components/Dashboard';
import { ExpenseForm } from './components/ExpenseForm';
import { ExpenseList } from './components/ExpenseList';
import { ReportModal } from './components/ReportModal';
import { ReceiptModal } from './components/ReceiptModal';
import { BottomTabs } from './components/BottomTabs';
import type { TabKey } from './components/BottomTabs';
import { Camera, PenLine } from 'lucide-react';

/** 768px 이상이면 데스크톱 레이아웃 */
function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches
  );
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const onChange = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return isDesktop;
}

const TAB_TITLE: Record<TabKey, string> = {
  home: 'Spa CardFlow',
  list: '결제 내역',
  add: '결제 등록',
  report: 'Spa CardFlow'
};

export function App() {
  const isDesktop = useIsDesktop();

  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [editingItem, setEditingItem] = useState<ExpenseItem | null>(null);
  const [tab, setTab] = useState<TabKey>('home');
  const [autoCamera, setAutoCamera] = useState(false);

  const [isReportOpen, setIsReportOpen] = useState(false);
  const [receipt, setReceipt] = useState({ open: false, url: '', title: '' });

  useEffect(() => {
    const load = async () => {
      try {
        setExpenses(await fetchExpenses());
      } catch (err) {
        console.error('Failed to load data:', err);
      }
    };
    load();

    // 모바일 <-> PC 실시간 연동 (10초 주기 데이터 자동 동기화)
    const interval = setInterval(load, 10000);
    return () => clearInterval(interval);
  }, []);

  const summary = calculateBudgetSummary(expenses);

  const handleSave = async (data: Omit<ExpenseItem, 'id' | 'createdAt'>) => {
    try {
      if (editingItem) {
        await updateExpense(editingItem.id, data);
        setExpenses((prev) =>
          prev.map((item) => (item.id === editingItem.id ? { ...item, ...data } : item))
        );
        setEditingItem(null);
      } else {
        const created = await createExpense(data);
        setExpenses((prev) => [created, ...prev]);
      }
      if (!isDesktop) setTab('list');
    } catch (err) {
      console.error('Save failed:', err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteExpense(id);
      setExpenses((prev) => prev.filter((item) => item.id !== id));
      setEditingItem(null);
      if (!isDesktop) setTab('list');
    } catch (err) {
      console.error('Delete failed:', err);
      alert('삭제에 실패했습니다.');
    }
  };

  const handleEdit = (item: ExpenseItem) => {
    setEditingItem(item);
    if (!isDesktop) setTab('add');
  };

  const viewReceipt = (url: string, title: string) => setReceipt({ open: true, url, title });

  const openReport = useCallback(() => {
    setIsReportOpen(true);
    if (!isDesktop) setTab('report');
  }, [isDesktop]);

  const handleTab = (next: TabKey) => {
    if (next === 'report') {
      setTab('report');
      setIsReportOpen(true);
      return;
    }
    if (next === 'add') setEditingItem(null);
    setTab(next);
  };

  const modals = (
    <>
      <ReportModal
        isOpen={isReportOpen}
        onClose={() => {
          setIsReportOpen(false);
          if (!isDesktop) setTab('home');
        }}
        expenses={expenses}
        summary={summary}
      />
      <ReceiptModal
        isOpen={receipt.open}
        onClose={() => setReceipt((r) => ({ ...r, open: false }))}
        imageUrl={receipt.url}
        title={receipt.title}
      />
    </>
  );

  /* ── 데스크톱: 요약 + 2열(내역 / 등록 폼) ── */
  if (isDesktop) {
    return (
      <div className="sc-app">
        <Header title="Spa CardFlow" onOpenReport={openReport} />
        <Dashboard summary={summary} count={expenses.length} />

        <main className="sc-page sc-main">
          <ExpenseList
            expenses={expenses}
            onEditExpense={handleEdit}
            onViewReceipt={viewReceipt}
          />
          <div className="sc-aside">
            <ExpenseForm
              onSaveExpense={handleSave}
              onDeleteExpense={handleDelete}
              editingItem={editingItem}
              onCancelEdit={() => setEditingItem(null)}
            />
          </div>
        </main>

        <footer className="sc-footer">
          <div className="sc-footer-in">
            <span>Spa CardFlow v1.0</span>
            <span>매월 15일 결산 · 블루오션 웰니스 스파</span>
          </div>
        </footer>

        {modals}
      </div>
    );
  }

  /* ── 모바일: 하단 탭 + 한 화면에 하나씩 ── */
  return (
    <div className="sc-app">
      <Header
        title={TAB_TITLE[tab]}
        onOpenReport={openReport}
        rightSlot={
          tab === 'add' && editingItem ? (
            <button
              type="button"
              className="sc-btn sc-btn-soft sc-btn-sm"
              onClick={() => {
                setEditingItem(null);
                setTab('list');
              }}
            >
              취소
            </button>
          ) : undefined
        }
      />

      {tab === 'home' && (
        <>
          <Dashboard summary={summary} count={expenses.length} />

          <div className="sc-page sc-stack-sm" style={{ paddingTop: 20 }}>
            <button
              type="button"
              className="sc-btn sc-btn-primary sc-btn-lg sc-btn-block"
              onClick={() => {
                setEditingItem(null);
                setAutoCamera(true);
                setTab('add');
              }}
            >
              <Camera size={22} strokeWidth={1.8} />
              영수증 찍어서 등록
            </button>
            <button
              type="button"
              className="sc-btn sc-btn-soft sc-btn-block"
              onClick={() => {
                setEditingItem(null);
                setTab('add');
              }}
            >
              <PenLine size={19} strokeWidth={1.8} />
              직접 입력하기
            </button>
          </div>

          <div className="sc-page" style={{ paddingTop: 26 }}>
            <ExpenseList
              expenses={expenses}
              onEditExpense={handleEdit}
              onViewReceipt={viewReceipt}
              limit={4}
              showFilters={false}
              title="최근 내역"
              onRequestAdd={() => setTab('add')}
              headerAction={
                <button type="button" className="sc-link" onClick={() => setTab('list')}>
                  전체 보기
                </button>
              }
            />
          </div>
        </>
      )}

      {tab === 'list' && (
        <div className="sc-page" style={{ paddingTop: 18 }}>
          <ExpenseList
            expenses={expenses}
            onEditExpense={handleEdit}
            onViewReceipt={viewReceipt}
            onRequestAdd={() => setTab('add')}
          />
        </div>
      )}

      {tab === 'add' && (
        <div className="sc-page" style={{ paddingTop: 18 }}>
          <ExpenseForm
            onSaveExpense={handleSave}
            onDeleteExpense={handleDelete}
            editingItem={editingItem}
            onCancelEdit={() => {
              setEditingItem(null);
              setTab('list');
            }}
            autoCamera={autoCamera}
            onAutoCameraHandled={() => setAutoCamera(false)}
          />
        </div>
      )}

      <BottomTabs tab={tab} onChange={handleTab} />

      {modals}
    </div>
  );
}

export default App;
