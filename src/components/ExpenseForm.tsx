import React, { useState, useRef, useEffect } from 'react';
import type { ExpenseCategory, ExpenseItem } from '../types/expense';
import { parseRealReceiptImage } from '../utils/ocrParser';
import { uploadReceiptImage } from '../api/expenseApi';
import { Camera, Info, Loader2, Trash2 } from 'lucide-react';

const CATEGORIES: ExpenseCategory[] = [
  '시설/건재/자재',
  '스파/비품/소모품',
  '식비/간식/음료',
  '교통/유류/주차',
  '접대/회의/행사',
  '기타/일반지출'
];

const shortCat = (c: string) => c.split('/').slice(0, 2).join('/');
const todayStr = () => new Date().toISOString().split('T')[0];

interface ExpenseFormProps {
  onSaveExpense: (expense: Omit<ExpenseItem, 'id' | 'createdAt'>) => void;
  onDeleteExpense?: (id: string) => void;
  editingItem?: ExpenseItem | null;
  onCancelEdit?: () => void;
  /** 홈에서 "영수증 찍어서 등록"으로 진입했을 때 카메라를 바로 연다 */
  autoCamera?: boolean;
  onAutoCameraHandled?: () => void;
}

export const ExpenseForm: React.FC<ExpenseFormProps> = ({
  onSaveExpense,
  onDeleteExpense,
  editingItem,
  onCancelEdit,
  autoCamera,
  onAutoCameraHandled
}) => {
  const [storeName, setStoreName] = useState('');
  const [date, setDate] = useState(todayStr());
  const [time, setTime] = useState('12:00');
  const [items, setItems] = useState('');
  const [quantity, setQuantity] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>(CATEGORIES[0]);
  const [purpose, setPurpose] = useState('');
  const [note, setNote] = useState('');
  const [receiptImage, setReceiptImage] = useState('');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);

  const [notice, setNotice] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isOcr, setIsOcr] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!editingItem) return;
    setStoreName(editingItem.storeName);
    setDate(editingItem.date);
    setTime(editingItem.time);
    setItems(editingItem.items);
    setQuantity(String(editingItem.quantity ?? ''));
    setAmount(String(editingItem.amount));
    setCategory(editingItem.category);
    setPurpose(editingItem.purpose);
    setNote(editingItem.note ?? '');
    setReceiptImage(editingItem.receiptImage ?? '');
    setReceiptFile(null);
    setNotice(null);
  }, [editingItem]);

  useEffect(() => {
    if (autoCamera) {
      fileInputRef.current?.click();
      onAutoCameraHandled?.();
    }
  }, [autoCamera, onAutoCameraHandled]);

  const reset = () => {
    setStoreName('');
    setDate(todayStr());
    setTime('12:00');
    setItems('');
    setQuantity('');
    setAmount('');
    setCategory(CATEGORIES[0]);
    setPurpose('');
    setNote('');
    setReceiptImage('');
    setReceiptFile(null);
    setNotice(null);
  };

  const handleImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = async () => {
        const canvas = document.createElement('canvas');
        const MAX = 1200;
        let w = img.width;
        let h = img.height;
        if (w > h && w > MAX) {
          h = Math.round((h * MAX) / w);
          w = MAX;
        } else if (h >= w && h > MAX) {
          w = Math.round((w * MAX) / h);
          h = MAX;
        }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, w, h);

        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        setReceiptImage(dataUrl);
        setReceiptFile(file);

        setIsOcr(true);
        setNotice('영수증을 읽고 있습니다. 3~5초 걸립니다.');
        try {
          const parsed = await parseRealReceiptImage(dataUrl);
          if (parsed.amount > 0) setAmount(String(parsed.amount));
          if (parsed.storeName) setStoreName(parsed.storeName);
          setNotice('자동 인식이 끝났습니다. 빈칸을 확인해 주세요.');
        } catch {
          setNotice('영수증을 읽지 못했습니다. 직접 입력해 주세요.');
        } finally {
          setIsOcr(false);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const submit = async () => {
    const amt = Number(String(amount).replace(/[^0-9]/g, ''));
    if (!storeName.trim() || !amt) {
      setNotice('결제처와 금액은 반드시 입력해야 합니다.');
      return;
    }

    setIsUploading(true);
    try {
      let finalImage = receiptImage;
      if (receiptFile) {
        const uploaded = await uploadReceiptImage(receiptFile);
        if (uploaded) finalImage = uploaded;
      }

      onSaveExpense({
        storeName: storeName.trim(),
        date,
        time,
        items: items.trim() || `${storeName.trim()} 결제`,
        quantity: Number(String(quantity).replace(/[^0-9]/g, '')) || 1,
        amount: amt,
        category,
        purpose: purpose.trim() || '사용 목적 미기입',
        note: note.trim(),
        receiptImage: finalImage || undefined
      });

      reset();
      onCancelEdit?.();
    } catch (err) {
      console.error(err);
      setNotice('저장에 실패했습니다. 잠시 후 다시 시도해 주세요.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="cb-card p-5 md:p-7">
      <div className="flex items-baseline justify-between gap-3 mb-5">
        <h2 className="text-[17px] md:text-[19px] font-bold tracking-tight">
          {editingItem ? '내역 수정' : '결제 내역 등록'}
        </h2>
        {editingItem && (
          <button
            type="button"
            onClick={onCancelEdit}
            className="border-none bg-transparent text-brand text-[14px] cursor-pointer p-0"
          >
            편집 취소
          </button>
        )}
      </div>

      <input
        type="file"
        accept="image/*"
        capture="environment"
        ref={fileInputRef}
        onChange={handleImage}
        className="hidden"
      />

      {receiptImage ? (
        <div className="flex items-center gap-3.5 p-3.5 border border-line rounded-[14px] mb-5">
          <img src={receiptImage} alt="영수증" className="w-14 h-14 shrink-0 rounded-[10px] object-cover" />
          <div className="flex-1 min-w-0">
            <div className="text-[15px] font-medium">
              {isOcr ? '영수증 분석 중…' : '영수증 첨부됨'}
            </div>
            <div className="text-[13px] text-muted mt-0.5">보고서에 함께 보관됩니다</div>
          </div>
          <button
            type="button"
            onClick={() => {
              setReceiptImage('');
              setReceiptFile(null);
            }}
            aria-label="영수증 삭제"
            className="w-10 h-10 shrink-0 flex items-center justify-center rounded-full bg-surface text-muted border-none cursor-pointer"
          >
            <Trash2 className="w-[17px] h-[17px]" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="w-full flex items-center gap-3 p-4 mb-5 border border-dashed border-[rgba(91,97,110,0.4)] rounded-[14px] bg-white text-left cursor-pointer hover:border-brand transition-colors"
        >
          <Camera className="w-[22px] h-[22px] text-brand shrink-0" strokeWidth={1.7} />
          <div>
            <div className="text-[16px] font-medium leading-tight">영수증 촬영</div>
            <div className="text-[13px] text-muted leading-tight mt-0.5">
              금액·결제처를 자동으로 채웁니다
            </div>
          </div>
        </button>
      )}

      {notice && (
        <div className="flex items-start gap-2.5 p-3.5 mb-5 rounded-xl border border-[rgba(0,82,255,0.25)] bg-[rgba(0,82,255,0.04)] text-[14px] leading-relaxed">
          {isOcr ? (
            <Loader2 className="w-4 h-4 text-brand shrink-0 mt-0.5 animate-spin" />
          ) : (
            <Info className="w-4 h-4 text-brand shrink-0 mt-0.5" />
          )}
          <span>{notice}</span>
        </div>
      )}

      <div className="flex flex-col gap-4.5" style={{ gap: '18px', display: 'flex', flexDirection: 'column' }}>
        <div>
          <label className="cb-label">결제 금액</label>
          <input
            type="text"
            inputMode="numeric"
            placeholder="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="cb-input cb-input-amount"
          />
        </div>

        <div>
          <label className="cb-label">결제처</label>
          <input
            type="text"
            placeholder="상호명"
            value={storeName}
            onChange={(e) => setStoreName(e.target.value)}
            className="cb-input"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="cb-label">날짜</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="cb-input px-3"
            />
          </div>
          <div>
            <label className="cb-label">시간</label>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="cb-input px-3"
            />
          </div>
        </div>

        <div>
          <label className="cb-label">분류</label>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                className={`cb-chip h-11 ${category === cat ? 'cb-chip-blue' : ''}`}
              >
                {shortCat(cat)}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-[1fr_96px] gap-3">
          <div>
            <label className="cb-label">품목</label>
            <input
              type="text"
              placeholder="구매한 물품"
              value={items}
              onChange={(e) => setItems(e.target.value)}
              className="cb-input"
            />
          </div>
          <div>
            <label className="cb-label">수량</label>
            <input
              type="text"
              inputMode="numeric"
              placeholder="1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="cb-input px-3 text-center"
            />
          </div>
        </div>

        <div>
          <label className="cb-label">사용 목적 · 보고서에 그대로 실립니다</label>
          <textarea
            rows={3}
            placeholder="업무상 사용 목적을 적어주세요"
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
            className="cb-input"
          />
        </div>

        <div>
          <label className="cb-label">비고</label>
          <input
            type="text"
            placeholder="선택 입력"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="cb-input"
          />
        </div>
      </div>

      <div className="flex items-center gap-2.5 mt-6 pt-5 border-t border-line">
        <button
          type="button"
          onClick={submit}
          disabled={isUploading || isOcr}
          className="cb-btn cb-btn-primary flex-1 h-[56px] text-[17px]"
        >
          {isUploading ? '저장하는 중…' : editingItem ? '수정 내용 저장' : '등록하기'}
        </button>
        <button type="button" onClick={reset} className="cb-btn cb-btn-secondary h-[56px] px-5">
          지우기
        </button>
      </div>

      {editingItem && onDeleteExpense && (
        <button
          type="button"
          onClick={() => {
            if (!window.confirm(`'${editingItem.storeName}' 내역을 삭제할까요?`)) return;
            onDeleteExpense(editingItem.id);
            reset();
            onCancelEdit?.();
          }}
          className="cb-btn cb-btn-danger w-full h-[52px] mt-2.5"
        >
          이 내역 삭제
        </button>
      )}
    </div>
  );
};
