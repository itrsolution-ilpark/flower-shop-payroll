"use server";

import { query } from "@/lib/db";
import { hashPin, isValidAdminPinFormat } from "@/lib/hash";
import { getSession, setSession } from "@/lib/session";
import { calculateStaffMonthlyEarnings, AttendanceItem } from "@/lib/payroll";

export interface PendingStaffItem {
  id: string;
  name: string;
  created_at: string;
}

export interface ApprovedStaffItem {
  id: string;
  name: string;
  status: "approved" | "resigned";
  pay_type?: "hourly" | "monthly";
  time_unit?: "minute" | "hour";
  amount_krw?: number;
  effective_from?: string;
  totalMinutes?: number;
  monthlyAmount?: number;
}

export interface ShopAdminInfo {
  id: string;
  name: string;
  created_at: string;
}

export interface ShopAdminDashboardData {
  shopName: string;
  adminName: string;
  pendingStaff: PendingStaffItem[];
  approvedStaff: ApprovedStaffItem[];
  otherAdmins: ShopAdminInfo[];
}

/**
 * 최초 플라워샵 관리자 개설 (관리자 0명일 때만 가능)
 */
export async function registerInitialShopAdminAction(
  shopId: string,
  name: string,
  pin: string,
  confirmPin: string
): Promise<{ success: boolean; error?: string }> {
  const trimmedName = name.trim();

  if (!shopId) return { success: false, error: "플라워샵을 선택해주세요." };
  if (!trimmedName) return { success: false, error: "관리자 이름을 입력해주세요." };
  if (!isValidAdminPinFormat(pin)) {
    return { success: false, error: "관리자 비밀번호는 숫자 6자리여야 합니다." };
  }
  if (pin !== confirmPin) {
    return { success: false, error: "비밀번호 확인이 일치하지 않습니다." };
  }

  try {
    const countRes = await query<{ count: string }>(
      "SELECT COUNT(*)::text as count FROM shop_admins WHERE shop_id = $1",
      [shopId]
    );
    const count = parseInt(countRes.rows[0]?.count || "0", 10);
    if (count > 0) {
      return {
        success: false,
        error: "이미 관리자가 존재하는 플라워샵입니다. 기존 관리자 로그인 후 추가 등록할 수 있습니다.",
      };
    }

    const pinHash = hashPin(pin);
    const insertRes = await query<{ id: string; name: string }>(
      "INSERT INTO shop_admins (shop_id, name, pin_hash) VALUES ($1, $2, $3) RETURNING id, name",
      [shopId, trimmedName, pinHash]
    );

    const newAdmin = insertRes.rows[0];
    await setSession({
      userId: newAdmin.id,
      role: "shop_admin",
      shopId,
      name: newAdmin.name,
    });

    return { success: true };
  } catch (err: any) {
    if (err?.code === "23505") {
      return { success: false, error: "동일한 이름을 가진 관리자가 이미 등록되어 있습니다." };
    }
    return { success: false, error: "관리자 등록 중 오류가 발생했습니다." };
  }
}

/**
 * 대시보드 통합 데이터 조회
 */
export async function getShopAdminDashboardDataAction(
  monthStr: string
): Promise<{ success: boolean; error?: string; data?: ShopAdminDashboardData }> {
  try {
    const session = await getSession();
    if (!session || session.role !== "shop_admin" || !session.shopId) {
      return { success: false, error: "플라워샵 관리자 권한이 필요합니다." };
    }

    const shopId = session.shopId;

    // 1. 플라워샵 이름 조회
    const shopRes = await query<{ name: string; status: string }>(
      "SELECT name, status FROM shops WHERE id = $1",
      [shopId]
    );

    if (shopRes.rows.length === 0) {
      return { success: false, error: "플라워샵 정보를 찾을 수 없습니다." };
    }

    if (shopRes.rows[0].status !== "active") {
      return { success: false, error: "비활성화된 플라워샵입니다." };
    }

    const shopName = shopRes.rows[0].name;

    // 2. 승인 대기자 목록 (pending)
    const pendingRes = await query<{
      id: string;
      name: string;
      created_at: string;
    }>(
      `SELECT id, name, TO_CHAR(created_at, 'YYYY-MM-DD') as created_at
       FROM staff
       WHERE shop_id = $1 AND status = 'pending'
       ORDER BY created_at ASC`,
      [shopId]
    );

    // 3. 승인된 직원 (approved/resigned) 및 급여 조건
    const approvedRes = await query<{
      id: string;
      name: string;
      status: "approved" | "resigned";
      pay_type?: "hourly" | "monthly";
      time_unit?: "minute" | "hour";
      amount_krw?: number;
      effective_from?: string;
    }>(
      `SELECT 
        st.id,
        st.name,
        st.status,
        c.pay_type,
        c.time_unit,
        c.amount_krw,
        TO_CHAR(c.effective_from, 'YYYY-MM-DD') as effective_from
       FROM staff st
       LEFT JOIN LATERAL (
         SELECT pay_type, time_unit, amount_krw, effective_from
         FROM compensation
         WHERE staff_id = st.id
         ORDER BY effective_from DESC, created_at DESC
         LIMIT 1
       ) c ON true
       WHERE st.shop_id = $1 AND st.status IN ('approved', 'resigned')
       ORDER BY st.status ASC, st.name ASC`,
      [shopId]
    );

    // 4. 해당 월의 모든 출퇴근 기록 조회
    const attendanceRes = await query<{
      staff_id: string;
      work_date: string;
      clock_in: string;
      clock_out: string;
      total_minutes: number;
    }>(
      `SELECT a.staff_id, TO_CHAR(a.work_date, 'YYYY-MM-DD') as work_date,
              TO_CHAR(a.clock_in, 'HH24:MI') as clock_in,
              TO_CHAR(a.clock_out, 'HH24:MI') as clock_out,
              a.total_minutes
       FROM attendance a
       JOIN staff s ON s.id = a.staff_id
       WHERE s.shop_id = $1 AND TO_CHAR(a.work_date, 'YYYY-MM') = $2`,
      [shopId, monthStr]
    );

    const attMap: Record<string, AttendanceItem[]> = {};
    attendanceRes.rows.forEach((att) => {
      if (!attMap[att.staff_id]) attMap[att.staff_id] = [];
      attMap[att.staff_id].push(att);
    });

    const approvedStaff: ApprovedStaffItem[] = approvedRes.rows.map((st) => {
      const staffAtts = attMap[st.id] || [];
      const compList = st.pay_type
        ? [
            {
              pay_type: st.pay_type,
              time_unit: st.time_unit || "minute",
              amount_krw: st.amount_krw || 0,
              effective_from: st.effective_from || `${monthStr}-01`,
            },
          ]
        : [];

      const calc = calculateStaffMonthlyEarnings(compList, staffAtts, monthStr);

      return {
        ...st,
        amount_krw: st.amount_krw ? Number(st.amount_krw) : undefined,
        totalMinutes: calc.totalMinutes,
        monthlyAmount: calc.amount,
      };
    });

    // 5. 소속 플라워샵의 관리자 목록
    const adminsRes = await query<{
      id: string;
      name: string;
      created_at: string;
    }>(
      `SELECT id, name, TO_CHAR(created_at, 'YYYY-MM-DD') as created_at
       FROM shop_admins
       WHERE shop_id = $1
       ORDER BY created_at ASC`,
      [shopId]
    );

    return {
      success: true,
      data: {
        shopName,
        adminName: session.name,
        pendingStaff: pendingRes.rows,
        approvedStaff,
        otherAdmins: adminsRes.rows,
      },
    };
  } catch {
    return { success: false, error: "데이터를 로드하는 중 오류가 발생했습니다." };
  }
}

/**
 * F-05: 직원 승인 및 급여 조건 최초 설정
 */
export async function approveStaffAction(
  staffId: string,
  payType: "hourly" | "monthly",
  timeUnit: "minute" | "hour",
  amountKrw: number,
  effectiveFrom: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await getSession();
    if (!session || session.role !== "shop_admin") {
      return { success: false, error: "권한이 없습니다." };
    }

    if (!staffId) return { success: false, error: "직원을 선택해주세요." };
    if (!amountKrw || amountKrw <= 0) return { success: false, error: "유효한 급여액(원)을 입력해주세요." };
    if (!effectiveFrom) return { success: false, error: "적용 시작일을 선택해주세요." };

    await query(
      "UPDATE staff SET status = 'approved' WHERE id = $1 AND shop_id = $2",
      [staffId, session.shopId]
    );

    await query(
      `INSERT INTO compensation (staff_id, pay_type, time_unit, amount_krw, effective_from)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (staff_id, effective_from)
       DO UPDATE SET pay_type = EXCLUDED.pay_type, time_unit = EXCLUDED.time_unit, amount_krw = EXCLUDED.amount_krw`,
      [staffId, payType, timeUnit, amountKrw, effectiveFrom]
    );

    return { success: true };
  } catch {
    return { success: false, error: "직원 승인 처리 중 오류가 발생했습니다." };
  }
}

/**
 * 급여 조건 수정/등록
 */
export async function updateCompensationAction(
  staffId: string,
  payType: "hourly" | "monthly",
  timeUnit: "minute" | "hour",
  amountKrw: number,
  effectiveFrom: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await getSession();
    if (!session || session.role !== "shop_admin") {
      return { success: false, error: "권한이 없습니다." };
    }

    if (!staffId) return { success: false, error: "직원을 선택해주세요." };
    if (!amountKrw || amountKrw <= 0) return { success: false, error: "유효한 급여액(원)을 입력해주세요." };
    if (!effectiveFrom) return { success: false, error: "적용 시작일을 선택해주세요." };

    await query(
      `INSERT INTO compensation (staff_id, pay_type, time_unit, amount_krw, effective_from)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (staff_id, effective_from)
       DO UPDATE SET pay_type = EXCLUDED.pay_type, time_unit = EXCLUDED.time_unit, amount_krw = EXCLUDED.amount_krw`,
      [staffId, payType, timeUnit, amountKrw, effectiveFrom]
    );

    return { success: true };
  } catch {
    return { success: false, error: "급여 조건 변경 중 오류가 발생했습니다." };
  }
}

/**
 * F-05: 퇴사 처리
 */
export async function resignStaffAction(
  staffId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await getSession();
    if (!session || session.role !== "shop_admin") {
      return { success: false, error: "권한이 없습니다." };
    }

    await query(
      "UPDATE staff SET status = 'resigned', resigned_at = NOW() WHERE id = $1 AND shop_id = $2",
      [staffId, session.shopId]
    );

    return { success: true };
  } catch {
    return { success: false, error: "퇴사 처리 중 오류가 발생했습니다." };
  }
}

/**
 * 소속 플라워샵의 추가 관리자 등록
 */
export async function addShopAdminAction(
  name: string,
  pin: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await getSession();
    if (!session || session.role !== "shop_admin" || !session.shopId) {
      return { success: false, error: "권한이 없습니다." };
    }

    const trimmedName = name.trim();
    if (!trimmedName) return { success: false, error: "관리자 이름을 입력해주세요." };
    if (!isValidAdminPinFormat(pin)) {
      return { success: false, error: "관리자 비밀번호는 숫자 6자리여야 합니다." };
    }

    const pinHash = hashPin(pin);
    await query(
      "INSERT INTO shop_admins (shop_id, name, pin_hash) VALUES ($1, $2, $3)",
      [session.shopId, trimmedName, pinHash]
    );

    return { success: true };
  } catch (err: any) {
    if (err?.code === "23505") {
      return { success: false, error: "이미 동일한 이름의 관리자가 존재합니다." };
    }
    return { success: false, error: "추가 관리자 등록 중 오류가 발생했습니다." };
  }
}

/**
 * 플라워샵 관리자 본인 정보(이름/비밀번호) 수정
 */
export async function updateShopAdminSelfAction(
  newName: string,
  newPin: string,
  confirmPin: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await getSession();
    if (!session || session.role !== "shop_admin") {
      return { success: false, error: "권한이 없습니다." };
    }

    const trimmed = newName.trim();
    if (!trimmed) return { success: false, error: "이름을 입력해주세요." };
    if (!isValidAdminPinFormat(newPin)) {
      return { success: false, error: "비밀번호는 숫자 6자리여야 합니다." };
    }
    if (newPin !== confirmPin) {
      return { success: false, error: "비밀번호 확인이 일치하지 않습니다." };
    }

    const pinHash = hashPin(newPin);
    await query(
      "UPDATE shop_admins SET name = $1, pin_hash = $2 WHERE id = $3",
      [trimmed, pinHash, session.userId]
    );

    await setSession({
      ...session,
      name: trimmed,
    });

    return { success: true };
  } catch (err: any) {
    if (err?.code === "23505") {
      return { success: false, error: "이미 사용 중인 이름입니다." };
    }
    return { success: false, error: "본인 정보 수정 중 오류가 발생했습니다." };
  }
}
