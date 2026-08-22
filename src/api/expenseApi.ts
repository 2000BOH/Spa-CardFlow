import { supabase } from '../utils/supabase';
import type { ExpenseItem } from '../types/expense';

/**
 * 1. 전체 지출 내역 조회 (Read)
 */
export async function fetchExpenses(): Promise<ExpenseItem[]> {
  const { data, error } = await supabase
    .from('expenses')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('지출 내역 불러오기 실패:', error);
    throw error;
  }

  // DB 스키마(snake_case)를 프론트엔드 타입(camelCase)으로 변환
  return (data || []).map((row: any) => ({
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
    createdAt: row.created_at,
  }));
}

/**
 * 2. 지출 내역 신규 추가 (Create)
 */
export async function createExpense(item: Omit<ExpenseItem, 'id' | 'createdAt'>): Promise<ExpenseItem> {
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
  };

  const { data, error } = await supabase
    .from('expenses')
    .insert([payload])
    .select()
    .single();

  if (error) {
    console.error('지출 내역 추가 실패:', error);
    throw error;
  }

  return {
    id: data.id,
    storeName: data.store_name,
    date: data.expense_date,
    time: data.expense_time,
    items: data.items,
    quantity: data.quantity,
    amount: data.amount,
    category: data.category,
    purpose: data.purpose,
    note: data.note,
    receiptImage: data.receipt_image_url,
    createdAt: data.created_at,
  };
}

/**
 * 3. 지출 내역 수정 (Update)
 */
export async function updateExpense(id: string, item: Partial<Omit<ExpenseItem, 'id' | 'createdAt'>>): Promise<void> {
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

  const { error } = await supabase
    .from('expenses')
    .update(payload)
    .eq('id', id);

  if (error) {
    console.error('지출 내역 수정 실패:', error);
    throw error;
  }
}

/**
 * 4. 지출 내역 삭제 (Delete)
 */
export async function deleteExpense(id: string): Promise<void> {
  const { error } = await supabase
    .from('expenses')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('지출 내역 삭제 실패:', error);
    throw error;
  }
}

/**
 * 5. 영수증 이미지 스토리지 업로드 (Storage)
 * Supabase Storage에 업로드를 시도하고, 실패 시 null을 반환합니다.
 * 
 * [중요] Storage 버킷('receipts')이 Supabase에 생성되어 있지 않거나
 * 권한(RLS Policy)이 설정되지 않은 경우 업로드가 실패합니다.
 * 이 경우 호출자(ExpenseForm)에서 압축된 base64 DataURL을 DB에 직접 저장합니다.
 */
export async function uploadReceiptImage(file: File): Promise<string | null> {
  try {
    // 고유 파일명 생성
    const fileExt = file.name.split('.').pop() || 'jpg';
    const fileName = `receipt_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error } = await supabase.storage
      .from('receipts')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.warn('영수증 Storage 업로드 실패 (폴백: base64 저장):', error.message);
      return null;
    }

    // 업로드 성공 시 public URL 가져오기
    const { data: publicUrlData } = supabase.storage
      .from('receipts')
      .getPublicUrl(filePath);

    return publicUrlData.publicUrl;
  } catch (err) {
    console.warn('영수증 Storage 연결 실패 (폴백: base64 저장):', err);
    return null;
  }
}
