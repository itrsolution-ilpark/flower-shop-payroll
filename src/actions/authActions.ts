"use server";

import { query } from "@/lib/db";
import { verifyPin } from "@/lib/hash";
import { getSession, setSession, clearSession } from "@/lib/session";

export interface ActiveShopOption {
  id: string;
  name: string;
  adminCount: number;
}

/**
 * 활성화(active)된 플라워샵 목록 조회 (로그인 및 가입신청용)
 */
export async function getActiveShopsAction(): Promise<ActiveShopOption[]> {
  try {
    const res = await query<{
      id: string;
      name: string;
      admin_count: string;
    }>(`
      SELECT 
        s.id,
        s.name,
        COUNT(sa.id)::text as admin_count
      FROM shops s
      LEFT JOIN shop_admins sa ON sa.shop_id = s.id
      WHERE s.status = 'active'
      GROUP BY s.id, s.name
      ORDER BY s.name ASC
    `);

    return res.rows.map((row) => ({
      id: row.id,
      name: row.name,
      adminCount: parseInt(row.admin_count, 10),
    }));
  } catch {
    return [];
  }
}

/**
 * F-06: 통합 로그인 (플라워샵 관리자 6자리 / 직원 4자리)
 */
export async function loginUserAction(params: {
  shopId: string;
  userType: "admin" | "staff";
  name: string;
  pin: string;
}): Promise<{ success: boolean; error?: string; data?: { redirectUrl: string } }> {
  const { shopId, userType, name, pin } = params;

  if (!shopId) {
    return { success: false, error: "로그인할 플라워샵을 선택해주세요." };
  }
  if (!name || !name.trim()) {
    return { success: false, error: "이름을 입력해주세요." };
  }

  // 1. 플라워샵 상태 검사 (active 여부 확인)
  try {
    const shopRes = await query<{ status: string }>(
      "SELECT status FROM shops WHERE id = $1",
      [shopId]
    );
    if (shopRes.rows.length === 0 || shopRes.rows[0].status !== "active") {
      return {
        success: false,
        error: "비활성화되었거나 존재하지 않는 플라워샵입니다.",
      };
    }
  } catch {
    return { success: false, error: "플라워샵 상태를 확인하지 못했습니다." };
  }

  // 2. 관리자 로그인 (6자리)
  if (userType === "admin") {
    if (!/^[0-9]{6}$/.test(pin)) {
      return { success: false, error: "관리자 비밀번호는 숫자 6자리여야 합니다." };
    }

    try {
      const adminRes = await query<{ id: string; name: string; pin_hash: string }>(
        "SELECT id, name, pin_hash FROM shop_admins WHERE shop_id = $1 AND name = $2",
        [shopId, name.trim()]
      );

      if (adminRes.rows.length === 0) {
        return { success: false, error: "이름 또는 비밀번호를 확인해 주세요." };
      }

      const admin = adminRes.rows[0];
      const valid = await verifyPin(pin, admin.pin_hash);
      if (!valid) {
        return { success: false, error: "이름 또는 비밀번호를 확인해 주세요." };
      }

      await setSession({
        userId: admin.id,
        role: "shop_admin",
        shopId,
        name: admin.name,
      });

      return {
        success: true,
        data: { redirectUrl: "/shop-admin/dashboard" },
      };
    } catch {
      return { success: false, error: "로그인 처리 중 오류가 발생했습니다." };
    }
  }

  // 3. 직원 로그인 (4자리, approved만 허용)
  if (!/^[0-9]{4}$/.test(pin)) {
    return { success: false, error: "직원 비밀번호는 숫자 4자리여야 합니다." };
  }

  try {
    const staffRes = await query<{
      id: string;
      name: string;
      pin_hash: string;
      status: "pending" | "approved" | "resigned";
    }>(
      "SELECT id, name, pin_hash, status FROM staff WHERE shop_id = $1 AND name = $2",
      [shopId, name.trim()]
    );

    if (staffRes.rows.length === 0) {
      return { success: false, error: "이름 또는 비밀번호를 확인해 주세요." };
    }

    const staff = staffRes.rows[0];
    if (staff.status !== "approved") {
      return {
        success: false,
        error: "승인 대기 중이거나 이용이 정지된 계정입니다.",
      };
    }

    const valid = await verifyPin(pin, staff.pin_hash);
    if (!valid) {
      return { success: false, error: "이름 또는 비밀번호를 확인해 주세요." };
    }

    await setSession({
      userId: staff.id,
      role: "staff",
      shopId,
      name: staff.name,
    });

    return {
      success: true,
      data: { redirectUrl: "/employee/dashboard" },
    };
  } catch {
    return { success: false, error: "로그인 처리 중 오류가 발생했습니다." };
  }
}

/**
 * 시스템 관리자 로그인 (6자리)
 */
export async function loginSystemAdminAction(
  name: string,
  pin: string
): Promise<{ success: boolean; error?: string }> {
  if (!name || !name.trim()) {
    return { success: false, error: "관리자 이름을 입력해주세요." };
  }
  if (!/^[0-9]{6}$/.test(pin)) {
    return { success: false, error: "시스템 관리자 비밀번호는 숫자 6자리여야 합니다." };
  }

  try {
    const res = await query<{ id: string; name: string; pin_hash: string }>(
      "SELECT id, name, pin_hash FROM system_admins WHERE name = $1",
      [name.trim()]
    );

    if (res.rows.length === 0) {
      return { success: false, error: "이름 또는 비밀번호를 확인해 주세요." };
    }

    const admin = res.rows[0];
    const valid = await verifyPin(pin, admin.pin_hash);
    if (!valid) {
      return { success: false, error: "이름 또는 비밀번호를 확인해 주세요." };
    }

    await setSession({
      userId: admin.id,
      role: "system_admin",
      name: admin.name,
    });

    return { success: true };
  } catch {
    return { success: false, error: "로그인 처리 중 오류가 발생했습니다." };
  }
}

/**
 * 로그아웃
 */
export async function logoutAction(): Promise<void> {
  await clearSession();
}

/**
 * 현재 세션 조회
 */
export async function getCurrentSessionAction() {
  return getSession();
}
