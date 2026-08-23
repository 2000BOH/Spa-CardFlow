import React from 'react';
import { X } from 'lucide-react';

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  title: string;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ isOpen, onClose, imageUrl, title }) => {
  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[10000] flex flex-col items-center justify-center gap-5 p-6 bg-[rgba(10,11,13,0.88)] cb-no-print"
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="닫기"
        className="absolute top-5 right-5 w-11 h-11 flex items-center justify-center rounded-full bg-white/15 text-white border-none cursor-pointer"
      >
        <X className="w-5 h-5" />
      </button>

      <img
        src={imageUrl}
        alt={title}
        onClick={(e) => e.stopPropagation()}
        className="max-w-full max-h-[62%] object-contain rounded-xl"
      />

      <div className="text-[15px] text-white/70 text-center">{title || '영수증 원본'}</div>

      <button type="button" onClick={onClose} className="cb-btn h-[50px] px-7 bg-white text-ink">
        닫기
      </button>
    </div>
  );
};
