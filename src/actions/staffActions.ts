"use server";

import { query } from "@/lib/db";
import { hashPin, isValidStaffPinFormat } from "@/lib/hash";
import { getSession } from "@/lib/session";
import { CompensationData } from "@/lib/payroll";

export type { CompensationData };

/**
 * F-04: 플라워샵 직원 가입 신청
 */
export async function applyStaffAction(
  shopId: string,
  name: string,
  pin: string,
  confirmPin: string
): Promise<{ success: boolean; error?: string }> {
  const trimmedName = name.trim();

  if (!shopId) {
    return { success: false, error: "플라워샵을 선택해주세요." };
  }
  if (!trimmedName) {
    return { success: false, error: "이름을 입력해주세요." };
  }
  if (!isValidStaffPinFormat(pin)) {
    return { success: false, error: "직원 비밀번호는 숫자 4자리여야 합니다." };
  }
  if (pin !== confirmPin) {
    return { success: false, error: "비밀번호 확인이 일치하지 않습니다." };
  }

  try {
    // 1. 플라워샵 상태 및 관리자 존재 여부 확인
    const shopRes = await query<{ status: string; admin_count: string }>(
      `SELECT s.status, COUNT(sa.id)::text as admin_count
       FROM shops s
       LEFT JOIN shop_admins sa ON sa.shop_id = s.id
       WHERE s.id = $1
       GROUP BY s.id, s.status`,
      [shopId]
    );

    if (shopRes.rows.length === 0) {
      return { success: false, error: "존재하지 않는 플라워샵입니다." };
    }

    const shop = shopRes.rows[0];
    if (shop.status !== "active") {
      return { success: false, error: "비활성화된 플라워샵입니다." };
    }

    if (parseInt(shop.admin_count, 10) === 0) {
      return { success: false, error: "관리자가 등록되지 않은 플라워샵에는 직원 가입을 신청할 수 없습니다." };
    }

    // 2. 직원 이름 중복 확인
    const existingStaff = await query(
      "SELECT id FROM staff WHERE shop_id = $1 AND name = $2 LIMIT 1",
      [shopId, trimmedName]
    );

    if (existingStaff.rows.length > 0) {
      return { success: false, error: "해당 플라워샵에 이미 등록/신청된 이름입니다." };
    }

    // 3. 직원 가입 신청 (pending 상태)
    const pinHash = hashPin(pin);
    await query(
      "INSERT INTO staff (shop_id, name, pin_hash, status) VALUES ($1, $2, $3, 'pending')",
      [shopId, trimmedName, pinHash]
    );

    return { success: true };
  } catch {
    return { success: false, error: "가입 신청 중 오류가 발생했습니다." };
  }
}

/**
 * 특정 직원의 급여 조건 히스토리 조회
 */
export async function getStaffCompensationsAction(
  staffId: string
): Promise<CompensationData[]> {
  try {
    const res = await query<CompensationData>(
      `SELECT id, staff_id, pay_type, time_unit, amount_krw,
              TO_CHAR(effective_from, 'YYYY-MM-DD') as effective_from,
              created_at
       FROM compensation
       WHERE staff_id = $1
       ORDER BY effective_from ASC, created_at ASC`,
      [staffId]
    );

    return res.rows.map((row) => ({
      id: row.id,
      staff_id: row.staff_id,
      pay_type: row.pay_type,
      time_unit: row.time_unit,
      amount_krw: Number(row.amount_krw),
      effective_from: row.effective_from,
      created_at: row.created_at,
    }));
  } catch {
    return [];
  }
}

/**
 * F-10: 직원 본인 비밀번호 변경 (숫자 4자리)
 */
export async function changeStaffPinAction(
  staffId: string,
  newPin: string,
  confirmPin: string
): Promise<{ success: boolean; error?: string }> {
  if (!isValidStaffPinFormat(newPin)) {
    return { success: false, error: "비밀번호는 숫자 4자리여야 합니다." };
  }
  if (newPin !== confirmPin) {
    return { success: false, error: "비밀번호 확인이 일치하지 않습니다." };
  }

  const session = await getSession();
  if (!session || (session.role === "staff" && session.userId !== staffId)) {
    return { success: false, error: "권한이 없습니다." };
  }

  try {
    const pinHash = hashPin(newPin);
    const res = await query(
      "UPDATE staff SET pin_hash = $1 WHERE id = $2 AND status = 'approved'",
      [pinHash, staffId]
    );

    if ((res.rowCount ?? 0) === 0) {
      return { success: false, error: "직원 정보를 찾을 수 없거나 승인되지 않은 계정입니다." };
    }

    return { success: true };
  } catch {
    return { success: false, error: "비밀번호 변경 처리 중 오류가 발생했습니다." };
  }
}
