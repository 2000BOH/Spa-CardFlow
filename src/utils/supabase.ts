import { createClient } from '@supabase/supabase-js';

// VITE_ 로 시작하는 환경 변수를 통해 안전하게 URL과 Key를 주입받습니다.
// 런타임에 값을 주입하지 못하는 환경을 대비한 예외 처리도 포함합니다.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// 초기화 시 URL/Key 가 없으면 에러를 내뿜지 않고 빈 껍데기만 둡니다 (에러 방지용)
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ Supabase URL 또는 Anon Key가 설정되지 않았습니다. .env.local 파일을 확인해주세요.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
