import bcrypt from "bcryptjs";

const SALT_ROUNDS = 10;

/**
 * 비밀번호 bcrypt 단방향 솔트 해싱
 */
export function hashPin(pin: string): string {
  return bcrypt.hashSync(pin.trim(), SALT_ROUNDS);
}

/**
 * 비밀번호 bcrypt 검증
 */
export function verifyPin(rawPin: string, storedHash: string): boolean {
  if (!rawPin || !storedHash) return false;
  try {
    return bcrypt.compareSync(rawPin.trim(), storedHash);
  } catch {
    return false;
  }
}

/**
 * 관리자 비밀번호 자릿수 검증: 숫자 6자리
 */
export function isValidAdminPinFormat(pin: string): boolean {
  return /^[0-9]{6}$/.test(pin.trim());
}

/**
 * 직원 비밀번호 자릿수 검증: 숫자 4자리
 */
export function isValidStaffPinFormat(pin: string): boolean {
  return /^[0-9]{4}$/.test(pin.trim());
}

/**
 * 호환성용 기본 함수
 */
export function isValidPinFormat(pin: string, digits: 4 | 6 = 4): boolean {
  if (digits === 6) return isValidAdminPinFormat(pin);
  return isValidStaffPinFormat(pin);
}
