-- 1. expenses 테이블이 없다면 생성합니다.
CREATE TABLE IF NOT EXISTS expenses (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  store_name text,
  expense_date text,
  expense_time text,
  items text,
  quantity integer,
  amount integer,
  category text,
  purpose text,
  note text,
  receipt_image_url text,
  created_at timestamp with time zone DEFAULT now()
);

-- 2. 이미 테이블이 있는 경우를 대비해 누락된 컬럼을 추가합니다 (오류 무시 가능).
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS store_name text;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS expense_date text;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS expense_time text;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS items text;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS quantity integer;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS amount integer;
ALTER TABLE expenses ADD COLUMN 정렬 text;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS category text;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS purpose text;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS note text;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS receipt_image_url text;

-- 3. RLS(보안 정책)를 완전히 해제하여 누구나 읽고 쓸 수 있게 만듭니다.
ALTER TABLE expenses DISABLE ROW LEVEL SECURITY;
