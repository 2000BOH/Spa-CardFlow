import { useState, useEffect, useCallback, useRef } from 'react';
import type { ExpenseItem } from './types/expense';
import { calculateBudgetSummary } from './utils/storage';
import { fetchExpenses, createExpense, updateExpense, deleteExpense, fetchReceiptImage, checkReceiptExists } from './api/expenseApi';
import { Header } from './components/Header';
import { Dashboard } from './components/Dashboard';
import { ExpenseForm } from './components/ExpenseForm';
import { ExpenseList } from './components/ExpenseList';
import { ReportModal } from './components/ReportModal';
import { ReceiptModal } from './components/ReceiptModal';
import { BottomTabs } from './components/BottomTabs';
import type { TabKey } from './components/BottomTabs';
import { Camera, PenLine } from 'lucide-react';

import { isSupabaseConfigured } from './utils/supabase';

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

  // 월별 결산 필터 상태 (기본값: 현재 결산월)
  /**
   * 결산월 계산: 매월 15일에 결산. 16일 이후 거래는 다음 달 결산으로 분류.
   * 예) 9/1~9/15 → 9월 결산, 9/16~10/15 → 10월 결산
   */
  const getReportMonth = (dateStr: string) => {
    // 날짜 문자열이 없거나 유효하지 않으면 현재 날짜 기준으로 처리
    if (!dateStr) return getReportMonth(new Date().toISOString());
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return getReportMonth(new Date().toISOString());
    let year = d.getFullYear();
    let month = d.getMonth() + 1;
    const day = d.getDate();
    // 16일 이후부터 다음 달 결산 (15일 당일은 이번 달 결산에 포함)
    if (day > 15) {
       month += 1;
       if (month > 12) { month = 1; year += 1; }
    }
    return `${year}-${String(month).padStart(2, '0')}`;
  };

  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    return getReportMonth(new Date().toISOString());
  });

  // 선택된 결산월에 해당하는 내역만 필터링
  const filteredExpenses = expenses.filter(e => getReportMonth(e.date) === selectedMonth);

  // 26년 07월부터 현재 결산월까지 옵션 생성
  const monthOptions: { label: string, value: string }[] = [];
  let curYear = 2026;
  let curMonth = 7;
  const currentVal = getReportMonth(new Date().toISOString());
  
  while (true) {
    const valStr = `${curYear}-${String(curMonth).padStart(2, '0')}`;
    monthOptions.push({ label: `${String(curYear).slice(2)}년 ${String(curMonth).padStart(2, '0')}월 결산`, value: valStr });
    if (valStr === currentVal) break;
    curMonth++;
    if (curMonth > 12) { curMonth = 1; curYear++; }
    if (curYear > 2100) break; // 무한루프 방지
  }

  // 영수증 존재 여부 맵 (id → boolean)
  const [receiptMap, setReceiptMap] = useState<Record<string, boolean>>({});

  // 폴링 에러 백오프를 위한 ref
  const errorCountRef = useRef(0);
  const pollingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * 데이터 로드 + 영수증 존재여부 확인
   * 에러 시 폴링 간격을 점진적으로 늘려 DB 부하 방지
   * "나왔다 사라졌다" 방지: 에러 시 기존 화면 데이터를 그대로 유지
   */
  const isFirstLoadRef = useRef(true);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      try {
        const loaded = await fetchExpenses();
        if (!isMounted) return;
        setExpenses(loaded);
        errorCountRef.current = 0; // 성공 시 에러 카운트 초기화
        isFirstLoadRef.current = false;

        // 영수증 존재여부 확인 (실패해도 데이터 표시에 영향 없음)
        try {
          const serverIds = loaded.filter(e => !e.id.startsWith('local_')).map(e => e.id);
          if (serverIds.length > 0) {
            const existsMap = await checkReceiptExists(serverIds);
            if (isMounted) {
              setReceiptMap(prev => ({ ...prev, ...existsMap }));
            }
          }
        } catch {
          // 영수증 존재여부 확인 실패는 무시 (핵심 데이터와 무관)
        }
      } catch (err) {
        console.error('Failed to load data:', err);
        if (isMounted) {
          errorCountRef.current += 1;

          // ⚠️ 첫 로드 실패 시에만 로컬 캐시 데이터로 fallback
          // 이후 폴링 에러 시에는 기존 화면 데이터를 그대로 유지 → "나왔다 사라졌다" 방지
          if (isFirstLoadRef.current) {
            const LOCAL_KEY = 'blue_ocean_card_expenses_v2';
            try {
              const cached = localStorage.getItem(LOCAL_KEY);
              if (cached) setExpenses(JSON.parse(cached));
            } catch { /* 로컬 캐시도 없으면 빈 화면 유지 */ }
            isFirstLoadRef.current = false;
          }
        }
      }

      // 다음 폴링 스케줄 (Supabase 연결 시에만)
      if (isMounted && isSupabaseConfigured) {
        // 에러 횟수에 따라 폴링 간격 증가: 10초 → 30초 → 60초, 3회 이상 연속 실패 시 폴링 중단
        if (errorCountRef.current >= 3) {
          console.warn('[폴링 중단] 연속 3회 실패. 페이지 새로고침으로 재시도하세요.');
          return;
        }
        const delay = errorCountRef.current === 0 ? 10000 : errorCountRef.current === 1 ? 30000 : 60000;
        pollingTimerRef.current = setTimeout(load, delay);
      }
    };
    load();

    return () => {
      isMounted = false;
      if (pollingTimerRef.current) clearTimeout(pollingTimerRef.current);
    };
  }, []);

  const summary = calculateBudgetSummary(filteredExpenses);

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
    } catch (err: any) {
      console.error('Save failed:', err);
      alert(`저장에 실패했습니다.\n원인: ${err?.message || '서버 연결 오류'}\n\nVercel 환경변수(VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)가 설정되어 있는지 확인해주세요.`);
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

  /**
   * 영수증 보기 핸들러 (Lazy Load)
   * 리스트 조회 시에는 이미지를 가져오지 않으므로,
   * 클릭 시점에 서버에서 개별 로딩합니다.
   */
  const viewReceipt = async (itemOrUrl: string | ExpenseItem, title?: string) => {
    // 문자열이면 이미 URL/Base64가 있는 경우 (로컬 데이터 등)
    if (typeof itemOrUrl === 'string' && itemOrUrl) {
      setReceipt({ open: true, url: itemOrUrl, title: title || '영수증' });
      return;
    }

    // ExpenseItem 객체면 서버에서 lazy load
    const item = itemOrUrl as ExpenseItem;
    setReceipt({ open: true, url: '', title: `${item.storeName} 영수증 로딩 중...` });

    try {
      const imageUrl = await fetchReceiptImage(item.id);
      if (imageUrl) {
        setReceipt({ open: true, url: imageUrl, title: `${item.storeName} 영수증` });
      } else {
        setReceipt({ open: true, url: '', title: '영수증 이미지를 찾을 수 없습니다' });
      }
    } catch {
      setReceipt({ open: true, url: '', title: '영수증 로딩 실패' });
    }
  };

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
        expenses={filteredExpenses}
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
        <Header
          title="법인카드 관리"
          onOpenReport={openReport}
          rightSlot={
            <select
              className="sc-input"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              style={{ padding: '8px 12px', fontSize: '14px', height: '42px', borderRadius: '12px', background: '#fff' }}
            >
              {monthOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          }
        />
        <Dashboard summary={summary} count={filteredExpenses.length} />

        <main className="sc-page sc-main">
          <ExpenseList
            expenses={filteredExpenses}
            onEditExpense={handleEdit}
            onViewReceipt={viewReceipt}
            receiptMap={receiptMap}
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
          <div style={{ display: 'flex', gap: '8px' }}>
            <select
              className="sc-input"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              style={{ padding: '6px 10px', fontSize: '13px', height: '36px', borderRadius: '10px', background: '#fff' }}
            >
              {monthOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            {tab === 'add' && editingItem && (
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
            )}
          </div>
        }
      />

      {tab === 'home' && (
        <>
          <Dashboard summary={summary} count={filteredExpenses.length} />

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
              expenses={filteredExpenses}
              onEditExpense={handleEdit}
              onViewReceipt={viewReceipt}
              receiptMap={receiptMap}
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
          {/* filteredExpenses: 선택된 결산월에 해당하는 내역만 표시 */}
          <ExpenseList
            expenses={filteredExpenses}
            onEditExpense={handleEdit}
            onViewReceipt={viewReceipt}
            receiptMap={receiptMap}
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
