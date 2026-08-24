import React from 'react';
import { Home, List, PlusCircle, FileText } from 'lucide-react';

export type TabKey = 'home' | 'list' | 'add' | 'report';

interface BottomTabsProps {
  tab: TabKey;
  onChange: (tab: TabKey) => void;
}

const TABS = [
  { key: 'home' as const, label: '홈', Icon: Home },
  { key: 'list' as const, label: '내역', Icon: List },
  { key: 'add' as const, label: '등록', Icon: PlusCircle },
  { key: 'report' as const, label: '보고서', Icon: FileText }
];

export const BottomTabs: React.FC<BottomTabsProps> = ({ tab, onChange }) => (
  <nav className="sc-tabbar sc-only-mobile">
    <div className="sc-tabbar-in">
      {TABS.map(({ key, label, Icon }) => {
        const on = tab === key;
        return (
          <button
            key={key}
            type="button"
            onClick={() => onChange(key)}
            aria-current={on ? 'page' : undefined}
            className={on ? 'sc-tab sc-tab-on' : 'sc-tab'}
          >
            <Icon size={23} strokeWidth={on ? 2.3 : 1.7} />
            <span>{label}</span>
          </button>
        );
      })}
    </div>
  </nav>
);
