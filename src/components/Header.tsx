import React from 'react';
import { FileText } from 'lucide-react';

interface HeaderProps {
  onOpenReport: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenReport }) => {
  const today = new Date().toLocaleDateString('ko-KR', {
    month: 'long',
    day: 'numeric',
    weekday: 'short'
  });

  return (
    <header className="header-container">
      <div className="header-content">
        <div className="brand-box">
          <div className="logo-badge">
            <img
              src="/logo.png"
              alt="Logo"
              className="w-full h-full object-cover rounded-lg"
            />
          </div>
          <div>
            <h1 className="brand-title">
              Spa <span className="title-highlight">CardFlow</span>
            </h1>
            <div className="text-[11px] text-slate-500 font-medium">{today}</div>
          </div>
        </div>

        <button
          onClick={onOpenReport}
          className="btn-primary report-btn hidden md:inline-flex text-xs"
        >
          <FileText className="w-4 h-4" />
          <span>결산 보고서</span>
        </button>
      </div>
    </header>
  );
};
