import type { ExpenseCategory } from '../types/expense';
import Tesseract from 'tesseract.js';

// --- 이미지 전처리: 흑백 변환 + 대비 부드럽게 ---
async function preprocessImage(imageUrl: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      // 너무 작은 이미지는 2배 업스케일하여 글씨 선명도 향상
      const scale = Math.max(1, Math.min(2, 1600 / Math.max(img.width, img.height)));
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return resolve(imageUrl);

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      for (let i = 0; i < data.length; i += 4) {
        // 1. Grayscale 변환 (Luminosity 방식)
        const r = data[i], g = data[i + 1], b = data[i + 2];
        let gray = 0.299 * r + 0.587 * g + 0.114 * b;
        // 2. 부드러운 대비 증폭 (글씨 깨짐 방지)
        gray = Math.min(255, Math.max(0, (gray - 128) * 1.4 + 128));
        data[i] = data[i + 1] = data[i + 2] = gray;
      }
      ctx.putImageData(imageData, 0, 0);
      resolve(canvas.toDataURL('image/png'));  // PNG로 변환해 손실 없이 Tesseract로 전달
    };
    img.onerror = () => resolve(imageUrl);
    img.src = imageUrl;
  });
}

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

// --- 퀵 텍스트 파서 ---
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
  } else if (/택시|교통|주차|기름|주유|유류/.test(textLower)) {
    category = '교통/유류/주차'; items = '교통비'; purpose = '업무 이동';
  } else if (/회식|회의|접대|행사/.test(textLower)) {
    category = '접대/회의/행사'; items = '접대/행사'; purpose = '업무 관련 모임';
  } else if (/직원|기념|포상|선물|복지/.test(textLower)) {
    category = '직원사기진작'; items = '직원 복지'; purpose = '직원 사기 진작';
  }

  return { storeName, date: today, time, items, quantity, amount, category, purpose, note };
}

/**
 * 달러($) 금액을 원화(₩)로 변환
 * 실시간 환율 대신 안정적인 기준 환율을 사용 (대략 1,350원)
 */
function convertDollarToWon(dollarAmount: number): number {
  const EXCHANGE_RATE = 1350;
  return Math.round(dollarAmount * EXCHANGE_RATE);
}

/**
 * 영수증 텍스트에서 달러 표기를 찾고, 있으면 원화로 환산
 * 없으면 0 반환 (원화 금액 탐색 로직으로 넘어감)
 */
function extractDollarAmount(text: string): number {
  // $12.50, USD 12.50, 12.50 USD 등 패턴
  const dollarPatterns = [
    /\$\s*([\d,]+(?:\.\d{1,2})?)/,
    /USD\s*([\d,]+(?:\.\d{1,2})?)/i,
    /([\d,]+(?:\.\d{1,2})?)\s*USD/i,
    /Total[\s\S]{0,20}?\$\s*([\d,]+(?:\.\d{1,2})?)/i,
  ];
  for (const pattern of dollarPatterns) {
    const match = text.match(pattern);
    if (match) {
      const dollarVal = parseFloat(match[1].replace(/,/g, ''));
      if (dollarVal > 0 && dollarVal < 100000) { // 합리적인 범위 체크
        return convertDollarToWon(dollarVal);
      }
    }
  }
  return 0;
}

/**
 * 영수증 텍스트에서 키워드를 분석하여 카테고리/품목/목적을 자동 추론
 * 확실한 경우에만 채우고, 불확실하면 공란 유지
 */
function inferCategoryAndPurpose(text: string): {
  category: ExpenseCategory | null;
  items: string;
  purpose: string;
} {
  const t = text.toLowerCase();

  // 택시 / 교통
  if (/택시|taxi|개인택시|카카오택시|올레택시|타다|kakao\s*t|trip\s*fare|승차요금/.test(t)) {
    return { category: '교통/유류/주차', items: '택시비', purpose: '업무 이동' };
  }
  if (/주유|유류|기름|gs칼텍스|sk에너지|현대오일|s-oil|oil|gasoline|fuel/.test(t)) {
    return { category: '교통/유류/주차', items: '차량 유류비', purpose: '업무용 차량 주유' };
  }
  if (/주차|parking/.test(t)) {
    return { category: '교통/유류/주차', items: '주차비', purpose: '업무 주차' };
  }
  if (/버스|지하철|ktx|ktr|기차|철도|korail|subway|transit/.test(t)) {
    return { category: '교통/유류/주차', items: '대중교통비', purpose: '업무 이동' };
  }
  if (/렌트|rent\s*a\s*car|렌터카/.test(t)) {
    return { category: '교통/유류/주차', items: '렌트카 비용', purpose: '업무용 렌트카' };
  }

  // 식비 / 음료
  if (/카페|cafe|coffee|커피|스타벅스|starbucks|이디야|빽다방|투썸/.test(t)) {
    return { category: '식비/간식/음료', items: '커피/음료', purpose: '직원 음료' };
  }
  if (/식당|restaurant|food|pizza|burger|치킨|햄버거|피자|도시락|김밥|냉면|국밥|삼겹|횟집/.test(t)) {
    return { category: '식비/간식/음료', items: '식사비', purpose: '직원 식사' };
  }
  if (/편의점|cu|gs25|세븐일레븐|미니스톱|간식|snack/.test(t)) {
    return { category: '식비/간식/음료', items: '간식비', purpose: '직원 간식' };
  }

  // 스파 / 비품
  if (/아로마|aromatherapy|마사지|타월|수건|세탁|소모품|비품|샴푸|로션|오일/.test(t)) {
    return { category: '스파/비품/소모품', items: '스파 소모품', purpose: '스파 운영 비품 구매' };
  }
  if (/문구|사무용품|복사|프린터|잉크|파일|볼펜|노트/.test(t)) {
    return { category: '스파/비품/소모품', items: '사무용품', purpose: '사무용품 구매' };
  }

  // 시설 / 건재
  if (/건재|타일|시멘트|공구|자재|인테리어|도배|철물|페인트|목재/.test(t)) {
    return { category: '시설/건재/자재', items: '시설 자재', purpose: '스파 시설 유지보수' };
  }

  // 접대 / 행사
  if (/호텔|hotel|연회|banquet|행사|party|event|접대|골프/.test(t)) {
    return { category: '접대/회의/행사', items: '접대/행사비', purpose: '업무 접대 및 행사' };
  }
  if (/회의|meeting|conference|세미나|seminar/.test(t)) {
    return { category: '접대/회의/행사', items: '회의비', purpose: '업무 회의' };
  }

  // 직원 사기진작
  if (/선물|gift|꽃|flower|케이크|cake|기념|포상|상품권|복지|여행|여가/.test(t)) {
    return { category: '직원사기진작', items: '직원 선물/복지', purpose: '직원 사기 진작' };
  }

  // 확실하지 않으면 공란 반환 (사용자가 직접 입력)
  return { category: null, items: '', purpose: '' };
}

/**
 * Tesseract.js 기반 영수증 이미지 OCR 파싱
 * - 달러 감지 시 원화 자동 환산
 * - 키워드 기반 카테고리/품목/목적 스마트 자동 추론
 */
export async function parseRealReceiptImage(imageUrl: string): Promise<ParsedResult> {
  const defaultResult: ParsedResult = {
    storeName: '',
    date: getTodayStr(),
    time: getCurrentTimeStr(),
    items: '',
    quantity: 1,
    amount: 0,
    category: '기타/일반지출',
    purpose: '',
    note: 'OCR 스캔',
  };

  try {
    // 1. 이미지 전처리 (업스케일 + 흑백 + 대비)
    const processedImageUrl = await preprocessImage(imageUrl);

    // 2. Tesseract OCR 실행 (한국어 + 영어 동시 인식)
    const { data: { text } } = await Tesseract.recognize(
      processedImageUrl,
      'kor+eng',
      {
        logger: m => console.log('OCR:', m.status, Math.round(m.progress * 100) + '%'),
      }
    );

    console.log('[OCR 추출 텍스트]\n', text);

    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

    // --- A. 달러($) 금액 우선 감지 → 원화 변환 ---
    let amount = extractDollarAmount(text);
    let isDollar = amount > 0;

    if (!isDollar) {
      // --- B. 원화 금액 탐색 (멀티라인 허용) ---
      // 한국 영수증 모든 키워드: 합계, 결제요금, 승인금액, 받을금액, 결제금액, Total Fare 등
      const amountRegex = /(?:합\s*계|결\s*제|금\s*액|승\s*인|청\s*구|받\s*을|총\s*액|영\s*수|과\s*세|승\s*차|t\s*o\s*t\s*a\s*l|a\s*m\s*o\s*u\s*n\s*t|f\s*a\s*r\s*e)[\s\S]{0,50}?([\d]{1,3}(?:,\d{3})+)/i;
      const amountMatch = text.match(amountRegex);
      if (amountMatch) {
        amount = parseInt(amountMatch[1].replace(/,/g, ''), 10);
      } else {
        // 키워드 없으면 콤마 포함된 가장 큰 숫자 추정
        const pureNumRegex = /([\d]{1,3}(?:,\d{3})+)/g;
        let maxNum = 0;
        let m;
        while ((m = pureNumRegex.exec(text)) !== null) {
          const n = parseInt(m[1].replace(/,/g, ''), 10);
          if (n > maxNum) maxNum = n;
        }
        // 만원 단위로 표기된 경우도 체크 (예: 1.72만원)
        const manWonMatch = text.match(/([\d.]+)\s*만\s*원/);
        if (manWonMatch) {
          const manWon = Math.round(parseFloat(manWonMatch[1]) * 10000);
          amount = Math.max(maxNum, manWon);
        } else {
          amount = maxNum;
        }
      }

      // 금액이 너무 크면(카드번호 등 오인) 다시 줄별 탐색
      if (amount > 5000000) {
        let fallback = 0;
        for (const line of lines) {
          const m2 = line.match(/([\d]{1,3}(?:,\d{3})+)/);
          if (m2) {
            const n = parseInt(m2[1].replace(/,/g, ''), 10);
            if (n > fallback && n <= 5000000) fallback = n;
          }
        }
        if (fallback > 0) amount = fallback;
      }
    }

    // --- C. 구입처(상호명) 추출 ---
    let storeName = '';
    // 1순위: '가맹점:', '상호:', '사업장:' 등 명시적 키워드
    const storeRegex = /(?:가맹점|상호|상호명|사업장|store|merchant)\s*[:;]?\s*([^\[\(\n]{2,20})/i;
    const storeMatch = text.match(storeRegex);
    if (storeMatch && storeMatch[1].trim().length >= 2) {
      storeName = storeMatch[1].replace(/[^\uAC00-\uD7A3a-zA-Z0-9\s]/g, '').trim();
    }
    // 2순위: 첫 번째 / 두 번째 줄 중 의미있는 텍스트
    if (!storeName && lines.length > 0) {
      for (let i = 0; i < Math.min(3, lines.length); i++) {
        const candidate = lines[i].replace(/[^\uAC00-\uD7A3a-zA-Z0-9\s]/g, '').trim();
        // 영수증, Receipt, 보관용, 단말기 등 잡음 키워드 제외
        if (candidate.length >= 2 && !/영수증|receipt|보관용|단말기|사업자|전화번호/i.test(candidate)) {
          storeName = candidate;
          break;
        }
      }
    }

    // --- D. 거래일시(날짜, 시간) 추출 ---
    let dateStr = defaultResult.date;
    let timeStr = defaultResult.time;

    // 날짜: YYYY-MM-DD / YYYY/MM/DD / YYYY.MM.DD / YYYY년MM월DD일
    const dateRegex = /(\d{4})[-/.년]\s*(\d{1,2})[-/.월]\s*(\d{1,2})/;
    const dateMatch = text.match(dateRegex);
    if (dateMatch) {
      const yyyy = dateMatch[1];
      const mm = dateMatch[2].padStart(2, '0');
      const dd = dateMatch[3].padStart(2, '0');
      // 유효한 날짜인지 확인
      const year = parseInt(yyyy);
      if (year >= 2020 && year <= 2030) {
        dateStr = `${yyyy}-${mm}-${dd}`;
      }
    }

    // 시간: HH:MM 또는 HH시MM분
    const timeRegex = /(\d{2})[:\s시]\s*(\d{2})(?:[:\s분])?/;
    const timeMatch = text.match(timeRegex);
    if (timeMatch) {
      const hh = parseInt(timeMatch[1]);
      const min = parseInt(timeMatch[2]);
      if (hh >= 0 && hh <= 23 && min >= 0 && min <= 59) {
        timeStr = `${String(hh).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
      }
    }

    // --- E. 카테고리/품목/목적 스마트 추론 ---
    const inferred = inferCategoryAndPurpose(text);

    return {
      storeName: storeName.substring(0, 20),
      date: dateStr,
      time: timeStr,
      items: inferred.items,
      quantity: 1,
      amount,
      category: inferred.category ?? '기타/일반지출',
      purpose: inferred.purpose,
      note: isDollar
        ? `AI OCR 자동 스캔 (달러→원화 환산, 기준환율 1,350원)`
        : 'AI OCR 자동 스캔',
    };
  } catch (err) {
    console.error('OCR Error:', err);
    return defaultResult;
  }
}
