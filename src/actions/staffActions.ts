"use server";

import { query } from "@/lib/db";
import { hashPin, isValidPinFormat, verifyPin } from "@/lib/hash";
import { createSession } from "@/lib/session";
import { ActionResult } from "./systemAdminActions";

export interface CompensationData {
  id?: string;
  staff_id?: string;
  pay_type: "hourly" | "monthly";
  amount_krw: number;
  effective_from: string;
  created_at?: string;
}

export interface StaffItem {
  id: string;
  shop_id: string;
  name: string;
  status: "pending" | "active" | "resigned";
  created_at: string;
  resigned_at?: string | null;
  compensations?: CompensationData[];
}

/**
 * 로그인 차단 여부 검사 (계정 식별자별 최근 15분 동안 5회 실패 시 15분 차단)
 */
async function isAuthBlocked(identityHash: string): Promise<boolean> {
  try {
    const res = await query(
      `SELECT attempted_at, succeeded
       FROM auth_attempts
       WHERE identity_hash = $1
         AND attempted_at >= NOW() - INTERVAL '15 minutes'
       ORDER BY attempted_at DESC
       LIMIT 5`,
      [identityHash]
    );

    if (res.rows && res.rows.length >= 5) {
      const hasSuccess = res.rows.some((r) => r.succeeded === true);
      if (!hasSuccess) {
        return true;
      }
    }
    return false;
  } catch {
    return false;
  }
}

async function recordAuthAttempt(identityHash: string, succeeded: boolean): Promise<void> {
  try {
    await query(
      `INSERT INTO auth_attempts (identity_hash, succeeded) VALUES ($1, $2)`,
      [identityHash, succeeded]
    );
  } catch {
    // 무시
  }
}

/**
 * F-05: 직원 가입 신청
 */
export async function applyStaffAction(
  shopId: string,
  name: string,
  pin: string,
  confirmPin: string
): Promise<ActionResult> {
  const trimmedName = name.trim();
  if (!shopId || !trimmedName) {
    return { success: false, error: "직원 이름을 입력해주세요." };
  }
  if (!isValidPinFormat(pin)) {
    return { success: false, error: "비밀은 숫자 4자리여야 합니다." };
  }
  if (pin !== confirmPin) {
    return { success: false, error: "비밀 확인이 일치하지 않습니다." };
  }

  try {
    const existing = await query(
      "SELECT id FROM staff WHERE shop_id = $1 AND name = $2 LIMIT 1",
      [shopId, trimmedName]
    );
    if (existing.rows && existing.rows.length > 0) {
      return { success: false, error: "이미 등록된 직원 이름입니다." };
    }

    const pinHash = hashPin(pin);
    const insertRes = await query(
      `INSERT INTO staff (shop_id, name, pin_hash, status)
       VALUES ($1, $2, $3, 'pending')
       RETURNING id, name, status`,
      [shopId, trimmedName, pinHash]
    );

    return { success: true, data: insertRes.rows[0] };
  } catch {
    return { success: false, error: "가입 신청 중 오류가 발생했습니다." };
  }
}

/**
 * 플라워샵의 전체 직원 목록 (급여 조건 이력 포함)
 */
export async function getShopStaffAction(shopId: string): Promise<StaffItem[]> {
  try {
    const staffRes = await query(
      `SELECT id, shop_id, name, status, created_at, resigned_at
       FROM staff
       WHERE shop_id = $1
       ORDER BY created_at DESC`,
      [shopId]
    );

    const staffList: StaffItem[] = staffRes.rows || [];
    if (staffList.length === 0) return [];

    const compRes = await query(
      `SELECT id, staff_id, pay_type, amount_krw, TO_CHAR(effective_from, 'YYYY-MM-DD') AS effective_from, created_at
       FROM compensation
       WHERE staff_id = ANY($1::uuid[])
       ORDER BY effective_from DESC`,
      [staffList.map((s) => s.id)]
    );

    const compMap: Record<string, CompensationData[]> = {};
    (compRes.rows || []).forEach((row) => {
      if (!compMap[row.staff_id]) compMap[row.staff_id] = [];
      compMap[row.staff_id].push({
        id: row.id,
        staff_id: row.staff_id,
        pay_type: row.pay_type,
        amount_krw: row.amount_krw,
        effective_from: row.effective_from,
        created_at: row.created_at,
      });
    });

    return staffList.map((s) => ({
      ...s,
      compensations: compMap[s.id] || [],
    }));
  } catch {
    return [];
  }
}

/**
 * F-07: 직원 로그인용 재직(active) 직원 목록 조회 (대표 관리자는 제외됨)
 */
export async function getActiveStaffListAction(
  shopId: string
): Promise<{ id: string; name: string }[]> {
  try {
    const res = await query(
      `SELECT id, name
       FROM staff
       WHERE shop_id = $1 AND status = 'active'
       ORDER BY name ASC`,
      [shopId]
    );
    return res.rows || [];
  } catch {
    return [];
  }
}

/**
 * F-06: 직원 승인 및 급여 조건 설정
 */
export async function approveStaffAction(
  staffId: string,
  payType: "hourly" | "monthly",
  amountKrw: number,
  effectiveFrom: string
): Promise<ActionResult> {
  if (amountKrw <= 0) {
    return { success: false, error: "급여 금액은 0보다 커야 합니다." };
  }
  if (!effectiveFrom) {
    return { success: false, error: "적용 시작일을 입력해주세요." };
  }

  try {
    await query("UPDATE staff SET status = 'active' WHERE id = $1", [staffId]);

    await query(
      `INSERT INTO compensation (staff_id, pay_type, amount_krw, effective_from)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (staff_id, effective_from)
       DO UPDATE SET pay_type = EXCLUDED.pay_type, amount_krw = EXCLUDED.amount_krw`,
      [staffId, payType, amountKrw, effectiveFrom]
    );

    return { success: true };
  } catch {
    return { success: false, error: "직원 승인 처리에 실패했습니다." };
  }
}

/**
 * F-06: 직원 퇴사 처리
 */
export async function resignStaffAction(staffId: string): Promise<ActionResult> {
  try {
    await query(
      "UPDATE staff SET status = 'resigned', resigned_at = NOW() WHERE id = $1",
      [staffId]
    );
    return { success: true };
  } catch {
    return { success: false, error: "퇴사 처리에 실패했습니다." };
  }
}

/**
 * 급여 조건 추가 및 갱신
 */
export async function updateCompensationAction(
  staffId: string,
  payType: "hourly" | "monthly",
  amountKrw: number,
  effectiveFrom: string
): Promise<ActionResult> {
  if (amountKrw <= 0) {
    return { success: false, error: "급여 금액은 0보다 커야 합니다." };
  }
  if (!effectiveFrom) {
    return { success: false, error: "적용 시작일을 입력해주세요." };
  }

  try {
    await query(
      `INSERT INTO compensation (staff_id, pay_type, amount_krw, effective_from)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (staff_id, effective_from)
       DO UPDATE SET pay_type = EXCLUDED.pay_type, amount_krw = EXCLUDED.amount_krw`,
      [staffId, payType, amountKrw, effectiveFrom]
    );
    return { success: true };
  } catch {
    return { success: false, error: "급여 조건 저장에 실패했습니다." };
  }
}

export const addCompensationAction = updateCompensationAction;

/**
 * 직원 급여 조건 목록 조회
 */
export async function getStaffCompensationsAction(staffId: string): Promise<CompensationData[]> {
  try {
    const res = await query(
      `SELECT id, staff_id, pay_type, amount_krw, TO_CHAR(effective_from, 'YYYY-MM-DD') AS effective_from
       FROM compensation
       WHERE staff_id = $1
       ORDER BY effective_from ASC`,
      [staffId]
    );
    return res.rows || [];
  } catch {
    return [];
  }
}

/**
 * F-07: 직원 로그인
 */
export async function loginStaffAction(
  shopId: string,
  name: string,
  pin: string
): Promise<ActionResult<{ id: string; name: string; shop_id: string }>> {
  const trimmedName = name.trim();
  if (!shopId || !trimmedName || !isValidPinFormat(pin)) {
    return { success: false, error: "이름 또는 비밀을 확인해 주세요." };
  }

  const identityHash = `staff:${shopId}:${trimmedName}`;
  const blocked = await isAuthBlocked(identityHash);
  if (blocked) {
    return { success: false, error: "로그인 시도가 초과되었습니다. 15분 후 다시 시도해주세요." };
  }

  try {
    const res = await query(
      `SELECT id, shop_id, name, pin_hash, status
       FROM staff
       WHERE shop_id = $1 AND name = $2 LIMIT 1`,
      [shopId, trimmedName]
    );

    const staff = res.rows[0];
    if (!staff || staff.status !== "active") {
      await recordAuthAttempt(identityHash, false);
      return { success: false, error: "이름 또는 비밀을 확인해 주세요." };
    }

    const isValid = verifyPin(pin, staff.pin_hash);
    if (!isValid) {
      await recordAuthAttempt(identityHash, false);
      return { success: false, error: "이름 또는 비밀을 확인해 주세요." };
    }

    await recordAuthAttempt(identityHash, true);

    await createSession({
      role: "employee",
      userId: staff.id,
      name: staff.name,
      shopId: staff.shop_id,
    });

    return {
      success: true,
      data: {
        id: staff.id,
        name: staff.name,
        shop_id: staff.shop_id,
      },
    };
  } catch {
    return { success: false, error: "이름 또는 비밀을 확인해 주세요." };
  }
}

/**
 * 직원 본인 비밀 변경
 */
export async function changeStaffPinAction(
  staffId: string,
  newPin: string,
  confirmPin: string
): Promise<ActionResult> {
  if (!isValidPinFormat(newPin)) {
    return { success: false, error: "비밀은 숫자 4자리여야 합니다." };
  }
  if (newPin !== confirmPin) {
    return { success: false, error: "비밀 확인이 일치하지 않습니다." };
  }

  try {
    const newHash = hashPin(newPin);
    const res = await query(
      "UPDATE staff SET pin_hash = $1 WHERE id = $2 RETURNING id",
      [newHash, staffId]
    );
    if (!res.rows || res.rows.length === 0) {
      return { success: false, error: "직원 정보를 찾을 수 없습니다." };
    }
    return { success: true };
  } catch {
    return { success: false, error: "비밀 변경 중 오류가 발생했습니다." };
  }
}
