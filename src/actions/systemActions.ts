"use server";

import { query } from "@/lib/db";
import { hashPin, verifyPin } from "@/lib/hash";
import { getSession, setSession, clearSession } from "@/lib/session";

export type ActionResult<T = void> = {
  success: boolean;
  error?: string;
  data?: T;
};

export interface SystemShopItem {
  id: string;
  name: string;
  status: "active" | "inactive";
  admin_count: number;
  approved_staff_count: number;
  total_staff_count: number;
  created_at: string;
}

export interface SystemAdminItem {
  id: string;
  name: string;
  created_at: string;
}

/**
 * 등록된 시스템 관리자 수 조회
 */
export async function getSystemAdminCountAction(): Promise<number> {
  try {
    const res = await query<{ count: string }>(
      "SELECT COUNT(*)::text as count FROM system_admins"
    );
    return parseInt(res.rows[0]?.count || "0", 10);
  } catch {
    return 0;
  }
}

/**
 * F-01: 시스템 관리자 최초 등록 (0명일 때만 허용, 숫자 6자리)
 */
export async function registerInitialSystemAdminAction(
  name: string,
  pin: string,
  confirmPin: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!name || !name.trim()) {
      return { success: false, error: "관리자 이름을 입력해주세요." };
    }
    if (!/^[0-9]{6}$/.test(pin)) {
      return { success: false, error: "비밀번호는 숫자 6자리여야 합니다." };
    }
    if (pin !== confirmPin) {
      return { success: false, error: "비밀번호 확인이 일치하지 않습니다." };
    }

    const count = await getSystemAdminCountAction();
    if (count > 0) {
      return {
        success: false,
        error: "이미 시스템 관리자가 등록되어 있습니다.",
      };
    }

    const pinHash = await hashPin(pin);
    const res = await query<{ id: string; name: string }>(
      "INSERT INTO system_admins (name, pin_hash) VALUES ($1, $2) RETURNING id, name",
      [name.trim(), pinHash]
    );

    const newAdmin = res.rows[0];
    await setSession({
      userId: newAdmin.id,
      role: "system_admin",
      name: newAdmin.name,
    });

    return { success: true };
  } catch (err: any) {
    if (err?.code === "23505") {
      return { success: false, error: "이미 존재하는 관리자 이름입니다." };
    }
    return { success: false, error: "시스템 관리자 등록 중 오류가 발생했습니다." };
  }
}

/**
 * F-01: 추가 시스템 관리자 등록 (기존 세션 관리자만 가능, 6자리)
 */
export async function addSystemAdminAction(
  name: string,
  pin: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await getSession();
    if (!session || session.role !== "system_admin") {
      return { success: false, error: "시스템 관리자 권한이 필요합니다." };
    }

    if (!name || !name.trim()) {
      return { success: false, error: "관리자 이름을 입력해주세요." };
    }
    if (!/^[0-9]{6}$/.test(pin)) {
      return { success: false, error: "비밀번호는 숫자 6자리여야 합니다." };
    }

    const pinHash = await hashPin(pin);
    await query(
      "INSERT INTO system_admins (name, pin_hash) VALUES ($1, $2)",
      [name.trim(), pinHash]
    );

    return { success: true };
  } catch (err: any) {
    if (err?.code === "23505") {
      return { success: false, error: "이미 등록된 시스템 관리자 이름입니다." };
    }
    return { success: false, error: "추가 관리자 등록 중 오류가 발생했습니다." };
  }
}

/**
 * 시스템 관리자 대시보드 데이터 조회
 */
export async function getSystemDashboardDataAction(): Promise<{
  currentAdminName: string;
  shops: SystemShopItem[];
  admins: SystemAdminItem[];
} | null> {
  try {
    const session = await getSession();
    if (!session || session.role !== "system_admin") {
      return null;
    }

    const shopsRes = await query<{
      id: string;
      name: string;
      status: "active" | "inactive";
      admin_count: string;
      approved_staff_count: string;
      total_staff_count: string;
      created_at: string;
    }>(`
      SELECT 
        s.id,
        s.name,
        s.status,
        TO_CHAR(s.created_at, 'YYYY-MM-DD') as created_at,
        COUNT(DISTINCT sa.id)::text as admin_count,
        COUNT(DISTINCT CASE WHEN st.status = 'approved' THEN st.id END)::text as approved_staff_count,
        COUNT(DISTINCT st.id)::text as total_staff_count
      FROM shops s
      LEFT JOIN shop_admins sa ON sa.shop_id = s.id
      LEFT JOIN staff st ON st.shop_id = s.id
      GROUP BY s.id, s.name, s.status, s.created_at
      ORDER BY s.created_at DESC
    `);

    const adminsRes = await query<{
      id: string;
      name: string;
      created_at: string;
    }>(`
      SELECT id, name, TO_CHAR(created_at, 'YYYY-MM-DD') as created_at
      FROM system_admins
      ORDER BY created_at ASC
    `);

    return {
      currentAdminName: session.name,
      shops: shopsRes.rows.map((row) => ({
        id: row.id,
        name: row.name,
        status: row.status,
        admin_count: parseInt(row.admin_count, 10),
        approved_staff_count: parseInt(row.approved_staff_count, 10),
        total_staff_count: parseInt(row.total_staff_count, 10),
        created_at: row.created_at,
      })),
      admins: adminsRes.rows,
    };
  } catch {
    return null;
  }
}

/**
 * F-02: 플라워샵 개설
 */
export async function createShopBySystemAdminAction(
  name: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await getSession();
    if (!session || session.role !== "system_admin") {
      return { success: false, error: "권한이 없습니다." };
    }

    if (!name || !name.trim()) {
      return { success: false, error: "플라워샵 이름을 입력해주세요." };
    }

    await query("INSERT INTO shops (name, status) VALUES ($1, 'active')", [name.trim()]);
    return { success: true };
  } catch (err: any) {
    if (err?.code === "23505") {
      return { success: false, error: "이미 존재하는 플라워샵 이름입니다." };
    }
    return { success: false, error: "플라워샵 생성 중 오류가 발생했습니다." };
  }
}

/**
 * F-02: 플라워샵 이름 수정
 */
export async function updateShopNameBySystemAdminAction(
  shopId: string,
  name: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await getSession();
    if (!session || session.role !== "system_admin") {
      return { success: false, error: "권한이 없습니다." };
    }

    if (!name || !name.trim()) {
      return { success: false, error: "플라워샵 이름을 입력해주세요." };
    }

    await query("UPDATE shops SET name = $1 WHERE id = $2", [name.trim(), shopId]);
    return { success: true };
  } catch (err: any) {
    if (err?.code === "23505") {
      return { success: false, error: "이미 존재하는 플라워샵 이름입니다." };
    }
    return { success: false, error: "이름 수정 중 오류가 발생했습니다." };
  }
}

/**
 * F-02: 플라워샵 상태 active/inactive 토글
 */
export async function toggleShopStatusAction(
  shopId: string,
  status: "active" | "inactive"
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await getSession();
    if (!session || session.role !== "system_admin") {
      return { success: false, error: "권한이 없습니다." };
    }

    await query("UPDATE shops SET status = $1 WHERE id = $2", [status, shopId]);
    return { success: true };
  } catch {
    return { success: false, error: "상태 변경 중 오류가 발생했습니다." };
  }
}

/**
 * 레거시 호환용 등록/로그인 export
 */
export async function registerSystemAdminAction(name: string, pin: string, confirmPin: string) {
  return registerInitialSystemAdminAction(name, pin, confirmPin);
}

export async function loginSystemAdminAction(name: string, pin: string) {
  const { loginSystemAdminAction: authLogin } = await import("./authActions");
  return authLogin(name, pin);
}
