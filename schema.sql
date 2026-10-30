-- 1. 기존 테이블 정리 (외래키 종속성 순서대로 삭제)
DROP TABLE IF EXISTS auth_attempts CASCADE;
DROP TABLE IF EXISTS attendance CASCADE;
DROP TABLE IF EXISTS compensation CASCADE;
DROP TABLE IF EXISTS staff CASCADE;
DROP TABLE IF EXISTS shop_admins CASCADE;
DROP TABLE IF EXISTS shops CASCADE;
DROP TABLE IF EXISTS system_admins CASCADE;

-- 2. 시스템 관리자 테이블
CREATE TABLE IF NOT EXISTS system_admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  pin_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. 플라워샵 테이블
CREATE TABLE IF NOT EXISTS shops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. 플라워샵별 관리자 테이블 (플라워샵당 단 1명)
CREATE TABLE IF NOT EXISTS shop_admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL UNIQUE REFERENCES shops(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  pin_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. 플라워샵 직원 테이블 (대표 관리자는 여기에 포함되지 않음)
CREATE TABLE IF NOT EXISTS staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  pin_hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'active', 'resigned')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resigned_at TIMESTAMPTZ,
  UNIQUE (shop_id, name)
);

-- 6. 급여 조건 테이블 (시급 또는 월급)
CREATE TABLE IF NOT EXISTS compensation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  pay_type TEXT NOT NULL CHECK (pay_type IN ('hourly', 'monthly')),
  amount_krw INTEGER NOT NULL CHECK (amount_krw > 0),
  effective_from DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (staff_id, effective_from)
);

-- 7. 출퇴근 근무 기록 테이블 (시급 직원 전용)
CREATE TABLE IF NOT EXISTS attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  work_date DATE NOT NULL,
  clock_in TIME NOT NULL,
  clock_out TIME NOT NULL,
  total_minutes INTEGER NOT NULL CHECK (total_minutes > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (staff_id, work_date),
  CHECK (clock_out > clock_in)
);

-- 8. 로그인 실패 차단 기록 테이블
CREATE TABLE IF NOT EXISTS auth_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identity_hash TEXT NOT NULL,
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  succeeded BOOLEAN NOT NULL DEFAULT FALSE
);

-- 9. 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_staff_shop_id ON staff(shop_id);
CREATE INDEX IF NOT EXISTS idx_attendance_staff_id_date ON attendance(staff_id, work_date);
CREATE INDEX IF NOT EXISTS idx_compensation_staff_id ON compensation(staff_id, effective_from DESC);
CREATE INDEX IF NOT EXISTS idx_auth_attempts_identity ON auth_attempts(identity_hash, attempted_at DESC);
