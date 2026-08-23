/**
 * Supabase 연동 클라이언트 (선택 사항)
 * npm install @supabase/supabase-js 설치 후 이용 가능
 */

export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const SUPABASE_SETUP_GUIDE = {
  step1: 'Supabase Dashboard에서 프로젝트 생성',
  step2: 'SQL Editor에 supabase/schema.sql 내용 붙여넣기 후 Run',
  step3: '.env 파일 생성 후 VITE_SUPABASE_URL 및 VITE_SUPABASE_ANON_KEY 설정'
};
