import type { ExpenseItem } from '../types/expense';

export const INITIAL_EXPENSES: ExpenseItem[] = [
  {
    id: 'exp-101',
    storeName: '강원건재',
    date: '2026-08-20',
    time: '14:30',
    items: '스파 샤워실 보수용 타일 및 시멘트 자재',
    quantity: 1,
    amount: 150000,
    category: '시설/건재/자재',
    purpose: '스파 3호실 샤워실 타일 보수 공사 자재 구입',
    note: '강원건재 현장 카드 결제완료',
    createdAt: '2026-08-20T14:32:00Z',
    receiptImage: 'https://images.unsplash.com/photo-1554415707-6e8cfc93fe23?auto=format&fit=crop&w=600&q=80'
  },
  {
    id: 'exp-102',
    storeName: '라벤더 아로마 테라피',
    date: '2026-08-18',
    time: '11:15',
    items: '유기농 아로마 에센셜 오일 500ml 5병',
    quantity: 5,
    amount: 450000,
    category: '스파/비품/소모품',
    purpose: '8월 VIP 마사지 고객용 아로마 오일 소모품 보충',
    note: '거래처 정기 공급 할인가 적용',
    createdAt: '2026-08-18T11:20:00Z'
  },
  {
    id: 'exp-103',
    storeName: '스타벅스 강남중앙점',
    date: '2026-08-17',
    time: '16:00',
    items: '테라피스트 세미나 미팅 음료 및 케이크',
    quantity: 6,
    amount: 48500,
    category: '식비/간식/음료',
    purpose: '주간 스파 테라피스트 서비스 교육 미팅',
    note: '팀원 6명 참석',
    createdAt: '2026-08-17T16:05:00Z'
  },
  {
    id: 'exp-104',
    storeName: '블루 타월 리넨 상사',
    date: '2026-08-16',
    time: '10:40',
    items: '최고급 순면 가운 및 대형 스파 타월',
    quantity: 30,
    amount: 620000,
    category: '스파/비품/소모품',
    purpose: '스파 객실 교체용 호텔급 타월 교체',
    note: '세금계산서 대신 법인카드 직접 결제',
    createdAt: '2026-08-16T10:45:00Z'
  },
  {
    id: 'exp-105',
    storeName: 'GS칼텍스 해운대주유소',
    date: '2026-08-15',
    time: '18:20',
    items: '업무용 픽업차량 휘발유 주유',
    quantity: 1,
    amount: 85000,
    category: '교통/유류/주차',
    purpose: 'VIP 고객 픽업 및 비품 수령 업무 수행 차량 주유',
    note: '법인 1호차 주유',
    createdAt: '2026-08-15T18:22:00Z'
  },
  {
    id: 'exp-106',
    storeName: '해운대 소문난 갈비',
    date: '2026-08-14',
    time: '19:30',
    items: '월간 성과 달성 회식비',
    quantity: 1,
    amount: 320000,
    category: '접대/회의/행사',
    purpose: '7월 스파 만족도 1위 달성 팀 회식',
    note: '스파 테라피팀 전체 참석',
    createdAt: '2026-08-14T19:35:00Z'
  }
];

export const INITIAL_MONTHLY_BUDGET = 3000000;
export const PREV_MONTH_SPEND = 2150000;
