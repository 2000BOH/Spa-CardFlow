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
  const [receiptImage, setReceiptImage] = useState<string>(''); // 기존 URL 또는 Base64 미리보기
  const [receiptFile, setReceiptFile] = useState<File | null>(null); // 실제 업로드할 파일

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

    setParseNotice(`" ${quickInput} " 문장에서 장소, 금액, 품목 정보가 파싱되어 아래 입력란에 채워졌습니다! 수정 후 저장하세요.`);
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
        const byteString = atob(compressedDataUrl.split(',')[1]);
        const mimeString = compressedDataUrl.split(',')[0].split(':')[1].split(';')[0];
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);
        for (let i = 0; i < byteString.length; i++) {
            ia[i] = byteString.charCodeAt(i);
        }
        const blob = new Blob([ab], { type: mimeString });
        
        const compressedFile = new File([blob], `compressed_${file.name.replace(/\.[^/.]+$/, "")}.jpg`, { type: 'image/jpeg' });
        setReceiptFile(compressedFile);

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
        setParseNotice(`영수증 이미지를 자동 압축하여 업로드 준비를 마쳤습니다! 지출 정보가 추출되었습니다.`);
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
      
      // 새로 등록한 파일이 있다면 Supabase Storage에 업로드
      if (receiptFile) {
        const uploadedUrl = await uploadReceiptImage(receiptFile);
        if (uploadedUrl) {
          finalImageUrl = uploadedUrl;
        }
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
    <div className="expense-form-container glass-card p-6 rounded-2xl mb-8">
      <div className="form-header flex items-center justify-between pb-4 border-b border-slate-700/60 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl text-white shadow-md">
            <Camera className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              결제 내역 등록
              {editingItem && <span className="px-2 py-0.5 text-xs bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-full">수정 중</span>}
            </h2>
          </div>
        </div>
      </div>

      {/* 스마트 텍스트 파싱 입력 바 */}
      <div className="relative mb-8 bg-gradient-to-br from-slate-800/80 to-slate-900/90 p-5 rounded-2xl border border-slate-700/50 shadow-lg backdrop-blur-sm">
        <label className="text-[11px] uppercase tracking-wider font-bold text-amber-400/90 mb-3 flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5" />
          빠른 자동 파싱 (입력만 하면 폼이 채워집니다)
        </label>
        <div className="flex flex-row items-center gap-2">
          <input
            type="text"
            value={quickInput}
            onChange={(e) => setQuickInput(e.target.value)}
            placeholder="예: 강원건재 15만원 샤워실 자재"
            className="input-field flex-1 bg-slate-950/50 border-slate-700 focus:border-amber-500/50 focus:ring-amber-500/20 text-sm"
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
            className="btn-primary bg-gradient-to-r from-amber-500/80 to-rose-500/80 hover:from-amber-500 hover:to-rose-500 border-none shadow-glow text-white px-4 py-2.5 rounded-xl disabled:opacity-50 font-semibold shrink-0"
          >
            <Sparkles className="w-4 h-4 mr-1.5" />
            적용
          </button>
        </div>
      </div>

      {/* 영수증 드래그 & 업로드 영역 */}
      <div className="mb-8">
        <input
          type="file"
          accept="image/*"
          ref={fileInputRef}
          onChange={handleImageUpload}
          className="hidden"
        />
        <div
          className={`relative group border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all duration-300 overflow-hidden ${
            receiptImage
              ? 'border-emerald-500/50 bg-emerald-500/5'
              : 'border-slate-700 bg-slate-800/30 hover:bg-slate-800/60 hover:border-cyan-500/50'
          }`}
          onClick={() => fileInputRef.current?.click()}
        >
          {receiptImage ? (
            <div className="relative w-full flex justify-center bg-slate-950/20 p-2 rounded-xl">
              <img src={receiptImage} alt="영수증 미리보기" className="max-h-24 object-contain rounded-lg shadow-md" />
              <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg backdrop-blur-sm">
                <span className="text-white font-semibold flex items-center gap-2">
                  <RotateCcw className="w-4 h-4" /> 사진 다시 선택
                </span>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setReceiptImage('');
                }}
                className="absolute top-2 right-2 bg-rose-500/80 hover:bg-rose-500 text-white text-xs px-2 py-1 rounded shadow-md z-10"
              >
                삭제
              </button>
            </div>
          ) : (
            <>
              <div className="w-14 h-14 bg-gradient-to-br from-cyan-500/20 to-emerald-500/20 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                <Upload className="w-7 h-7 text-cyan-400" />
              </div>
              <div className="text-center">
                <span className="text-sm font-bold text-slate-300">영수증 이미지 업로드</span>
                <p className="text-xs text-slate-500 mt-1.5 hidden sm:block">클릭하거나 사진을 촬영하세요</p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* 파싱 결과 안내 배너 */}
      {parseNotice && (
        <div className="mb-6 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center gap-2.5 text-xs text-emerald-300 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>{parseNotice}</span>
        </div>
      )}

      {/* 활성화된 Form 입력란 (수정/추가 가능) */}
      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 장소 (상호명) */}
        <div>
          <label className="field-label required">장소 (상호명)</label>
          <input
            type="text"
            required
            className="input-field"
            placeholder="예: 강원건재, 스타벅스"
            value={storeName}
            onChange={(e) => setStoreName(e.target.value)}
          />
        </div>

        {/* 날짜 */}
        <div>
          <label className="field-label required">결제 날짜</label>
          <input
            type="date"
            required
            className="input-field"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>

        {/* 시간 */}
        <div>
          <label className="field-label">결제 시간</label>
          <input
            type="time"
            className="input-field"
            value={time}
            onChange={(e) => setTime(e.target.value)}
          />
        </div>

        {/* 사용 금액 */}
        <div>
          <label className="field-label required">사용 금액 (원)</label>
          <input
            type="number"
            required
            min="0"
            step="100"
            className="input-field font-semibold text-cyan-300"
            placeholder="예: 150000"
            value={amount}
            onChange={(e) => setAmount(e.target.value ? Number(e.target.value) : '')}
          />
        </div>

        {/* 품목 */}
        <div>
          <label className="field-label">품목 명세</label>
          <input
            type="text"
            className="input-field"
            placeholder="예: 샤워실 보수 타일, 아로마 오일"
            value={items}
            onChange={(e) => setItems(e.target.value)}
          />
        </div>

        {/* 수량 */}
        <div>
          <label className="field-label">수량</label>
          <input
            type="number"
            min="1"
            className="input-field"
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
          />
        </div>

        {/* 사용처 / 카테고리 */}
        <div>
          <label className="field-label required">사용처 카테고리</label>
          <select
            className="input-field bg-slate-900 text-slate-100"
            value={category}
            onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
          >
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        {/* 비고 */}
        <div>
          <label className="field-label">비고 사항</label>
          <input
            type="text"
            className="input-field"
            placeholder="예: 카드 영수증 보관 완료"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>

        {/* 내용 (사용 목적) - 2칸 차지 */}
        <div className="md:col-span-2 lg:col-span-4">
          <label className="field-label required">사용 내용 & 상세 목적 (상급자 보고용)</label>
          <input
            type="text"
            required
            className="input-field"
            placeholder="예: 스파 3호실 샤워실 타일 보수 공사에 필요한 자재 구매 및 교체작업"
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
          />
        </div>

        {/* 폼 하단 저장 / 취소 버튼 */}
        <div className="md:col-span-2 lg:col-span-4 flex flex-col-reverse sm:flex-row sm:items-center justify-end gap-6 pt-6 mt-8">
          {editingItem && (
            <button
              type="button"
              onClick={onCancelEdit}
              className="btn-secondary px-5 py-2.5 rounded-full justify-center text-sm font-semibold"
            >
              수정 취소
            </button>
          )}
          <button
            type="button"
            onClick={resetForm}
            className="btn-secondary px-5 py-2.5 rounded-full justify-center text-slate-400 hover:text-slate-200 text-sm font-semibold"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            폼 초기화
          </button>

          <button
            type="submit"
            disabled={isUploading}
            className={`btn-primary shadow-glow px-8 py-3 rounded-full justify-center text-sm font-bold ${isUploading ? 'opacity-70 cursor-wait' : ''}`}
          >
            <Save className="w-4 h-4 mr-2" />
            {isUploading ? '업로드 중...' : (editingItem ? '수정사항 저장' : '법인카드 내역 저장')}
          </button>
        </div>
      </form>
    </div>
  );
};
