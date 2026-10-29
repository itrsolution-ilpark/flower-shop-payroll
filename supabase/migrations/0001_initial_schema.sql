-- 1. 기존 테이블 및 함수 일괄 정리 (재실행 가능)
DROP TABLE IF EXISTS auth_attempts CASCADE;
DROP TABLE IF EXISTS attendance CASCADE;
DROP TABLE IF EXISTS compensation CASCADE;
DROP TABLE IF EXISTS staff CASCADE;
DROP TABLE IF EXISTS shop_admins CASCADE;
DROP TABLE IF EXISTS shops CASCADE;
DROP TABLE IF EXISTS system_admins CASCADE;

-- 2. 시스템 관리자 테이블
CREATE TABLE IF NOT EXISTS system_admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  pin_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3. 플라워샵 테이블
CREATE TABLE IF NOT EXISTS shops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 4. 플라워샵별 관리자 테이블 (플라워샵당 단 1명)
CREATE TABLE IF NOT EXISTS shop_admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL UNIQUE REFERENCES shops(id) ON DELETE CASCADE,
  name text NOT NULL,
  pin_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 5. 플라워샵 직원 테이블 (대표 관리자는 여기에 포함되지 않음)
CREATE TABLE IF NOT EXISTS staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  name text NOT NULL,
  pin_hash text NOT NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'active', 'resigned')),
  created_at timestamptz NOT NULL DEFAULT now(),
  resigned_at timestamptz,
  UNIQUE (shop_id, name)
);

-- 6. 급여 조건 테이블 (시급 또는 월급)
CREATE TABLE IF NOT EXISTS compensation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  pay_type text NOT NULL CHECK (pay_type IN ('hourly', 'monthly')),
  amount_krw integer NOT NULL CHECK (amount_krw > 0),
  effective_from date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (staff_id, effective_from)
);

-- 7. 출퇴근 근무 기록 테이블 (시급 직원 전용)
CREATE TABLE IF NOT EXISTS attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  work_date date NOT NULL,
  clock_in time NOT NULL,
  clock_out time NOT NULL,
  total_minutes integer NOT NULL CHECK (total_minutes > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (staff_id, work_date),
  CHECK (clock_out > clock_in)
);

-- 8. 인증 실패 차단 기록 테이블
CREATE TABLE IF NOT EXISTS auth_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identity_hash text NOT NULL,
  attempted_at timestamptz NOT NULL DEFAULT now(),
  succeeded boolean NOT NULL DEFAULT false
);

-- 9. RLS(행 수준 보안) 활성화
ALTER TABLE system_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE compensation ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_attempts ENABLE ROW LEVEL SECURITY;

-- 10. 공개 RLS 차단 정책 (직접 브라우저 anon 호출 거부, Service Role 서버 통신만 허용)
DROP POLICY IF EXISTS "Deny client access to system_admins" ON system_admins;
CREATE POLICY "Deny client access to system_admins" ON system_admins FOR ALL USING (false);

DROP POLICY IF EXISTS "Deny client access to shops" ON shops;
CREATE POLICY "Deny client access to shops" ON shops FOR ALL USING (false);

DROP POLICY IF EXISTS "Deny client access to shop_admins" ON shop_admins;
CREATE POLICY "Deny client access to shop_admins" ON shop_admins FOR ALL USING (false);

DROP POLICY IF EXISTS "Deny client access to staff" ON staff;
CREATE POLICY "Deny client access to staff" ON staff FOR ALL USING (false);

DROP POLICY IF EXISTS "Deny client access to compensation" ON compensation;
CREATE POLICY "Deny client access to compensation" ON compensation FOR ALL USING (false);

DROP POLICY IF EXISTS "Deny client access to attendance" ON attendance;
CREATE POLICY "Deny client access to attendance" ON attendance FOR ALL USING (false);

DROP POLICY IF EXISTS "Deny client access to auth_attempts" ON auth_attempts;
CREATE POLICY "Deny client access to auth_attempts" ON auth_attempts FOR ALL USING (false);
