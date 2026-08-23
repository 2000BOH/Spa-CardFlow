import React, { useState, useRef, useEffect } from 'react';
import type { ExpenseCategory, ExpenseItem } from '../types/expense';
import { parseQuickText, parseRealReceiptImage } from '../utils/ocrParser';
import { uploadReceiptImage } from '../api/expenseApi';
import { Camera, Sparkles, Save, RotateCcw, Upload, CheckCircle2, Loader2 } from 'lucide-react';

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

export const ExpenseForm: React.FC<ExpenseFormProps> = ({ onSaveExpense, editingItem, onCancelEdit }) => {
  const [quickInput, setQuickInput] = useState('');
  
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
  const [isOcrProcessing, setIsOcrProcessing] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingItem) {
      setStoreName(editingItem.storeName); setDate(editingItem.date); setTime(editingItem.time);
      setItems(editingItem.items); setQuantity(editingItem.quantity); setAmount(editingItem.amount);
      setCategory(editingItem.category); setPurpose(editingItem.purpose); setNote(editingItem.note || '');
      setReceiptImage(editingItem.receiptImage || '');
      setParseNotice('수정할 항목이 로드되었습니다.');
    }
  }, [editingItem]);

  const handleQuickTextParse = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!quickInput.trim()) return;
    const p = parseQuickText(quickInput);
    setStoreName(p.storeName); setDate(p.date); setTime(p.time); setItems(p.items);
    setQuantity(p.quantity); setAmount(p.amount); setCategory(p.category); setPurpose(p.purpose); setNote(p.note);
    setParseNotice(`"${quickInput}" → 자동 적용 완료!`);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 1. 이미지 압축 (로컬 저장용)
    const reader = new FileReader();
    reader.onload = async (event) => {
      const img = new Image();
      img.onload = async () => {
        const canvas = document.createElement('canvas');
        let width = img.width; let height = img.height; const MAX_SIZE = 1200;
        if (width > height) {
          if (width > MAX_SIZE) { height = Math.round(height * MAX_SIZE / width); width = MAX_SIZE; }
        } else {
          if (height > MAX_SIZE) { width = Math.round(width * MAX_SIZE / height); height = MAX_SIZE; }
        }
        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, width, height);
        
        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
        setReceiptImage(compressedDataUrl);
        setReceiptFile(file);

        // 2. 찐(Real) OCR 분석 시작
        setIsOcrProcessing(true);
        setParseNotice('AI가 영수증의 글씨를 읽고 있습니다... (3~5초 소요)');
        
        try {
          const p = await parseRealReceiptImage(compressedDataUrl);
          
          if (p.amount > 0) setAmount(p.amount);
          if (p.storeName) setStoreName(p.storeName);
          setParseNotice('AI 분석 완료! 빈칸을 확인해주세요.');
        } catch (err) {
          setParseNotice('영수증 분석에 실패했습니다. 직접 입력해주세요.');
        } finally {
          setIsOcrProcessing(false);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const resetForm = () => {
    setQuickInput(''); setStoreName(''); setDate(new Date().toISOString().split('T')[0]); setTime('12:00');
    setItems(''); setQuantity(1); setAmount(''); setCategory('시설/건재/자재'); setPurpose(''); setNote('');
    setReceiptImage(''); setReceiptFile(null); setParseNotice(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeName.trim() || !amount || Number(amount) <= 0) {
      alert('상호명과 금액을 정확히 입력해주세요.'); return;
    }
    setIsUploading(true);
    try {
      let finalImageUrl = receiptImage;
      if (receiptFile) {
        const uploadedUrl = await uploadReceiptImage(receiptFile);
        if (uploadedUrl) finalImageUrl = uploadedUrl;
      }
      onSaveExpense({
        storeName: storeName.trim(), date, time,
        items: items.trim() || `${storeName} 결제 내역`, quantity: Number(quantity) || 1, amount: Number(amount),
        category, purpose: purpose.trim() || '법인카드 사용 목적 기입', note: note.trim(),
        receiptImage: finalImageUrl || undefined
      });
      resetForm();
      if (onCancelEdit) onCancelEdit();
    } catch (err) {
      console.error(err);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="expense-form-container glass-card p-6 mb-10 border-t-4 border-t-blue-500 bg-white">
      {/* 헤더 */}
      <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
        <div className="p-2.5 bg-blue-50 rounded-xl text-blue-600">
          <Camera className="w-5 h-5" />
        </div>
        <h2 className="text-lg font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
          결제 내역 등록
          {editingItem && <span className="px-2 py-0.5 text-xs bg-orange-100 text-orange-600 rounded-full font-bold">수정 중</span>}
        </h2>
      </div>

      {/* 빠른 파싱 + 영수증 업로드를 가로 2열로 배치 */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
          <label className="text-[11px] font-bold text-slate-500 mb-2.5 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-blue-500" />
            빠른 텍스트 입력
          </label>
          <input
            type="text"
            value={quickInput}
            onChange={(e) => setQuickInput(e.target.value)}
            placeholder="예: 스타벅스 3만원"
            className="input-field w-full text-xs mb-3 bg-white"
            onKeyDown={(e) => e.key === 'Enter' && handleQuickTextParse(e)}
          />
          <button
            type="button"
            onClick={() => handleQuickTextParse()}
            disabled={!quickInput.trim()}
            className="w-full btn-primary bg-blue-600 py-2.5 rounded-xl disabled:opacity-40"
          >
            적용하기
          </button>
        </div>

        <div
          className={`p-4 rounded-2xl cursor-pointer flex flex-col items-center justify-center transition-all ${
            receiptImage ? 'bg-blue-50 border border-blue-200' : 'bg-slate-50 border border-dashed border-slate-300 hover:border-blue-400'
          }`}
          onClick={() => !isOcrProcessing && fileInputRef.current?.click()}
        >
          <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageUpload} className="hidden" />
          
          {isOcrProcessing ? (
            <div className="flex flex-col items-center">
              <Loader2 className="w-7 h-7 text-blue-500 animate-spin mb-2" />
              <span className="text-[11px] font-bold text-blue-600">AI 분석 중...</span>
            </div>
          ) : receiptImage ? (
            <div className="relative w-full flex flex-col items-center">
              <img src={receiptImage} alt="영수증" className="max-h-12 max-w-[80%] object-contain rounded-lg mb-2 shadow-sm" />
              <span className="text-[11px] text-blue-600 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> 스캔 완료
              </span>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setReceiptImage(''); setReceiptFile(null); setParseNotice(null); }}
                className="text-[10px] text-slate-400 mt-1 hover:text-red-500"
              >
                다시 올리기
              </button>
            </div>
          ) : (
            <>
              <Upload className="w-7 h-7 text-slate-400 mb-2" />
              <span className="text-[12px] font-bold text-slate-600">영수증 촬영/업로드</span>
            </>
          )}
        </div>
      </div>

      {parseNotice && (
        <div className="mb-6 p-3 bg-blue-50 rounded-xl flex items-center gap-2 text-xs font-semibold text-blue-700 border border-blue-100">
          {isOcrProcessing ? <Loader2 className="w-4 h-4 animate-spin shrink-0" /> : <Sparkles className="w-4 h-4 shrink-0" />}
          <span>{parseNotice}</span>
        </div>
      )}

      {/* 폼 입력란 */}
      <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-5 w-full overflow-hidden">
        <div><label className="field-label required">결제처 (상호)</label><input type="text" required className="input-field" placeholder="강원건재" value={storeName} onChange={(e) => setStoreName(e.target.value)} /></div>
        <div><label className="field-label required">결제 금액 (원)</label><input type="number" required min="0" step="10" className="input-field font-extrabold text-blue-600 text-lg" placeholder="150000" value={amount} onChange={(e) => setAmount(e.target.value ? Number(e.target.value) : '')} /></div>
        <div><label className="field-label required">날짜</label><input type="date" required className="input-field" value={date} onChange={(e) => setDate(e.target.value)} /></div>
        <div><label className="field-label">시간</label><input type="time" className="input-field" value={time} onChange={(e) => setTime(e.target.value)} /></div>
        <div><label className="field-label">구매 품목</label><input type="text" className="input-field" placeholder="타일, 오일 등" value={items} onChange={(e) => setItems(e.target.value)} /></div>
        <div><label className="field-label required">분류</label>
          <select className="input-field bg-white" value={category} onChange={(e) => setCategory(e.target.value as ExpenseCategory)}>
            {CATEGORIES.map((cat) => (<option key={cat} value={cat}>{cat}</option>))}
          </select>
        </div>
        <div className="sm:col-span-2"><label className="field-label required">상세 사용 목적 (보고서용)</label><input type="text" required className="input-field" placeholder="스파 샤워실 보수 공사 자재 구매" value={purpose} onChange={(e) => setPurpose(e.target.value)} /></div>
        <div className="sm:col-span-2"><label className="field-label">비고 메모</label><input type="text" className="input-field" placeholder="추가 메모사항" value={note} onChange={(e) => setNote(e.target.value)} /></div>

        <div className="sm:col-span-2 flex flex-wrap items-center justify-between gap-3 pt-6 mt-2 border-t border-slate-100">
          <button type="button" onClick={resetForm} className="btn-secondary px-5 py-2.5 rounded-xl text-xs font-bold text-slate-500 bg-white">
            <RotateCcw className="w-4 h-4 mr-1.5" /> 전체 지우기
          </button>
          
          <div className="flex items-center gap-2">
            {editingItem && <button type="button" onClick={onCancelEdit} className="btn-secondary px-5 py-2.5 rounded-xl text-xs font-bold bg-white">취소</button>}
            <button type="submit" disabled={isUploading || isOcrProcessing} className={`btn-primary px-8 py-3 rounded-xl text-sm font-extrabold ${isUploading ? 'opacity-70 cursor-wait' : ''}`}>
              <Save className="w-4 h-4 mr-2" />
              {isUploading ? '저장하는 중...' : (editingItem ? '수정 내용 저장' : '등록 완료')}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
