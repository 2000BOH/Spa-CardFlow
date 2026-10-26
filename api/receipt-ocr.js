// 영수증 AI 인식 API (Vercel 서버리스 함수)
// Gemini API 키는 여기(서버)에만 있고 브라우저로 내려가지 않습니다.
// Vercel 환경변수: GEMINI_API_KEY (필수), GEMINI_MODEL (선택, 기본 gemini-flash-latest)

const CATEGORIES = [
  '시설/건재/자재',
  '스파/비품/소모품',
  '식비/간식/음료',
  '교통/유류/주차',
  '접대/회의/행사',
  '직원사기진작',
  '기타/일반지출',
];

// 순서대로 시도: 모델 이름이 없거나(404) 응답이 늦으면(시간 초과) 다음 모델로
const FALLBACK_MODELS = ['gemini-flash-lite-latest', 'gemini-2.5-flash-lite', 'gemini-flash-latest', 'gemini-2.5-flash'];

const USD_TO_KRW = 1350; // 기존 OCR 로직과 같은 기준환율

const PROMPT = `당신은 한국 영수증/카드매출전표를 읽는 회계 담당자입니다.
블루오션 웰니스 스파(호텔 내 스파) 직원이 법인카드로 결제한 영수증 사진입니다.
사진에서 아래 항목을 정확히 읽어 JSON으로만 답하세요.

규칙:
- totalAmount: 고객이 실제로 결제한 "최종 금액"입니다. 합계, 결제금액, 승인금액, 받을금액, 청구금액, Total 등에 해당합니다.
  과세물품가액, 공급가액, 면세물품가액, 부가세, 봉사료, 할인 전 금액, 개별 품목 단가는 절대 넣지 마세요.
- supplyAmount, vatAmount: 공급가액(과세물품가액)과 부가세가 보이면 적고, 없으면 0.
- currency: 원화면 "KRW", 달러면 "USD". 금액은 숫자만 (콤마/기호 없이). USD는 소수점 허용.
- storeName: 가맹점(상호)명. "카드매출전표", "영수증", 카드사 이름, 사업자번호는 상호가 아닙니다.
- date: 거래일 YYYY-MM-DD, time: 거래시각 HH:MM (24시간). 안 보이면 빈 문자열.
- items: 구매한 품목을 짧게 요약 (예: "수건 20장, 샴푸"). 안 보이면 업종으로 추정 (예: "택시비").
- quantity: 품목 총 수량, 모르면 1.
- category: 목록 중 하나만 선택: ${CATEGORIES.join(', ')}. 확실하지 않으면 "기타/일반지출".
- purpose: 스파 업무 기준 사용 목적을 짧게 (예: "스파 운영 비품 구매", "업무 이동"). 모르면 빈 문자열.
- 읽을 수 없는 값은 지어내지 말고 빈 문자열 또는 0으로 두세요.`;

const RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    storeName: { type: 'STRING' },
    date: { type: 'STRING' },
    time: { type: 'STRING' },
    items: { type: 'STRING' },
    quantity: { type: 'INTEGER' },
    totalAmount: { type: 'NUMBER' },
    supplyAmount: { type: 'NUMBER' },
    vatAmount: { type: 'NUMBER' },
    currency: { type: 'STRING', enum: ['KRW', 'USD'] },
    category: { type: 'STRING', enum: CATEGORIES },
    purpose: { type: 'STRING' },
  },
  required: ['storeName', 'date', 'time', 'items', 'quantity', 'totalAmount', 'supplyAmount', 'vatAmount', 'currency', 'category', 'purpose'],
};

const CALL_TIMEOUT_MS = 20000;

async function callGemini(model, apiKey, mimeType, base64, useThinkingConfig) {
  const generationConfig = {
    temperature: 0,
    responseMimeType: 'application/json',
    responseSchema: RESPONSE_SCHEMA,
  };
  // 영수증 읽기는 깊은 추론이 필요 없으므로 생각(thinking) 단계를 최소화해 응답 속도 확보
  if (useThinkingConfig) generationConfig.thinkingConfig = { thinkingBudget: 0 };

  const started = Date.now();
  try {
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify({
          contents: [{ parts: [{ inline_data: { mime_type: mimeType, data: base64 } }, { text: PROMPT }] }],
          generationConfig,
        }),
        signal: AbortSignal.timeout(CALL_TIMEOUT_MS),
      }
    );
    const body = await r.json().catch(() => ({}));
    console.log(`[gemini] model=${model} thinkingConfig=${useThinkingConfig} status=${r.status} ${Date.now() - started}ms`);
    return { status: r.status, body, ms: Date.now() - started };
  } catch (err) {
    console.log(`[gemini] model=${model} 실패 ${Date.now() - started}ms: ${err?.name} ${err?.message}`);
    return { status: err?.name === 'TimeoutError' ? 504 : 502, body: { error: { message: `Gemini 응답 없음 (${err?.name})` } }, ms: Date.now() - started };
  }
}

/** AI가 공급가액을 합계로 잘못 고른 경우 등을 검산으로 바로잡음 */
function resolveAmount(p) {
  const total = Number(p.totalAmount) || 0;
  const supply = Number(p.supplyAmount) || 0;
  const vat = Number(p.vatAmount) || 0;
  const sum = supply + vat;
  if (supply > 0 && vat > 0 && total > 0 && total < sum - 1) return sum;
  if (total <= 0 && sum > 0) return sum;
  return total;
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST만 지원합니다' });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(503).json({ error: 'GEMINI_API_KEY가 설정되지 않았습니다' });

  const { image } = req.body || {};
  const m = typeof image === 'string' && image.match(/^data:(image\/[a-z+]+);base64,(.+)$/);
  if (!m) return res.status(400).json({ error: 'image(data URL)가 필요합니다' });
  const [, mimeType, base64] = m;

  const models = [process.env.GEMINI_MODEL, ...FALLBACK_MODELS].filter(Boolean);
  let last = { status: 500, body: {} };
  const tries = []; // 모델별 결과/소요시간 (응답에 포함해 원인 파악용)
  for (const model of [...new Set(models)]) {
    last = await callGemini(model, apiKey, mimeType, base64, true);
    // 모델이 thinkingConfig를 지원하지 않으면 빼고 다시 시도
    if (last.status === 400 && /thinking/i.test(last.body?.error?.message || '')) {
      last = await callGemini(model, apiKey, mimeType, base64, false);
    }
    tries.push({ model, status: last.status, ms: last.ms });
    if (last.status !== 404 && last.status !== 504) break;
  }

  if (last.status !== 200) {
    const msg = last.body?.error?.message || 'Gemini 호출 실패';
    return res.status(last.status === 429 ? 429 : 502).json({ error: msg, tries });
  }

  const text = last.body?.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('') || '';
  let p;
  try {
    p = JSON.parse(text);
  } catch {
    return res.status(502).json({ error: 'AI 응답을 해석하지 못했습니다' });
  }

  const isDollar = p.currency === 'USD';
  const rawAmount = resolveAmount(p);
  const amount = Math.round(isDollar ? rawAmount * USD_TO_KRW : rawAmount);

  return res.status(200).json({
    storeName: String(p.storeName || '').trim().slice(0, 30),
    date: /^\d{4}-\d{2}-\d{2}$/.test(p.date) ? p.date : '',
    time: /^\d{2}:\d{2}$/.test(p.time) ? p.time : '',
    items: String(p.items || '').trim(),
    quantity: Number.isInteger(p.quantity) && p.quantity > 0 ? p.quantity : 1,
    amount: amount > 0 ? amount : 0,
    category: CATEGORIES.includes(p.category) ? p.category : '기타/일반지출',
    purpose: String(p.purpose || '').trim(),
    isDollar,
    tries,
  });
}
