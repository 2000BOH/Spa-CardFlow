import React, { useState, useRef, useEffect } from 'react';
import type { ExpenseCategory, ExpenseItem } from '../types/expense';
import { parseQuickText, parseReceiptImageSimulation } from '../utils/ocrParser';
import { uploadReceiptImage } from '../api/expenseApi';
import { Camera, Sparkles, Save, RotateCcw, Upload, CheckCircle2 } from 'lucide-react';

interface ExpenseFormProps {
  onSaveExpense: (expense: Omit<ExpenseItem, 'id' | 'createdAt'>) => void;
  editingItem?: ExpenseItem | null;
  onCancelEdit?: () => void;
}

const CATEGORIES: ExpenseCategory[] = [
  '시설/건재/자재',
  '스파/비품/소모품',
  '식비/간식/음료',
  '교통/유류/주차',
  '접대/회의/행사',
  '기타/일반지출'
];

export const ExpenseForm: React.FC<ExpenseFormProps> = ({
  onSaveExpense,
  editingItem,
  onCancelEdit
}) => {
  // 자연어 퀵 입력 문구
  const [quickInput, setQuickInput] = useState('');

  // 활성화된 Form 데이터 상태
  const [storeName, setStoreName] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState('12:00');
  const [items, setItems] = useState('');
  const [quantity, setQuantity] = useState<number>(1);
  const [amount, setAmount] = useState<number | ''>('');
  const [category, setCategory] = useState<ExpenseCategory>('시설/건재/자재');
  const [purpose, setPurpose] = useState('');
  const [note, setNote] = useState('');
  const [receiptImage, setReceiptImage] = useState<string>('');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);

  const [parseNotice, setParseNotice] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 수정 모드인 경우 데이터 로드
  useEffect(() => {
    if (editingItem) {
      setStoreName(editingItem.storeName);
      setDate(editingItem.date);
      setTime(editingItem.time);
      setItems(editingItem.items);
      setQuantity(editingItem.quantity);
      setAmount(editingItem.amount);
      setCategory(editingItem.category);
      setPurpose(editingItem.purpose);
      setNote(editingItem.note || '');
      setReceiptImage(editingItem.receiptImage || '');
      setParseNotice('수정할 항목이 입력란에 로드되었습니다.');
    }
  }, [editingItem]);

  // 1. 간단 텍스트 파싱 적용 (예: "강원건재 15만원")
  const handleQuickTextParse = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!quickInput.trim()) return;

    const parsed = parseQuickText(quickInput);
    setStoreName(parsed.storeName);
    setDate(parsed.date);
    setTime(parsed.time);
    setItems(parsed.items);
    setQuantity(parsed.quantity);
    setAmount(parsed.amount);
    setCategory(parsed.category);
    setPurpose(parsed.purpose);
    setNote(parsed.note);

    setParseNotice(`"${quickInput}" → 자동 파싱 완료! 아래에서 수정 후 저장하세요.`);
  };

  // 2. 영수증 이미지 압축 및 OCR 파싱 시뮬레이션
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 이미지 압축 로직 (Canvas 이용)
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const MAX_SIZE = 1200; // 해상도는 충분히 확인 가능하도록 1200px 제한

        if (width > height) {
          if (width > MAX_SIZE) {
            height = Math.round((height * MAX_SIZE) / width);
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width = Math.round((width * MAX_SIZE) / height);
            height = MAX_SIZE;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, width, height);

        // JPEG 85% 품질로 압축 (용량 감소하면서 화질 보존)
        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
        setReceiptImage(compressedDataUrl);

        // 모바일 호환성을 위해 fetch 대신 수동으로 base64 변환 후 Blob 추출
        try {
          const byteString = atob(compressedDataUrl.split(',')[1]);
          const mimeString = compressedDataUrl.split(',')[0].split(':')[1].split(';')[0];
          const ab = new ArrayBuffer(byteString.length);
          const ia = new Uint8Array(ab);
          for (let i = 0; i < byteString.length; i++) {
            ia[i] = byteString.charCodeAt(i);
          }
          const blob = new Blob([ab], { type: mimeString });
          const compressedFile = new File(
            [blob],
            `compressed_${file.name.replace(/\.[^/.]+$/, '')}.jpg`,
            { type: 'image/jpeg' }
          );
          setReceiptFile(compressedFile);
        } catch (compressError) {
          // 압축 실패 시 원본 파일이라도 저장
          console.warn('이미지 압축 실패, 원본 사용:', compressError);
          setReceiptFile(file);
        }

        // OCR 파싱 시뮬레이션
        const parsed = parseReceiptImageSimulation(file.name);
        setStoreName(parsed.storeName);
        setDate(parsed.date);
        setTime(parsed.time);
        setItems(parsed.items);
        setQuantity(parsed.quantity);
        setAmount(parsed.amount);
        setCategory(parsed.category);
        setPurpose(parsed.purpose);
        setNote(parsed.note);
        setParseNotice('영수증 이미지를 압축하여 첨부했습니다.');
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // 3. 폼 초기화
  const resetForm = () => {
    setQuickInput('');
    setStoreName('');
    setDate(new Date().toISOString().split('T')[0]);
    setTime('12:00');
    setItems('');
    setQuantity(1);
    setAmount('');
    setCategory('시설/건재/자재');
    setPurpose('');
    setNote('');
    setReceiptImage('');
    setReceiptFile(null);
    setParseNotice(null);
  };

  // 4. 저장하기 처리
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!storeName.trim()) {
      alert('장소(상호명)를 입력해주세요.');
      return;
    }
    if (!amount || Number(amount) <= 0) {
      alert('올바른 사용 금액을 입력해주세요.');
      return;
    }

    setIsUploading(true);
    try {
      let finalImageUrl = receiptImage;

      // 새로 등록한 파일이 있다면 Supabase Storage에 업로드 시도
      if (receiptFile) {
        const uploadedUrl = await uploadReceiptImage(receiptFile);
        if (uploadedUrl) {
          // Storage 업로드 성공
          finalImageUrl = uploadedUrl;
        }
        // uploadedUrl이 null이면 receiptImage(압축된 base64)를 그대로 사용
      }

      onSaveExpense({
        storeName: storeName.trim(),
        date,
        time,
        items: items.trim() || `${storeName} 결제 내역`,
        quantity: Number(quantity) || 1,
        amount: Number(amount),
        category,
        purpose: purpose.trim() || '법인카드 사용 목적 기입',
        note: note.trim(),
        receiptImage: finalImageUrl || undefined
      });

      resetForm();
      if (onCancelEdit) onCancelEdit();
    } catch (err) {
      console.error(err);
      alert('저장 중 오류가 발생했습니다.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="expense-form-container glass-card p-5 rounded-2xl mb-10">
      {/* 헤더 */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl text-white shadow-md">
          <Camera className="w-5 h-5" />
        </div>
        <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
          결제 내역 등록
          {editingItem && <span className="px-2 py-0.5 text-xs bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-full">수정 중</span>}
        </h2>
      </div>

      {/* 빠른 파싱 + 영수증 업로드를 가로 2열로 배치 */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {/* 좌: 빠른 자동 파싱 */}
        <div className="bg-slate-800/60 p-3 rounded-xl">
          <label className="text-[10px] uppercase tracking-wider font-bold text-amber-400/90 mb-2 flex items-center gap-1.5">
            <Sparkles className="w-3 h-3" />
            빠른 파싱
          </label>
          <input
            type="text"
            value={quickInput}
            onChange={(e) => setQuickInput(e.target.value)}
            placeholder="강원건재 15만원"
            className="input-field w-full text-xs mb-2"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleQuickTextParse();
              }
            }}
          />
          <button
            type="button"
            onClick={() => handleQuickTextParse()}
            disabled={!quickInput.trim()}
            className="w-full btn-primary bg-gradient-to-r from-amber-500/80 to-rose-500/80 border-none text-white text-xs py-2 rounded-lg disabled:opacity-40 font-semibold"
          >
            <Sparkles className="w-3 h-3 mr-1" />
            적용
          </button>
        </div>

        {/* 우: 영수증 업로드 */}
        <div
          className={`p-3 rounded-xl cursor-pointer flex flex-col items-center justify-center transition-all ${
            receiptImage
              ? 'bg-emerald-500/10 border border-emerald-500/30'
              : 'bg-slate-800/60 hover:bg-slate-700/60'
          }`}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            onChange={handleImageUpload}
            className="hidden"
          />
          {receiptImage ? (
            <div className="relative w-full flex flex-col items-center">
              <img
                src={receiptImage}
                alt="영수증"
                className="max-h-12 max-w-[80%] object-contain rounded mb-1"
              />
              <span className="text-[10px] text-emerald-300 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> 첨부됨
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setReceiptImage('');
                  setReceiptFile(null);
                }}
                className="text-[10px] text-rose-400 mt-1 hover:underline"
              >
                삭제
              </button>
            </div>
          ) : (
            <>
              <Upload className="w-6 h-6 text-cyan-400 mb-1" />
              <span className="text-[11px] font-semibold text-slate-300">영수증 업로드</span>
            </>
          )}
        </div>
      </div>

      {/* 파싱 결과 안내 */}
      {parseNotice && (
        <div className="mb-5 p-2.5 bg-emerald-500/10 rounded-lg flex items-center gap-2 text-xs text-emerald-300">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span>{parseNotice}</span>
        </div>
      )}

      {/* 폼 입력란 - 모바일 2열 배치 */}
      <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-x-3 gap-y-4">
        {/* 장소 */}
        <div>
          <label className="field-label required">장소</label>
          <input type="text" required className="input-field" placeholder="강원건재" value={storeName} onChange={(e) => setStoreName(e.target.value)} />
        </div>

        {/* 금액 */}
        <div>
          <label className="field-label required">금액 (원)</label>
          <input type="number" required min="0" step="100" className="input-field font-semibold text-cyan-300" placeholder="150000" value={amount} onChange={(e) => setAmount(e.target.value ? Number(e.target.value) : '')} />
        </div>

        {/* 날짜 */}
        <div>
          <label className="field-label required">날짜</label>
          <input type="date" required className="input-field" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>

        {/* 시간 */}
        <div>
          <label className="field-label">시간</label>
          <input type="time" className="input-field" value={time} onChange={(e) => setTime(e.target.value)} />
        </div>

        {/* 품목 */}
        <div>
          <label className="field-label">품목</label>
          <input type="text" className="input-field" placeholder="타일, 오일" value={items} onChange={(e) => setItems(e.target.value)} />
        </div>

        {/* 수량 */}
        <div>
          <label className="field-label">수량</label>
          <input type="number" min="1" className="input-field" value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} />
        </div>

        {/* 카테고리 */}
        <div>
          <label className="field-label required">카테고리</label>
          <select className="input-field bg-slate-900 text-slate-100" value={category} onChange={(e) => setCategory(e.target.value as ExpenseCategory)}>
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        {/* 비고 */}
        <div>
          <label className="field-label">비고</label>
          <input type="text" className="input-field" placeholder="메모" value={note} onChange={(e) => setNote(e.target.value)} />
        </div>

        {/* 사용 목적 - 전체 너비 */}
        <div className="col-span-2">
          <label className="field-label required">사용 목적 (보고용)</label>
          <input type="text" required className="input-field" placeholder="스파 샤워실 타일 보수 공사 자재 구매" value={purpose} onChange={(e) => setPurpose(e.target.value)} />
        </div>

        {/* 버튼 영역 */}
        <div className="col-span-2 flex items-center justify-between gap-3 pt-4 mt-2">
          <button
            type="button"
            onClick={resetForm}
            className="btn-secondary px-4 py-2 rounded-full text-xs font-semibold text-slate-400 hover:text-slate-200"
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
            초기화
          </button>
          
          <div className="flex items-center gap-2">
            {editingItem && (
              <button type="button" onClick={onCancelEdit} className="btn-secondary px-4 py-2 rounded-full text-xs font-semibold">
                취소
              </button>
            )}
            <button
              type="submit"
              disabled={isUploading}
              className={`btn-primary shadow-glow px-6 py-2.5 rounded-full text-xs font-bold ${isUploading ? 'opacity-70 cursor-wait' : ''}`}
            >
              <Save className="w-3.5 h-3.5 mr-1.5" />
              {isUploading ? '저장 중...' : (editingItem ? '수정 저장' : '저장')}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
