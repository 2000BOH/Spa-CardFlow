import React from 'react';
import { FileText } from 'lucide-react';

interface HeaderProps {
  title: string;
  subtitle?: string;
  onOpenReport: () => void;
  /** 편집 중일 때 노출되는 취소 버튼 등 */
  rightSlot?: React.ReactNode;
}

export const Header: React.FC<HeaderProps> = ({ title, subtitle, onOpenReport, rightSlot }) => {
  const today =
    subtitle ??
    new Date().toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'short'
    });

  return (
    <header className="sc-header">
      <div className="sc-header-in">
        <div className="sc-brand">
          <img src="/logo.png" alt="블루오션 웰니스 스파" />
          <div style={{ minWidth: 0 }}>
            <div className="sc-brand-title">{title}</div>
            <div className="sc-brand-sub">{today}</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: '0 0 auto' }}>
          {rightSlot}
          <button
            type="button"
            onClick={onOpenReport}
            className="sc-btn sc-btn-primary sc-only-desktop"
          >
            <FileText size={18} strokeWidth={1.8} />
            결산 보고서
          </button>
        </div>
      </div>
    </header>
  );
};
