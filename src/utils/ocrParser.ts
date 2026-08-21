import type { ExpenseCategory } from '../types/expense';

export interface ParsedResult {
  storeName: string;
  date: string;
  time: string;
  items: string;
  quantity: number;
  amount: number;
  category: ExpenseCategory;
  purpose: string;
  note: string;
}

const getTodayStr = () => new Date().toISOString().split('T')[0];
const getCurrentTimeStr = () => {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
};

export function parseQuickText(inputStr: string): ParsedResult {
  const trimmed = inputStr.trim();
  const today = getTodayStr();
  const time = getCurrentTimeStr();

  let amount = 0;
  let storeName = '';
  let items = '';
  let quantity = 1;
  let category: ExpenseCategory = '기타/일반지출';
  let purpose = '';
  let note = '자연어 퀵 입력 파싱';

  const manWonMatch = trimmed.match(/(\d+(?:\.\d+)?)\s*만\s*원?/);
  const wonMatch = trimmed.match(/([\d,]+)\s*원/);
  const numMatch = trimmed.match(/(\d{4,9})/);

  if (manWonMatch) {
    amount = parseFloat(manWonMatch[1]) * 10000;
  } else if (wonMatch) {
    amount = parseInt(wonMatch[1].replace(/,/g, ''), 10);
  } else if (numMatch) {
    amount = parseInt(numMatch[1], 10);
  }

  const qtyMatch = trimmed.match(/(\d+)\s*(개|잔|병|세트|박스|권|명)/);
  if (qtyMatch) {
    quantity = parseInt(qtyMatch[1], 10);
  }

  const words = trimmed.split(/\s+/);
  if (words.length > 0) {
    storeName = words[0].replace(/(\d+만?원?)/, '').trim();
    if (!storeName && words.length > 1) {
      storeName = words[1];
    }
  }

  if (!storeName) {
    storeName = '미지정 상호';
  }

  const textLower = trimmed.toLowerCase();
  if (/건재|타일|시멘트|페인트|공구|자재|수리|보수|철물/.test(textLower)) {
    category = '시설/건재/자재';
    items = items || '시설 수리 및 건축 자재';
    purpose = purpose || '스파 시설 보수 및 자재 구매';
  } else if (/아로마|오일|타월|타올|가운|비품|샴푸|비누|소모품|스파/.test(textLower)) {
    category = '스파/비품/소모품';
    items = items || '스파 용품 및 영업 비품';
    purpose = purpose || '스파 운영용 비품 및 소모품 충전';
  } else if (/카페|커피|스타벅스|식당|음료|간식|빵|마켓|도시락|맥도날드/.test(textLower)) {
    category = '식비/간식/음료';
    items = items || '음료 및 임직원 간식';
    purpose = purpose || '근무 및 회의용 간식 구매';
  } else if (/주유|주차|택시|기름|하이패스|GS|SK|S-OIL|오일/.test(textLower)) {
    category = '교통/유류/주차';
    items = items || '차량 주유 및 주차료';
    purpose = purpose || '업무용 차량 주유 및 이동 교통비';
  } else if (/갈비|회식|식사|접대|고깃집|식당|뷔페|행사/.test(textLower)) {
    category = '접대/회의/행사';
    items = items || '회의 및 업무 관련 식사';
    purpose = purpose || '부서 회식 및 거래처 접대';
  } else {
    items = `${storeName} 지출 물품`;
    purpose = `${storeName} 업무 관련 법인카드 결제`;
  }

  return {
    storeName,
    date: today,
    time,
    items,
    quantity,
    amount,
    category,
    purpose,
    note
  };
}

export function parseReceiptImageSimulation(fileName: string): ParsedResult {
  const today = getTodayStr();
  const time = getCurrentTimeStr();
  const lowerName = fileName.toLowerCase();

  if (lowerName.includes('건재') || lowerName.includes('hardware')) {
    return {
      storeName: '강원건재 종합상사',
      date: today,
      time: '14:20',
      items: '욕실 방수 시멘트 및 타일 자재',
      quantity: 2,
      amount: 150000,
      category: '시설/건재/자재',
      purpose: '스파 샤워룸 보수용 건재 자재 구입',
      note: '영수증 OCR 이미지 파싱 완료'
    };
  } else if (lowerName.includes('coffee') || lowerName.includes('starbucks') || lowerName.includes('카페')) {
    return {
      storeName: '블루오션 베이커리 카페',
      date: today,
      time: '15:10',
      items: '수제 샌드위치 & 시그니처 아메리카노',
      quantity: 4,
      amount: 32000,
      category: '식비/간식/음료',
      purpose: '스파 고객 대기실 접대용 웰컴 샌드위치',
      note: '영수증 OCR 자동 추출'
    };
  } else {
    return {
      storeName: '해운대 센텀 메디컬 마켓',
      date: today,
      time: time,
      items: '손소독제 및 위생 스파 타월 세트',
      quantity: 5,
      amount: 88000,
      category: '스파/비품/소모품',
      purpose: '스파 매장 매일 위생 청결 비품 구입',
      note: '영수증 자동 스캔 및 파싱 적용됨'
    };
  }
}
