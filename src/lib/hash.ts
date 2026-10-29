import crypto from "crypto";

/**
 * 4자리 숫자 비밀 단방향 해시 생성 (SHA-256 기반 솔트 결합)
 */
export function hashPin(pin: string): string {
  const salt = process.env.APP_SESSION_SECRET || "flower-shop-default-salt-2026";
  return crypto.createHmac("sha256", salt).update(pin.trim()).digest("hex");
}

/**
 * 4자리 숫자 비밀 유효성 및 해시 일치 검증
 */
export function verifyPin(rawPin: string, storedHash: string): boolean {
  if (!/^[0-9]{4}$/.test(rawPin)) {
    return false;
  }
  const computed = hashPin(rawPin);
  return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(storedHash));
}

/**
 * 4자리 숫자 포맷 정규식 검증
 */
export function isValidPinFormat(pin: string): boolean {
  return /^[0-9]{4}$/.test(pin.trim());
}
