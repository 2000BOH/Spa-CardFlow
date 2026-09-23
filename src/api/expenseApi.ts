import { supabase } from '../utils/supabase';
import type { ExpenseItem } from '../types/expense';

const LOCAL_STORAGE_KEY = 'blue_ocean_card_expenses_v2';

/**
 * Supabase 테이블명 상수
 * DB 스키마 변경 시 이곳만 수정하면 전체 API에 반영됨
 */
const TABLE_NAME = 'cardflow_expenses';

/**
 * 리스트 조회 시 가져올 컬럼 목록
 * ⚠️ receipt_image_url 제외: Base64 이미지가 직접 저장되어 있어
 *    전체 조회 시 데이터 전송량 폭발 → Supabase statement timeout 유발
 *    영수증 이미지는 fetchReceiptImage()로 개별 로딩
 */
const LIST_COLUMNS = 'id,store_name,expense_date,expense_time,items,quantity,amount,category,purpose,note,directed_by,created_at';

// 로컬 스토리지 유틸리티
const getLocalData = (): ExpenseItem[] => {
  try {
    const data = localStorage.getItem(LOCAL_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    return [];
  }
};

const saveLocalData = (data: ExpenseItem[]) => {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Local storage save error:', e);
  }
};

/**
 * 0. [동기화 복구] local_ ID로 남아있는 데이터를 Supabase에 재업로드
 * - directed_by 콜럼 추가 전에 저장 실패한 데이터를 복구하는 용도
 */
async function syncLocalToServer(): Promise<void> {
  if (!supabase) return;
  const localData = getLocalData();
  const unsynced = localData.filter(item => item.id.startsWith('local_'));
  if (unsynced.length === 0) return;

  console.log(`[동기화] 미동기화 데이터 ${unsynced.length}건을 서버에 업로드 시도 중...`);

  for (const item of unsynced) {
    try {
      const payload = {
        store_name: item.storeName,
        expense_date: item.date,
        expense_time: item.time,
        items: item.items,
        quantity: item.quantity,
        amount: item.amount,
        category: item.category,
        purpose: item.purpose,
        note: item.note,
        receipt_image_url: item.receiptImage,
        directed_by: item.directedBy || 'none',
      };
      const { data, error } = await supabase
        .from(TABLE_NAME)
        .insert([payload])
        .select(LIST_COLUMNS)
        .single();

      if (error) {
        console.warn(`[동기화 실패] ${item.storeName}:`, error.message);
        continue;
      }

      // 성공 시 local_ ID 를 서버 ID로 교체
      const currentLocal = getLocalData();
      const replaced = currentLocal.map(ex =>
        ex.id === item.id ? { ...ex, id: data.id, createdAt: data.created_at } : ex
      );
      saveLocalData(replaced);
      console.log(`[동기화 성공] ${item.storeName} → 서버 ID: ${data.id}`);
    } catch (err) {
      console.warn(`[동기화 오류] ${item.storeName}:`, err);
    }
  }
}


export async function fetchExpenses(): Promise<ExpenseItem[]> {
  if (!supabase) {
    return getLocalData();
  }

  // 서버 접속 가능 시: 로컬에만 남은 미동기화 데이터를 먼저 서버에 업로드 시도
  syncLocalToServer().catch(e => console.warn('[동기화 백그라운드 실패]', e));

  try {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select(LIST_COLUMNS)
      // 실제 결제일 기준으로 내림차순 정렬 (같은 날짜면 등록 순)
      .order('expense_date', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) throw error;

    /**
     * DB 칼럼(snake_case) → 앱 타입(camelCase) 매핑
     * null/undefined 값은 안전한 기본값으로 처리하여 필터링 오류를 방지합니다.
     */
    const parsedData = (data || []).map((row: any) => ({
      id: row.id,
      storeName: row.store_name ?? '',
      // expense_date가 null이면 빈 문자열 → 결산월 필터에서 현재 날짜로 처리됨
      date: row.expense_date ?? '',
      time: row.expense_time ?? '',
      items: row.items ?? '',
      // quantity가 null이면 1로 처리
      quantity: typeof row.quantity === 'number' ? row.quantity : 1,
      amount: typeof row.amount === 'number' ? row.amount : 0,
      category: row.category ?? '기타/일반지출',
      purpose: row.purpose ?? '',
      note: row.note ?? '',
      // ⚠️ 리스트 조회 시 receipt_image_url은 가져오지 않음 (타임아웃 방지)
      // 영수증 이미지는 '영수증 보기' 클릭 시 fetchReceiptImage()로 개별 로딩
      receiptImage: '',
      // 영수증 존재 여부만 로컬 캐시에서 확인 (있으면 true 표시용)
      directedBy: row.directed_by || 'none',
      createdAt: row.created_at ?? new Date().toISOString(),
    }));

    // 로컬에만 있는(아직 서버에 못올라간) 데이터 보존 처리
    const localData = getLocalData();
    const unsyncedLocal = localData.filter(item => item.id.startsWith('local_'));
    
    // 서버 데이터 + 미동기화 로컬 데이터 병합 후 실제 결제일 기준 정렬
    const combinedData = [...unsyncedLocal, ...parsedData];
    combinedData.sort((a, b) => {
      // 날짜 기준 내림차순, 날짜 같으면 등록일 내림차순
      const dateDiff = (b.date || '').localeCompare(a.date || '');
      if (dateDiff !== 0) return dateDiff;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    // 서버 데이터를 성공적으로 불러오면 로컬도 동기화
    saveLocalData(combinedData);
    return combinedData;
  } catch (err: any) {
    console.warn('서버 연결 실패.', err);
    if (typeof window !== 'undefined' && !window.sessionStorage.getItem('fetch_error_shown')) {
      alert(`[데이터 불러오기 실패]\n원인: ${err.message || JSON.stringify(err)}\n\n(이 메시지는 접속 시 1회만 표시됩니다.)`);
      window.sessionStorage.setItem('fetch_error_shown', 'true');
    }
    // ⚠️ 에러를 re-throw하여 호출자(App)가 감지 → 기존 데이터 유지 + 폴링 백오프 작동
    // (이전 코드: getLocalData() 반환 → App이 에러를 모름 → 로컬/서버 데이터 깜빡거림)
    throw err;
  }
}

/**
 * 2. 지출 내역 신규 추가 (Create) - Offline First
 */
export async function createExpense(item: Omit<ExpenseItem, 'id' | 'createdAt'>): Promise<ExpenseItem> {
  const localData = getLocalData();
  const newItem: ExpenseItem = {
    ...item,
    id: `local_${Date.now()}_${Math.random().toString(36).substring(7)}`,
    createdAt: new Date().toISOString()
  };

  if (!supabase) {
    saveLocalData([newItem, ...localData]);
    return newItem;
  }

  try {
    const payload = {
      store_name: item.storeName,
      expense_date: item.date,
      expense_time: item.time,
      items: item.items,
      quantity: item.quantity,
      amount: item.amount,
      category: item.category,
      purpose: item.purpose,
      note: item.note,
      receipt_image_url: item.receiptImage,
      directed_by: item.directedBy || 'none',
    };

    const { data, error } = await supabase
      .from(TABLE_NAME)
      .insert([payload])
      .select(LIST_COLUMNS)
      .single();

    if (error) throw error;

    newItem.id = data.id;
    newItem.createdAt = data.created_at;
    saveLocalData([newItem, ...localData]);
    return newItem;
  } catch (err: any) {
    console.warn('서버 저장 실패. 오프라인 모드로 안전하게 저장합니다.', err);
    // 디버깅을 위해 사용자에게 직접 에러를 보여줍니다.
    if (typeof window !== 'undefined') {
      alert(`[서버 연동 실패]\n원인: ${err.message || JSON.stringify(err)}\n\n(데이터는 현재 기기에만 안전하게 저장되었습니다.)`);
    }
    saveLocalData([newItem, ...localData]);
    return newItem;
  }
}

/**
 * 3. 지출 내역 수정 (Update) - Offline First
 */
export async function updateExpense(id: string, item: Partial<Omit<ExpenseItem, 'id' | 'createdAt'>>): Promise<void> {
  const localData = getLocalData();
  const updatedLocal = localData.map(ex => ex.id === id ? { ...ex, ...item } as ExpenseItem : ex);
  saveLocalData(updatedLocal);

  if (!supabase || id.startsWith('local_')) {
    return;
  }

  try {
    const payload: any = {};
    if (item.storeName !== undefined) payload.store_name = item.storeName;
    if (item.date !== undefined) payload.expense_date = item.date;
    if (item.time !== undefined) payload.expense_time = item.time;
    if (item.items !== undefined) payload.items = item.items;
    if (item.quantity !== undefined) payload.quantity = item.quantity;
    if (item.amount !== undefined) payload.amount = item.amount;
    if (item.category !== undefined) payload.category = item.category;
    if (item.purpose !== undefined) payload.purpose = item.purpose;
    if (item.note !== undefined) payload.note = item.note;
    if (item.receiptImage !== undefined) payload.receipt_image_url = item.receiptImage;
    if (item.directedBy !== undefined) payload.directed_by = item.directedBy;

    const { error } = await supabase.from(TABLE_NAME).update(payload).eq('id', id);
    if (error) throw error;
  } catch (err: any) {
    console.warn('서버 수정 실패:', err?.message || err);
    throw err;
  }
}

/**
 * 4. 지출 내역 삭제 (Delete) - Offline First
 */
export async function deleteExpense(id: string): Promise<void> {
  const localData = getLocalData();
  saveLocalData(localData.filter(ex => ex.id !== id));

  if (!supabase || id.startsWith('local_')) return;

  try {
    await supabase.from(TABLE_NAME).delete().eq('id', id);
  } catch (err) {
    console.warn('서버 삭제 실패. 오프라인 모드에서는 삭제가 유지됩니다.');
  }
}

export async function uploadReceiptImage(file: File): Promise<string | null> {
  if (!supabase) return null;

  try {
    const fileExt = file.name.split('.').pop() || 'jpg';
    const fileName = `cardflow_receipt_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
    const { error } = await supabase.storage.from('receipts').upload(fileName, file);
    if (error) return null;
    const { data } = supabase.storage.from('receipts').getPublicUrl(fileName);
    return data.publicUrl;
  } catch {
    return null;
  }
}

/**
 * 개별 영수증 이미지 로딩 (Lazy Load)
 * 리스트에서는 이미지를 가져오지 않고, 사용자가 영수증 보기를 클릭할 때만 로딩
 * → DB 타임아웃 방지 (Base64 이미지가 컬럼에 직접 저장되어 있으므로)
 */
export async function fetchReceiptImage(id: string): Promise<string> {
  // 로컬 저장 항목은 로컬 캐시에서 찾기
  if (id.startsWith('local_')) {
    const localData = getLocalData();
    const item = localData.find(ex => ex.id === id);
    return item?.receiptImage || '';
  }

  if (!supabase) {
    const localData = getLocalData();
    const item = localData.find(ex => ex.id === id);
    return item?.receiptImage || '';
  }

  try {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('receipt_image_url')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data?.receipt_image_url || '';
  } catch (err) {
    console.warn('[영수증 로딩 실패]', err);
    return '';
  }
}

/**
 * 영수증 이미지 존재 여부만 확인 (리스트 아이콘 표시용)
 * 전체 이미지 데이터 대신 존재 여부(true/false)만 빠르게 가져옴
 */
export async function checkReceiptExists(ids: string[]): Promise<Record<string, boolean>> {
  const result: Record<string, boolean> = {};
  if (!supabase || ids.length === 0) return result;

  try {
    // receipt_image_url이 null이 아닌 것만 필터 + id만 가져오기 (경량 쿼리)
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('id')
      .in('id', ids)
      .not('receipt_image_url', 'is', null)
      .neq('receipt_image_url', '');

    if (error) throw error;
    for (const row of data || []) {
      result[row.id] = true;
    }
  } catch (err) {
    console.warn('[영수증 존재 확인 실패]', err);
  }
  return result;
}
