-- 002_fix_indexes_and_constraints.sql
-- 기존 001_initial_schema.sql 마이그레이션이 적용된 후 최적화 인덱스를 보완합니다.

CREATE INDEX IF NOT EXISTS idx_shops_status ON shops(status);
CREATE INDEX IF NOT EXISTS idx_shop_admins_shop_id ON shop_admins(shop_id);
CREATE INDEX IF NOT EXISTS idx_staff_shop_status ON staff(shop_id, status);
CREATE INDEX IF NOT EXISTS idx_compensation_staff ON compensation(staff_id, effective_from DESC);
CREATE INDEX IF NOT EXISTS idx_attendance_staff_date ON attendance(staff_id, work_date);
CREATE INDEX IF NOT EXISTS idx_auth_attempts_identity ON auth_attempts(identity_hash, attempted_at DESC);
