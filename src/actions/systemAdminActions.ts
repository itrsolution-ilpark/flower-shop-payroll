"use server";

import { query } from "@/lib/db";
import { hashPin, isValidPinFormat } from "@/lib/hash";
import { createSession } from "@/lib/session";

export interface ActionResult<T = unknown> {
  success: boolean;
  error?: string;
  data?: T;
}

/**
 * 시스템 관리자 존재 여부 조회
 */
export async function getSystemAdminCountAction(): Promise<number> {
  try {
    const res = await query("SELECT COUNT(*)::int as count FROM system_admins");
    if (!res.rows || res.rows.length === 0) return 0;
    return res.rows[0].count || 0;
  } catch {
    return 0;
  }
}

/**
 * F-01: 시스템 관리자 최초 등록
 */
export async function registerSystemAdminAction(
  name: string,
  pin: string,
  confirmPin: string
): Promise<ActionResult> {
  const trimmedName = name.trim();
  if (!trimmedName) {
    return { success: false, error: "관리자 이름을 입력해주세요." };
  }
  if (!isValidPinFormat(pin)) {
    return { success: false, error: "비밀은 숫자 4자리여야 합니다." };
  }
  if (pin !== confirmPin) {
    return { success: false, error: "비밀 확인이 일치하지 않습니다." };
  }

  try {
    // 관리자가 이미 있는지 확인 (한 명만 허용)
    const checkRes = await query("SELECT id FROM system_admins LIMIT 1");
    if (checkRes.rows && checkRes.rows.length > 0) {
      return { success: false, error: "이미 시스템 관리자가 등록되어 있습니다." };
    }

    const pinHash = hashPin(pin);
    const insertRes = await query(
      "INSERT INTO system_admins (name, pin_hash) VALUES ($1, $2) RETURNING id, name",
      [trimmedName, pinHash]
    );

    const newAdmin = insertRes.rows[0];
    if (!newAdmin) {
      return { success: false, error: "시스템 관리자 등록에 실패했습니다." };
    }

    await createSession({
      role: "system_admin",
      userId: newAdmin.id,
      name: newAdmin.name,
    });

    return { success: true, data: newAdmin };
  } catch {
    return { success: false, error: "시스템 관리자 등록에 실패했습니다." };
  }
}

/**
 * F-01: 시스템 관리자 로그인
 */
export async function loginSystemAdminAction(
  name: string,
  pin: string
): Promise<ActionResult> {
  const trimmedName = name.trim();
  if (!trimmedName || !isValidPinFormat(pin)) {
    return { success: false, error: "이름 또는 비밀을 확인해 주세요." };
  }

  try {
    const pinHash = hashPin(pin);
    const res = await query(
      "SELECT id, name FROM system_admins WHERE name = $1 AND pin_hash = $2 LIMIT 1",
      [trimmedName, pinHash]
    );

    const admin = res.rows[0];
    if (!admin) {
      return { success: false, error: "이름 또는 비밀을 확인해 주세요." };
    }

    await createSession({
      role: "system_admin",
      userId: admin.id,
      name: admin.name,
    });

    return { success: true, data: admin };
  } catch {
    return { success: false, error: "이름 또는 비밀을 확인해 주세요." };
  }
}
