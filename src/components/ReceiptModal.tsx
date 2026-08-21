import React from 'react';
import { X } from 'lucide-react';

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  title: string;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  isOpen,
  onClose,
  imageUrl,
  title
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-lg w-full p-5 shadow-2xl flex flex-col items-center">
        <div className="flex justify-between items-center w-full pb-3 border-b border-slate-700/60 mb-4">
          <h4 className="font-bold text-slate-100 text-sm flex items-center gap-2">
            🧾 {title || '영수증 원본'}
          </h4>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="w-full flex justify-center bg-slate-950 p-3 rounded-xl border border-slate-800 mb-4 max-h-[60vh] overflow-auto">
          <img src={imageUrl} alt={title} className="max-w-full h-auto rounded-lg object-contain" />
        </div>

        <div className="flex justify-end w-full">
          <button
            onClick={onClose}
            className="btn-secondary text-xs px-4 py-2"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};
