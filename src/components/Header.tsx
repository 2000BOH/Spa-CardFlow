import React from 'react';
import { FileText, Cloud, CloudOff } from 'lucide-react';
import { isSupabaseConfigured } from '../utils/supabase';

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
          <img src="/logo.svg" alt="블루오션 웰니스 스파" />
          <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <div className="sc-brand-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {title}
              {isSupabaseConfigured ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: '2px', fontSize: '10px', color: '#10b981', background: '#ecfdf5', padding: '2px 6px', borderRadius: '12px' }}>
                  <Cloud size={10} /> 연동중
                </span>
              ) : (
                <span style={{ display: 'flex', alignItems: 'center', gap: '2px', fontSize: '10px', color: '#ef4444', background: '#fef2f2', padding: '2px 6px', borderRadius: '12px' }}>
                  <CloudOff size={10} /> 오프라인 (연결안됨)
                </span>
              )}
            </div>
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
