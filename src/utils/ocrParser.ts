import type { ExpenseCategory } from '../types/expense';
import Tesseract from 'tesseract.js';

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

// 퀵 텍스트 파서는 기존과 동일하게 유지
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
  let note = '자연어 입력';

  const manWonMatch = trimmed.match(/(\d+(?:\.\d+)?)\s*만\s*원?/);
  const wonMatch = trimmed.match(/([\d,]+)\s*원/);
  const numMatch = trimmed.match(/(\d{4,9})/);

  if (manWonMatch) amount = parseFloat(manWonMatch[1]) * 10000;
  else if (wonMatch) amount = parseInt(wonMatch[1].replace(/,/g, ''), 10);
  else if (numMatch) amount = parseInt(numMatch[1], 10);

  const words = trimmed.split(/\s+/);
  if (words.length > 0) {
    storeName = words[0].replace(/(\d+만?원?)/, '').trim();
    if (!storeName && words.length > 1) storeName = words[1];
  }
  if (!storeName) storeName = '미지정';

  const textLower = trimmed.toLowerCase();
  if (/건재|타일|시멘트|공구|자재/.test(textLower)) {
    category = '시설/건재/자재'; items = '시설 보수 자재'; purpose = '스파 시설 유지보수';
  } else if (/아로마|오일|타월|비품|소모품/.test(textLower)) {
    category = '스파/비품/소모품'; items = '영업용 비품'; purpose = '스파 운영 비품 구매';
  } else if (/카페|커피|음료|간식|식당/.test(textLower)) {
    category = '식비/간식/음료'; items = '임직원 간식'; purpose = '근무/회의 간식';
  }

  return { storeName, date: today, time, items, quantity, amount, category, purpose, note };
}

/**
 * [신규] Tesseract.js 기반 실제 OCR 파싱
 */
export async function parseRealReceiptImage(imageUrl: string): Promise<ParsedResult> {
  const defaultResult = {
    storeName: '',
    date: getTodayStr(),
    time: getCurrentTimeStr(),
    items: '',
    quantity: 1,
    amount: 0,
    category: '기타/일반지출' as ExpenseCategory,
    purpose: '',
    note: 'OCR 스캔'
  };

  try {
    // 한국어 모델 로드 및 텍스트 인식 수행
    const { data: { text } } = await Tesseract.recognize(
      imageUrl,
      'kor',
      { logger: m => console.log(m) }
    );

    console.log("OCR Extracted Text:", text);

    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    
    // 금액 찾기 휴리스틱 (₩ 기호, 합계, 결제금액 등 주변 숫자)
    const amountRegex = /(?:합계|결제|합\s*계|금\s*액).*?(\d{1,3}(?:,\d{3})+)/;
    const pureNumRegex = /(\d{1,3}(?:,\d{3})+)/;
    
    let amount = 0;
    for (const line of lines) {
      const match = line.match(amountRegex);
      if (match) {
        amount = parseInt(match[1].replace(/,/g, ''), 10);
        break;
      }
    }
    
    // 합계 키워드를 못 찾았으면 콤마 있는 가장 큰 숫자 추정
    if (amount === 0) {
      let maxNum = 0;
      for (const line of lines) {
        const match = line.match(pureNumRegex);
        if (match) {
          const num = parseInt(match[1].replace(/,/g, ''), 10);
          if (num > maxNum) maxNum = num;
        }
      }
      amount = maxNum;
    }

    // 상호명 찾기 휴리스틱 (보통 최상단에 큰 글씨로 있음)
    let storeName = '상호명 인식 실패';
    if (lines.length > 0) {
      // 대표적으로 사업자번호나 대표자 이름이 있는 줄 이전의 텍스트를 상호로 추정
      storeName = lines[0].replace(/[^가-힣a-zA-Z0-9\s]/g, '').trim();
      if (storeName.length < 2 && lines.length > 1) {
        storeName = lines[1].replace(/[^가-힣a-zA-Z0-9\s]/g, '').trim();
      }
    }

    return {
      ...defaultResult,
      storeName: storeName.substring(0, 15), // 너무 길면 자름
      amount,
      note: 'AI OCR 텍스트 자동 스캔',
    };
  } catch (err) {
    console.error("OCR Error:", err);
    return defaultResult;
  }
}
