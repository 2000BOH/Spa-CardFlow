-- 🌊 블루오션 웰니스 스파 법인카드 지출 결산 시스템 Supabase DB 스키마

-- 1. cardflow_expenses 테이블 생성
CREATE TABLE IF NOT EXISTS public.cardflow_expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_name TEXT NOT NULL,          -- 장소 (상호명, 예: 강원건재)
    expense_date DATE NOT NULL,        -- 결제 날짜 (YYYY-MM-DD)
    expense_time TIME DEFAULT '12:00',  -- 결제 시간
    items TEXT NOT NULL,               -- 품목 명세
    quantity INTEGER DEFAULT 1,        -- 수량
    amount NUMERIC NOT NULL,           -- 사용 금액 (원)
    category TEXT NOT NULL,            -- 카테고리 (시설/건재/자재, 스파/비품/소모품 등)
    purpose TEXT NOT NULL,             -- 사용 내용 및 상세 목적
    note TEXT,                         -- 비고
    receipt_image_url TEXT,            -- 영수증 이미지 Storage URL 또는 Base64
    directed_by TEXT DEFAULT 'none',   -- 임원 지시 사용 구분 (none/ceo/chairman)
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. budget 설정 테이블 생성
CREATE TABLE IF NOT EXISTS public.monthly_budgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    monthly_budget NUMERIC DEFAULT 3000000,
    prev_month_spend NUMERIC DEFAULT 2150000,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Row Level Security (RLS) 활성화
ALTER TABLE public.cardflow_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_budgets ENABLE ROW LEVEL SECURITY;

-- 4. 누구나 읽기/쓰기 가능 정책 (초기 테스트용)
CREATE POLICY "Allow public read and write access" ON public.cardflow_expenses FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public budget access" ON public.monthly_budgets FOR ALL USING (true) WITH CHECK (true);

-- 5. Storage (영수증 이미지) 설정
-- 'receipts' 라는 퍼블릭 버킷 생성
INSERT INTO storage.buckets (id, name, public) VALUES ('receipts', 'receipts', true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS 및 전체 허용 정책 (초기 테스트용)
CREATE POLICY "Public Access" ON storage.objects FOR ALL USING (bucket_id = 'receipts');

-- 6. 성능 인덱스 (타임아웃 방지)
-- ⚠️ receipt_image_url에 Base64 이미지가 직접 저장되므로 select(*)가 아닌 필요 컬럼만 조회할 것
CREATE INDEX IF NOT EXISTS idx_cardflow_expenses_date ON public.cardflow_expenses (expense_date DESC);
CREATE INDEX IF NOT EXISTS idx_cardflow_expenses_created ON public.cardflow_expenses (created_at DESC);

