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
        {/* 로고 & 브랜딩 */}
        <div className="brand-box">
          <div className="logo-badge overflow-hidden p-0.5 border border-cyan-400/40">
            <img
              src="/logo.png"
              alt="Logo"
              className="w-full h-full object-cover rounded-xl"
            />
          </div>
          <div>
            <h1 className="brand-title">
              Spa <span className="title-highlight">CardFlow</span>
            </h1>
            <div className="text-[10px] text-slate-400">{today}</div>
          </div>
        </div>

        {/* 데스크톱 전용 보고서 버튼 */}
        <button
          onClick={onOpenReport}
          className="btn-primary report-btn shadow-glow hidden md:inline-flex text-xs"
        >
          <FileText className="w-4 h-4" />
          <span>보고서</span>
        </button>
      </div>
    </header>
  );
};
