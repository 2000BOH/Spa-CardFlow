import React from 'react';
import { FileText, Sparkles, CreditCard, ShieldCheck } from 'lucide-react';

interface HeaderProps {
  onOpenReport: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenReport }) => {
  return (
    <header className="header-container">
      <div className="header-content">
        {/* 로고 & 브랜딩 */}
        <div className="brand-box">
          <div className="logo-badge overflow-hidden p-0.5 border border-cyan-400/40">
            <img 
              src="/logo.png" 
              alt="Spa CardFlow Logo" 
              className="w-full h-full object-cover rounded-xl"
            />
          </div>
          <div>
            <div className="brand-subtext flex items-center gap-1">
              <span>BLUE OCEAN WELLNESS SPA</span>
              <span className="px-1.5 py-0.2 bg-cyan-500/20 text-[10px] text-cyan-300 rounded border border-cyan-500/30">v1.0</span>
            </div>
            <h1 className="brand-title">
              Spa <span className="title-highlight">CardFlow</span>
            </h1>
          </div>
        </div>

        {/* 담당자 정보 및 보고서 액션 버튼 */}
        <div className="header-actions">
          <div className="user-profile-badge">
            <div className="card-badge">
              <CreditCard className="w-4 h-4 text-cyan-400" />
              <span>KB국민 [9821]</span>
            </div>
            <div className="user-info">
              <span className="user-name">김수현 실장 (운영총괄)</span>
              <span className="user-dept">투명 지출 관리 전담</span>
            </div>
          </div>

          <button 
            onClick={onOpenReport}
            className="btn-primary report-btn shadow-glow"
          >
            <FileText className="w-5 h-5" />
            <span>상급자 결산 보고서 생성</span>
            <Sparkles className="w-4 h-4 text-amber-300" />
          </button>
        </div>
      </div>

      {/* 서브 바 */}
      <div className="header-subbar">
        <div className="flex items-center gap-2 text-xs text-cyan-200">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>매월 15일 정기 상급자 결산 보고 준수 / 실시간 영수증 데이터 검증</span>
        </div>
        <div className="text-xs text-slate-300">
          오늘 기준: <strong className="text-cyan-300">{new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}</strong>
        </div>
      </div>
    </header>
  );
};
