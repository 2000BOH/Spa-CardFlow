import React from 'react';
import { FileText } from 'lucide-react';

interface HeaderProps {
  title: string;
  onOpenReport: () => void;
  rightSlot?: React.ReactNode;
}

export const Header: React.FC<HeaderProps> = ({ title, onOpenReport, rightSlot }) => {
  const today = new Date().toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short'
  });

  return (
    <header className="sticky top-0 z-40 bg-white/92 backdrop-blur-md border-b border-line">
      <div className="mx-auto max-w-page px-5 md:px-8 h-[60px] md:h-[76px] flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <img
            src="/logo.png"
            alt="블루오션 웰니스 스파"
            className="w-8 h-8 md:w-9 md:h-9 rounded-lg object-cover shrink-0"
          />
          <div className="min-w-0">
            <div className="text-[16px] md:text-[17px] font-bold tracking-tight leading-tight truncate">
              {title}
            </div>
            <div className="text-[12px] md:text-[13px] text-muted leading-tight mt-0.5 truncate">
              {today}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {rightSlot}
          <button
            type="button"
            onClick={onOpenReport}
            className="cb-btn cb-btn-primary hidden md:inline-flex h-11 px-6 text-[15px]"
          >
            <FileText className="w-[18px] h-[18px]" />
            결산 보고서
          </button>
        </div>
      </div>
    </header>
  );
};
