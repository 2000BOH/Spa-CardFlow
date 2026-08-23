import React from 'react';
import { Home, List, PlusCircle, FileText } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type TabKey = 'home' | 'list' | 'add' | 'report';

interface BottomTabsProps {
  tab: TabKey;
  onChange: (tab: TabKey) => void;
}

const TABS: { key: TabKey; label: string; Icon: LucideIcon }[] = [
  { key: 'home', label: '홈', Icon: Home },
  { key: 'list', label: '내역', Icon: List },
  { key: 'add', label: '등록', Icon: PlusCircle },
  { key: 'report', label: '보고서', Icon: FileText }
];

export const BottomTabs: React.FC<BottomTabsProps> = ({ tab, onChange }) => (
  <nav
    className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-line bg-white/95 backdrop-blur-md cb-no-print"
    style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
  >
    <div className="grid grid-cols-4">
      {TABS.map(({ key, label, Icon }) => {
        const on = tab === key;
        return (
          <button
            key={key}
            type="button"
            onClick={() => onChange(key)}
            aria-current={on ? 'page' : undefined}
            className="h-[58px] flex flex-col items-center justify-center gap-[3px] bg-transparent border-none cursor-pointer"
            style={{ color: on ? '#0052ff' : '#5b616e' }}
          >
            <Icon className="w-[22px] h-[22px]" strokeWidth={on ? 2.4 : 1.8} />
            <span className="text-[12px] font-medium tracking-tight">{label}</span>
          </button>
        );
      })}
    </div>
  </nav>
);
