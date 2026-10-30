-- 2. 시스템 관리자 테이블 (복수 등록 지원, 6자리 비밀번호)
CREATE TABLE IF NOT EXISTS system_admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  pin_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. 플라워샵 테이블 (상태: active, inactive)
CREATE TABLE IF NOT EXISTS shops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. 플라워샵 관리자 테이블 (플라워샵별 복수 등록 지원, 6자리 비밀번호)
CREATE TABLE IF NOT EXISTS shop_admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  pin_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (shop_id, name)
);

-- 5. 플라워샵 직원 테이블 (상태: pending, approved, resigned, 4자리 비밀번호)
CREATE TABLE IF NOT EXISTS staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  pin_hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'resigned')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resigned_at TIMESTAMPTZ,
  UNIQUE (shop_id, name)
);

-- 6. 직원 급여 조건 테이블 (시급/월급, 시간/분 단위 정산)
CREATE TABLE IF NOT EXISTS compensation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  pay_type TEXT NOT NULL CHECK (pay_type IN ('hourly', 'monthly')),
  time_unit TEXT NOT NULL DEFAULT 'minute' CHECK (time_unit IN ('minute', 'hour')),
  amount_krw INTEGER NOT NULL CHECK (amount_krw > 0),
  effective_from DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (staff_id, effective_from)
);

-- 7. 출퇴근 근무 기록 테이블 (시급 직원용 일별 기록)
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

-- 8. 무차별 대입 공격 방지 테이블
CREATE TABLE IF NOT EXISTS auth_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identity_hash TEXT NOT NULL,
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  succeeded BOOLEAN NOT NULL DEFAULT FALSE
);

-- 9. 성능 최적화 인덱스
CREATE INDEX IF NOT EXISTS idx_shops_status ON shops(status);
CREATE INDEX IF NOT EXISTS idx_shop_admins_shop_id ON shop_admins(shop_id);
CREATE INDEX IF NOT EXISTS idx_staff_shop_status ON staff(shop_id, status);
CREATE INDEX IF NOT EXISTS idx_compensation_staff ON compensation(staff_id, effective_from DESC);
CREATE INDEX IF NOT EXISTS idx_attendance_staff_date ON attendance(staff_id, work_date);
CREATE INDEX IF NOT EXISTS idx_auth_attempts_identity ON auth_attempts(identity_hash, attempted_at DESC);
