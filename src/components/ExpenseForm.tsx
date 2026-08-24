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
  /** 홈의 "영수증 찍어서 등록"으로 들어왔을 때 카메라를 바로 연다 */
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

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

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
    if (!autoCamera) return;
    cameraInputRef.current?.click();
    onAutoCameraHandled?.();
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
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, w, h);

        // OCR 인식률 향상을 위한 흑백 + 대비 증가(Binarization) 전처리
        const imgData = ctx.getImageData(0, 0, w, h);
        const data = imgData.data;
        for (let i = 0; i < data.length; i += 4) {
          const brightness = 0.34 * data[i] + 0.5 * data[i + 1] + 0.16 * data[i + 2];
          // 대비 증가 (Thresholding)
          const contrast = brightness > 120 ? 255 : 0;
          data[i] = contrast;     // R
          data[i + 1] = contrast; // G
          data[i + 2] = contrast; // B
        }
        ctx.putImageData(imgData, 0, 0);

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
    <div className="sc-card">
      <div className="sc-card-body">
        <div className="sc-card-head" style={{ padding: 0, marginBottom: 18 }}>
          <h2 className="sc-card-title">{editingItem ? '내역 수정' : '결제 내역 등록'}</h2>
          {editingItem && (
            <button type="button" onClick={onCancelEdit} className="sc-link">
              편집 취소
            </button>
          )}
        </div>

        {/* Camera Input */}
        <input
          type="file"
          accept="image/*"
          capture="environment"
          ref={cameraInputRef}
          onChange={handleImage}
          style={{ display: 'none' }}
        />
        {/* Gallery Input */}
        <input
          type="file"
          accept="image/*"
          ref={galleryInputRef}
          onChange={handleImage}
          style={{ display: 'none' }}
        />

        <div className="sc-stack">
          {receiptImage ? (
            <div className="sc-attached">
              <img src={receiptImage} alt="영수증" />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 500 }}>
                  {isOcr ? '영수증 분석 중…' : '영수증 첨부됨'}
                </div>
                <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>
                  보고서에 함께 보관됩니다
                </div>
              </div>
              <button
                type="button"
                className="sc-icon-btn"
                aria-label="영수증 삭제"
                onClick={() => {
                  setReceiptImage('');
                  setReceiptFile(null);
                }}
              >
                <Trash2 size={17} strokeWidth={1.8} />
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                className="sc-dashed"
                onClick={() => cameraInputRef.current?.click()}
                style={{ flex: 1 }}
              >
                <Camera size={22} strokeWidth={1.7} />
                <span>
                  <span className="sc-dashed-title" style={{ display: 'block' }}>
                    영수증 촬영
                  </span>
                  <span className="sc-dashed-sub" style={{ display: 'block' }}>
                    카메라로 찍기
                  </span>
                </span>
              </button>
              
              <button
                type="button"
                className="sc-dashed"
                onClick={() => galleryInputRef.current?.click()}
                style={{ flex: 1 }}
              >
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px' }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                    <circle cx="8.5" cy="8.5" r="1.5"></circle>
                    <polyline points="21 15 16 10 5 21"></polyline>
                  </svg>
                </div>
                <span>
                  <span className="sc-dashed-title" style={{ display: 'block' }}>
                    앨범에서 선택
                  </span>
                  <span className="sc-dashed-sub" style={{ display: 'block' }}>
                    갤러리 사진 첨부
                  </span>
                </span>
              </button>
            </div>
          )}

          {notice && (
            <div className="sc-notice">
              {isOcr ? (
                <Loader2 size={16} strokeWidth={2} style={{ animation: 'spin 1s linear infinite' }} />
              ) : (
                <Info size={16} strokeWidth={2} />
              )}
              <span>{notice}</span>
            </div>
          )}

          <div>
            <label className="sc-label">결제 금액</label>
            <input
              type="text"
              inputMode="numeric"
              className="sc-input sc-input-amount"
              placeholder="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          <div>
            <label className="sc-label">결제처</label>
            <input
              type="text"
              className="sc-input"
              placeholder="상호명"
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
            />
          </div>

          <div className="sc-row2">
            <div>
              <label className="sc-label">날짜</label>
              <input
                type="date"
                className="sc-input sc-input-date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div>
              <label className="sc-label">시간</label>
              <input
                type="time"
                className="sc-input sc-input-date"
                value={time}
                onChange={(e) => setTime(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="sc-label">분류</label>
            <div className="sc-chips-wrap">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={category === cat ? 'sc-chip sc-chip-blue' : 'sc-chip'}
                >
                  {shortCat(cat)}
                </button>
              ))}
            </div>
          </div>

          <div className="sc-row-qty">
            <div>
              <label className="sc-label">품목</label>
              <input
                type="text"
                className="sc-input"
                placeholder="구매한 물품"
                value={items}
                onChange={(e) => setItems(e.target.value)}
              />
            </div>
            <div>
              <label className="sc-label">수량</label>
              <input
                type="text"
                inputMode="numeric"
                className="sc-input sc-input-center"
                placeholder="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="sc-label">사용 목적 · 보고서에 그대로 실립니다</label>
            <textarea
              className="sc-input"
              rows={3}
              placeholder="업무상 사용 목적을 적어주세요"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
            />
          </div>

          <div>
            <label className="sc-label">비고</label>
            <input
              type="text"
              className="sc-input"
              placeholder="선택 입력"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            marginTop: 24,
            paddingTop: 20,
            borderTop: '1px solid var(--line)'
          }}
        >
          <button
            type="button"
            onClick={submit}
            disabled={isUploading || isOcr}
            className="sc-btn sc-btn-primary sc-btn-lg"
            style={{ flex: 1 }}
          >
            {isUploading ? '저장하는 중…' : editingItem ? '수정 내용 저장' : '등록하기'}
          </button>
          <button type="button" onClick={reset} className="sc-btn sc-btn-soft sc-btn-lg">
            지우기
          </button>
        </div>

        {editingItem && onDeleteExpense && (
          <button
            type="button"
            className="sc-btn sc-btn-danger sc-btn-block"
            style={{ marginTop: 10 }}
            onClick={() => {
              if (!window.confirm(`'${editingItem.storeName}' 내역을 삭제할까요?`)) return;
              onDeleteExpense(editingItem.id);
              reset();
              onCancelEdit?.();
            }}
          >
            이 내역 삭제
          </button>
        )}
      </div>
    </div>
  );
};
