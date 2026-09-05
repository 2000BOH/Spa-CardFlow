import React, { useState, useRef, useEffect } from 'react';
import type { ExpenseCategory, ExpenseItem, DirectedBy } from '../types/expense';
import { parseRealReceiptImage } from '../utils/ocrParser';
import { uploadReceiptImage } from '../api/expenseApi';
import { Camera, Info, Loader2, Trash2 } from 'lucide-react';

import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

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
  const [directedBy, setDirectedBy] = useState<DirectedBy>('none');

  const [notice, setNotice] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isOcr, setIsOcr] = useState(false);
  const [isZoomModalOpen, setIsZoomModalOpen] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isReceiptExpanded, setIsReceiptExpanded] = useState(true);

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
    setDirectedBy(editingItem.directedBy ?? 'none');
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
    setDirectedBy('none');
    setNotice(null);
  };

  const processOcr = async (ocrDataUrl: string) => {
    setIsOcr(true);
    setNotice('영수증 텍스트를 자동 분석 중입니다…');
    try {
      const parsed = await parseRealReceiptImage(ocrDataUrl);
      if (parsed.amount > 0) setAmount(String(parsed.amount));
      if (parsed.storeName) setStoreName(parsed.storeName);
      if (parsed.date) setDate(parsed.date);
      setNotice('✨ 영수증 자동 인식이 완료되었습니다! 아래 영수증 화면을 보면서 내용을 확인해 주세요.');
    } catch {
      setNotice('💡 영수증 문자가 불명확하여 자동 추출되지 않았습니다. 상단 이미지를 보면서 직접 입력해 주세요.');
    } finally {
      setIsOcr(false);
    }
  };

  const handleImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type === 'application/pdf') {
      setIsOcr(true);
      setNotice('PDF 파일을 분석 중입니다…');
      try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const page = await pdf.getPage(1);
        const viewport = page.getViewport({ scale: 2.0 });
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Canvas 2D context error');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        await page.render({ canvasContext: ctx, viewport } as any).promise;
        const pdfImageUrl = canvas.toDataURL('image/jpeg', 0.9);

        setReceiptImage(pdfImageUrl);
        setReceiptFile(file);
        setIsReceiptExpanded(true);
        await processOcr(pdfImageUrl);
      } catch (err) {
        console.error(err);
        setNotice('💡 PDF 파일을 읽을 수 없습니다.');
        setIsOcr(false);
      }
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const rawUrl = event.target?.result as string;
      setReceiptImage(rawUrl);
      setReceiptFile(file);
      setIsReceiptExpanded(true);

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

        const imgData = ctx.getImageData(0, 0, w, h);
        const data = imgData.data;
        for (let i = 0; i < data.length; i += 4) {
          const brightness = 0.34 * data[i] + 0.5 * data[i + 1] + 0.16 * data[i + 2];
          const contrast = brightness > 120 ? 255 : 0;
          data[i] = contrast;
          data[i + 1] = contrast;
          data[i + 2] = contrast;
        }
        ctx.putImageData(imgData, 0, 0);

        const ocrDataUrl = canvas.toDataURL('image/jpeg', 0.85);
        await processOcr(ocrDataUrl);
      };
      img.src = rawUrl;
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
        receiptImage: finalImage || undefined,
        directedBy
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
          accept="image/*,application/pdf"
          ref={galleryInputRef}
          onChange={handleImage}
          style={{ display: 'none' }}
        />

        <div className="sc-stack">
          {receiptImage ? (
            <div 
              style={{
                background: '#f8fafc',
                border: '1.5px solid #cbd5e1',
                borderRadius: '12px',
                padding: '12px',
                marginBottom: '8px'
              }}
            >
              {/* 영수증 뷰어 툴바 */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>📄 첨부 영수증 원본</span>
                  <span style={{ fontSize: '12px', color: '#64748b', background: '#e2e8f0', padding: '2px 6px', borderRadius: '4px' }}>
                    {isOcr ? '분석중' : '입력참고용'}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    type="button"
                    onClick={() => setIsZoomModalOpen(true)}
                    style={{
                      background: '#0284c7',
                      color: '#ffffff',
                      border: 'none',
                      padding: '4px 10px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    🔍 크게 확대해서 보기
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsReceiptExpanded(!isReceiptExpanded)}
                    style={{
                      background: '#e2e8f0',
                      color: '#334155',
                      border: 'none',
                      padding: '4px 8px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    {isReceiptExpanded ? '▲ 접기' : '▼ 펼치기'}
                  </button>
                  <button
                    type="button"
                    className="sc-icon-btn"
                    aria-label="영수증 삭제"
                    onClick={() => {
                      setReceiptImage('');
                      setReceiptFile(null);
                    }}
                    style={{ color: '#ef4444' }}
                  >
                    <Trash2 size={16} strokeWidth={1.8} />
                  </button>
                </div>
              </div>

              {/* 영수증 프리뷰 영상 영역 */}
              {isReceiptExpanded && (
                <div 
                  style={{
                    position: 'relative',
                    maxHeight: '360px',
                    overflowY: 'auto',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    background: '#000000',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    cursor: 'pointer'
                  }}
                  onClick={() => setIsZoomModalOpen(true)}
                  title="클릭 시 화면 확대"
                >
                  <img 
                    src={receiptImage} 
                    alt="영수증 원본" 
                    style={{
                      maxWidth: '100%',
                      maxHeight: '350px',
                      objectFit: 'contain',
                      borderRadius: '4px'
                    }}
                  />
                  <div 
                    style={{
                      position: 'absolute',
                      bottom: '8px',
                      right: '8px',
                      background: 'rgba(0,0,0,0.7)',
                      color: '#ffffff',
                      fontSize: '11px',
                      padding: '3px 8px',
                      borderRadius: '4px',
                      pointerEvents: 'none'
                    }}
                  >
                    🔍 터치 시 전체화면 확대
                  </div>
                </div>
              )}
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
                    파일 선택
                  </span>
                  <span className="sc-dashed-sub" style={{ display: 'block' }}>
                    사진 및 PDF 첨부
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

          {/* 임원 지시 사용 구분 */}
          <div>
            <label className="sc-label">사용 구분</label>
            <div className="sc-chips-wrap">
              <button
                type="button"
                onClick={() => setDirectedBy('none')}
                className={directedBy === 'none' ? 'sc-chip sc-chip-blue' : 'sc-chip'}
              >
                일반 사용
              </button>
              <button
                type="button"
                onClick={() => setDirectedBy('ceo')}
                className={directedBy === 'ceo' ? 'sc-chip sc-chip-directed sc-chip-directed-ceo' : 'sc-chip'}
              >
                🏢 대표님 지시
              </button>
              <button
                type="button"
                onClick={() => setDirectedBy('chairman')}
                className={directedBy === 'chairman' ? 'sc-chip sc-chip-directed sc-chip-directed-chairman' : 'sc-chip'}
              >
                👔 회장님 지시
              </button>
            </div>
            {directedBy !== 'none' && (
              <div className="sc-directed-notice">
                ⚡ 임원 지시 사용은 개인 한도(30만 원)에 포함되지 않으며, 보고서에 별도 표기됩니다.
              </div>
            )}
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

      {/* 영수증 원본 전체화면 확대 모달 */}
      {isZoomModalOpen && receiptImage && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            zIndex: 99999,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '16px'
          }}
          onClick={() => setIsZoomModalOpen(false)}
        >
          {/* 모달 상단 헤더 */}
          <div 
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              color: '#ffffff',
              zIndex: 100000
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <span style={{ fontSize: '16px', fontWeight: 700 }}>🔍 영수증 원본 크게 보기</span>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button
                type="button"
                onClick={() => setZoomLevel(prev => Math.max(0.8, prev - 0.3))}
                style={{ background: '#334155', color: '#fff', border: 'none', width: '32px', height: '32px', borderRadius: '50%', fontSize: '16px', fontWeight: 700 }}
              >
                -
              </button>
              <span style={{ fontSize: '13px', color: '#cbd5e1' }}>{Math.round(zoomLevel * 100)}%</span>
              <button
                type="button"
                onClick={() => setZoomLevel(prev => Math.min(3, prev + 0.3))}
                style={{ background: '#334155', color: '#fff', border: 'none', width: '32px', height: '32px', borderRadius: '50%', fontSize: '16px', fontWeight: 700 }}
              >
                +
              </button>
              <button
                type="button"
                onClick={() => setZoomLevel(1)}
                style={{ background: '#475569', color: '#fff', border: 'none', padding: '4px 10px', borderRadius: '6px', fontSize: '12px' }}
              >
                초기화
              </button>
              <button
                type="button"
                onClick={() => setIsZoomModalOpen(false)}
                style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '6px 14px', borderRadius: '6px', fontSize: '14px', fontWeight: 700, marginLeft: '8px' }}
              >
                ✕ 닫기
              </button>
            </div>
          </div>

          {/* 이미지 영역 */}
          <div 
            style={{
              flex: 1,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              overflow: 'auto',
              margin: '16px 0'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <img 
              src={receiptImage} 
              alt="영수증 원본 확대" 
              style={{
                transform: `scale(${zoomLevel})`,
                transition: 'transform 0.15s ease-out',
                maxWidth: '90%',
                maxHeight: '85vh',
                objectFit: 'contain',
                borderRadius: '8px',
                boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
              }}
            />
          </div>

          <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
            💡 영수증 세부내역(상호명, 결제금액, 품목 등)을 확인하시면서 폼에 직접 입력해 주세요. (바깥 영역 터치 시 닫힘)
          </div>
        </div>
      )}
    </div>
  );
};

