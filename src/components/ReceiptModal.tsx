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
    <div className="sc-viewer sc-no-print" onClick={onClose}>
      <button type="button" className="sc-viewer-close" aria-label="닫기" onClick={onClose}>
        <X size={20} strokeWidth={2} />
      </button>

      <img src={imageUrl} alt={title} onClick={(e) => e.stopPropagation()} />

      <div className="sc-viewer-caption">{title || '영수증 원본'}</div>

      <button type="button" className="sc-btn sc-btn-white" onClick={onClose}>
        닫기
      </button>
    </div>
  );
};
