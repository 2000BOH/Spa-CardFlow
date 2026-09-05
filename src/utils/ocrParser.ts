import type { ExpenseCategory } from '../types/expense';
import Tesseract from 'tesseract.js';

// --- [신규] 이미지 전처리 함수 (대비 증폭 및 흑백 이진화) ---
async function preprocessImage(imageUrl: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return resolve(imageUrl);

      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      for (let i = 0; i < data.length; i += 4) {
        // 1. Grayscale 변환 (Luminosity 방식)
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        let gray = 0.299 * r + 0.587 * g + 0.114 * b;

        // 2. 고대비(Contrast) 처리 완화 (글씨 깨짐 방지)
        const contrast = 1.3;
        gray = (gray - 128) * contrast + 128;

        // 이진화(Threshold) 제거: 부드러운 회색조 유지
        if (gray > 255) gray = 255;
        if (gray < 0) gray = 0;

        data[i] = gray;
        data[i + 1] = gray;
        data[i + 2] = gray;
      }
      ctx.putImageData(imageData, 0, 0);
      resolve(canvas.toDataURL('image/jpeg', 0.9));
    };
    img.onerror = () => resolve(imageUrl); // 실패 시 원본 그대로 사용
    img.src = imageUrl;
  });
}
// ----------------------------------------------------

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
    // 1. 이미지 전처리 (흑백 및 대비 강화로 영수증 글씨 뚜렷하게)
    const processedImageUrl = await preprocessImage(imageUrl);

    // 2. 한국어 + 영어 모델을 사용하여 텍스트 인식 수행 (고품질 설정)
    const { data: { text } } = await Tesseract.recognize(
      processedImageUrl,
      'kor+eng',
      { 
        logger: m => console.log('OCR Progress:', m.status, Math.round(m.progress * 100) + '%'),
      }
    );

    console.log("OCR Extracted Text:", text);

    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    
    // --- 1. 결제 금액 추출 (멀티라인 허용 [\s\S] 으로 줄바꿈 대응) ---
    // 추가 키워드: 승차요금, Fare
    const amountRegex = /(?:합\s*계|결\s*제|금\s*액|승\s*인|청\s*구|받\s*을|총\s*액|영\s*수|과\s*세|승\s*차|t\s*o\s*t\s*a\s*l|a\s*m\s*o\s*u\s*n\s*t|f\s*a\s*r\s*e)[\s\S]{0,40}?(\d{1,3}(?:,\d{3})+)/i;
    let amount = 0;
    const amountMatch = text.match(amountRegex);
    if (amountMatch) {
      amount = parseInt(amountMatch[1].replace(/,/g, ''), 10);
    } else {
      // 키워드를 못 찾았으면, 콤마가 포함된 가장 큰 숫자를 결제 금액으로 추정
      const pureNumRegex = /(\d{1,3}(?:,\d{3})+)/g;
      let maxNum = 0;
      let match;
      while ((match = pureNumRegex.exec(text)) !== null) {
        const num = parseInt(match[1].replace(/,/g, ''), 10);
        if (num > maxNum) maxNum = num;
      }
      amount = maxNum;
    }

    // --- 2. 구입처(상호명) 추출 ---
    // 가맹점, 상호 등의 명시적 키워드 우선 탐색 (대괄호나 줄바꿈 전까지)
    let storeName = '상호명 인식 실패';
    const storeRegex = /(?:가맹점|상호|상호명|사업장)\s*[:;]?\s*([^\[\(\n]+)/i;
    const storeMatch = text.match(storeRegex);
    if (storeMatch && storeMatch[1].trim().length > 1) {
      storeName = storeMatch[1].replace(/[^가-힣a-zA-Z0-9\s]/g, '').trim();
    } else if (lines.length > 0) {
      // 없으면 첫 번째 줄 또는 두 번째 줄 사용
      storeName = lines[0].replace(/[^가-힣a-zA-Z0-9\s]/g, '').trim();
      if (storeName.length < 2 && lines.length > 1) {
        storeName = lines[1].replace(/[^가-힣a-zA-Z0-9\s]/g, '').trim();
      }
    }

    // --- 3. 거래일시(Date, Time) 추출 ---
    let dateStr = defaultResult.date;
    let timeStr = defaultResult.time;
    const dateRegex = /(?:거래일시|일시|date|판매일|승인일시)[\s\S]{0,30}?(\d{4})[-/.년\s]+(\d{1,2})[-/.월\s]+(\d{1,2})/i;
    const timeRegex = /(?:거래일시|일시|date|판매일|승인일시)[\s\S]{0,30}?(\d{2})[:시\s]+(\d{2})/i;
    
    const dateMatch = text.match(dateRegex);
    if (dateMatch) {
      const yyyy = dateMatch[1];
      const mm = dateMatch[2].padStart(2, '0');
      const dd = dateMatch[3].padStart(2, '0');
      dateStr = `${yyyy}-${mm}-${dd}`;
    }
    
    const timeMatch = text.match(timeRegex);
    if (timeMatch) {
      const hh = timeMatch[1].padStart(2, '0');
      const min = timeMatch[2].padStart(2, '0');
      timeStr = `${hh}:${min}`;
    }

    return {
      ...defaultResult,
      date: dateStr,
      time: timeStr,
      storeName: storeName.substring(0, 15), // 너무 길면 자름
      amount,
      note: 'AI OCR 텍스트 자동 스캔',
    };
  } catch (err) {
    console.error("OCR Error:", err);
    return defaultResult;
  }
}
