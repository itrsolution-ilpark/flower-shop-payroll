import { createClient, SupabaseClient } from "@supabase/supabase-js";

let serverClientInstance: SupabaseClient | null = null;

/**
 * SUPABASE_SERVICE_ROLE_KEY를 사용하는 서버 전용 싱글톤 Supabase 클라이언트.
 * 브라우저 RLS를 안전하게 우회하여 쓰기/수정을 실행합니다.
 * 환경 변수가 제공되지 않아도 빌드 타임에 에러를 던지지 않습니다.
 */
export function getServiceSupabase(): SupabaseClient {
  if (serverClientInstance) {
    return serverClientInstance;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder-project.supabase.co";
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    "placeholder-service-key";

  serverClientInstance = createClient(supabaseUrl, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return serverClientInstance;
}
