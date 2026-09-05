import { supabase } from '../utils/supabase';
import type { ExpenseItem } from '../types/expense';

const LOCAL_STORAGE_KEY = 'blue_ocean_card_expenses_v2';

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
        .from('cardflow_expenses')
        .insert([payload])
        .select()
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
      .from('cardflow_expenses')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    const parsedData = (data || []).map((row: any) => ({
      id: row.id,
      storeName: row.store_name,
      date: row.expense_date,
      time: row.expense_time,
      items: row.items,
      quantity: row.quantity,
      amount: row.amount,
      category: row.category,
      purpose: row.purpose,
      note: row.note,
      receiptImage: row.receipt_image_url,
      directedBy: row.directed_by || 'none',
      createdAt: row.created_at,
    }));

    // 로컬에만 있는(아직 서버에 못올라간) 데이터 보존 처리
    const localData = getLocalData();
    const unsyncedLocal = localData.filter(item => item.id.startsWith('local_'));
    
    // 서버 데이터 + 미동기화 로컬 데이터 병합
    const combinedData = [...unsyncedLocal, ...parsedData];
    combinedData.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // 서버 데이터를 성공적으로 불러오면 로컬도 동기화
    saveLocalData(combinedData);
    return combinedData;
  } catch (err: any) {
    console.warn('서버 연결 실패. 오프라인 모드 데이터(LocalStorage)를 로드합니다.', err);
    if (typeof window !== 'undefined' && !window.sessionStorage.getItem('fetch_error_shown')) {
      alert(`[데이터 불러오기 실패]\n원인: ${err.message || JSON.stringify(err)}\n\n(이 메시지는 접속 시 1회만 표시됩니다.)`);
      window.sessionStorage.setItem('fetch_error_shown', 'true');
    }
    return getLocalData();
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
      .from('cardflow_expenses')
      .insert([payload])
      .select()
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

    await supabase.from('cardflow_expenses').update(payload).eq('id', id);
  } catch (err) {
    console.warn('서버 수정 실패. 오프라인 모드에서는 수정이 유지됩니다.');
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
    await supabase.from('cardflow_expenses').delete().eq('id', id);
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
