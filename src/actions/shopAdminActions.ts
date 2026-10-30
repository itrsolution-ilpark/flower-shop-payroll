"use server";

import { query } from "@/lib/db";
import { hashPin, verifyPin } from "@/lib/hash";
import { getSession, setSession } from "@/lib/session";
import { calculateStaffMonthlyEarnings, MonthlyEarningsResult } from "@/lib/payroll";

export interface ShopAdminInfo {
  id: string;
  name: string;
  created_at: string;
}

export interface StaffDetailItem {
  id: string;
  shop_id: string;
  name: string;
  status: "pending" | "approved" | "resigned";
  created_at: string;
  resigned_at?: string | null;
  pay_type?: "hourly" | "monthly";
  time_unit?: "minute" | "hour";
  amount_krw?: number;
  effective_from?: string;
  total_minutes?: number;
  expected_pay?: number;
}

export interface ShopAdminDashboardData {
  shopId: string;
  shopName: string;
  currentAdminName: string;
  admins: ShopAdminInfo[];
  pendingStaff: StaffDetailItem[];
  activeStaff: StaffDetailItem[];
  resignedStaff: StaffDetailItem[];
  selectedMonth: string;
}

/**
 * F-03: 플라워샵 최초 관리자 개설 (/signup에서 관리자 0명일 때 6자리)
 */
export async function registerInitialShopAdminAction(
  shopId: string,
  name: string,
  pin: string,
  confirmPin: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!shopId) return { success: false, error: "플라워샵을 선택해주세요." };
    if (!name || !name.trim()) return { success: false, error: "관리자 이름을 입력해주세요." };
    if (!/^[0-9]{6}$/.test(pin)) {
      return { success: false, error: "관리자 비밀번호는 숫자 6자리여야 합니다." };
    }
    if (pin !== confirmPin) {
      return { success: false, error: "비밀번호 확인이 일치하지 않습니다." };
    }

    // 1. 해당 플라워샵 상태 확인
    const shopRes = await query<{ status: string }>(
      "SELECT status FROM shops WHERE id = $1",
      [shopId]
    );
    if (shopRes.rows.length === 0 || shopRes.rows[0].status !== "active") {
      return { success: false, error: "활성화된 플라워샵이 아닙니다." };
    }

    // 2. 이미 관리자가 있는지 확인
    const adminCheck = await query<{ count: string }>(
      "SELECT COUNT(*)::text as count FROM shop_admins WHERE shop_id = $1",
      [shopId]
    );
    if (parseInt(adminCheck.rows[0]?.count || "0", 10) > 0) {
      return {
        success: false,
        error: "이미 관리자가 등록되어 있습니다. 추가 관리자는 로그인 후 등록 가능합니다.",
      };
    }

    const pinHash = await hashPin(pin);
    const insertRes = await query<{ id: string; name: string }>(
      "INSERT INTO shop_admins (shop_id, name, pin_hash) VALUES ($1, $2, $3) RETURNING id, name",
      [shopId, name.trim(), pinHash]
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
      return { success: false, error: "해당 플라워샵에 이미 존재하는 관리자 이름입니다." };
    }
    return { success: false, error: "관리자 등록 중 오류가 발생했습니다." };
  }
}

/**
 * F-03: 소속 플라워샵의 추가 관리자 등록 (내부 로그인 세션에서 6자리)
 */
export async function addShopAdminAction(
  name: string,
  pin: string,
  confirmPin: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await getSession();
    if (!session || session.role !== "shop_admin" || !session.shopId) {
      return { success: false, error: "플라워샵 관리자 로그인이 필요합니다." };
    }

    if (!name || !name.trim()) return { success: false, error: "관리자 이름을 입력해주세요." };
    if (!/^[0-9]{6}$/.test(pin)) {
      return { success: false, error: "관리자 비밀번호는 숫자 6자리여야 합니다." };
    }
    if (pin !== confirmPin) {
      return { success: false, error: "비밀번호 확인이 일치하지 않습니다." };
    }

    const pinHash = await hashPin(pin);
    await query(
      "INSERT INTO shop_admins (shop_id, name, pin_hash) VALUES ($1, $2, $3)",
      [session.shopId, name.trim(), pinHash]
    );

    return { success: true };
  } catch (err: any) {
    if (err?.code === "23505") {
      return { success: false, error: "해당 플라워샵에 이미 등록된 관리자 이름입니다." };
    }
    return { success: false, error: "추가 관리자 등록 중 오류가 발생했습니다." };
  }
}

/**
 * 플라워샵 관리자 대시보드 데이터 통합 로드
 */
export async function getShopAdminDashboardDataAction(
  monthStr?: string
): Promise<ShopAdminDashboardData | null> {
  try {
    const session = await getSession();
    if (!session || session.role !== "shop_admin" || !session.shopId) {
      return null;
    }

    // 플라워샵 상태 검사 (inactive 면 거부)
    const shopRes = await query<{ id: string; name: string; status: string }>(
      "SELECT id, name, status FROM shops WHERE id = $1",
      [session.shopId]
    );
    if (shopRes.rows.length === 0 || shopRes.rows[0].status !== "active") {
      return null;
    }
    const shopName = shopRes.rows[0].name;

    // 관리자 목록
    const adminsRes = await query<ShopAdminInfo>(
      "SELECT id, name, TO_CHAR(created_at, 'YYYY-MM-DD') as created_at FROM shop_admins WHERE shop_id = $1 ORDER BY created_at ASC",
      [session.shopId]
    );

    // 대상 월 (기본 현재 YYYY-MM)
    const targetMonth = monthStr || new Date().toISOString().slice(0, 7);

    // 직원 목록 및 최신 급여 조건
    const staffRes = await query<{
      id: string;
      shop_id: string;
      name: string;
      status: "pending" | "approved" | "resigned";
      created_at: string;
      resigned_at?: string | null;
      pay_type?: "hourly" | "monthly";
      time_unit?: "minute" | "hour";
      amount_krw?: number;
      effective_from?: string;
    }>(`
      SELECT 
        st.id,
        st.shop_id,
        st.name,
        st.status,
        TO_CHAR(st.created_at, 'YYYY-MM-DD') as created_at,
        TO_CHAR(st.resigned_at, 'YYYY-MM-DD') as resigned_at,
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
      WHERE st.shop_id = $1
      ORDER BY st.name ASC
    `, [session.shopId]);

    // 해당 월의 출퇴근 기록 조회
    const attRes = await query<{
      staff_id: string;
      work_date: string;
      clock_in: string;
      clock_out: string;
      total_minutes: number;
    }>(`
      SELECT a.staff_id, TO_CHAR(a.work_date, 'YYYY-MM-DD') as work_date, 
             TO_CHAR(a.clock_in, 'HH24:MI') as clock_in,
             TO_CHAR(a.clock_out, 'HH24:MI') as clock_out,
             a.total_minutes
      FROM attendance a
      JOIN staff s ON s.id = a.staff_id
      WHERE s.shop_id = $1 AND TO_CHAR(a.work_date, 'YYYY-MM') = $2
    `, [session.shopId, targetMonth]);

    const attMapByStaff: Record<string, any[]> = {};
    attRes.rows.forEach((att) => {
      if (!attMapByStaff[att.staff_id]) attMapByStaff[att.staff_id] = [];
      attMapByStaff[att.staff_id].push(att);
    });

    const pendingStaff: StaffDetailItem[] = [];
    const activeStaff: StaffDetailItem[] = [];
    const resignedStaff: StaffDetailItem[] = [];

    for (const st of staffRes.rows) {
      const staffAtts = attMapByStaff[st.id] || [];
      const compList = st.pay_type
        ? [
            {
              pay_type: st.pay_type,
              time_unit: st.time_unit || "minute",
              amount_krw: st.amount_krw || 0,
              effective_from: st.effective_from || targetMonth + "-01",
            },
          ]
        : [];

      const calc = calculateStaffMonthlyEarnings(compList, staffAtts, targetMonth);

      const item: StaffDetailItem = {
        id: st.id,
        shop_id: st.shop_id,
        name: st.name,
        status: st.status,
        created_at: st.created_at,
        resigned_at: st.resigned_at,
        pay_type: st.pay_type,
        time_unit: st.time_unit,
        amount_krw: st.amount_krw,
        effective_from: st.effective_from,
        total_minutes: calc.totalMinutes,
        expected_pay: calc.amount,
      };

      if (st.status === "pending") pendingStaff.push(item);
      else if (st.status === "approved") activeStaff.push(item);
      else resignedStaff.push(item);
    }

    return {
      shopId: session.shopId,
      shopName,
      currentAdminName: session.name,
      admins: adminsRes.rows,
      pendingStaff,
      activeStaff,
      resignedStaff,
      selectedMonth: targetMonth,
    };
  } catch {
    return null;
  }
}

/**
 * F-05: 직원 승인 (급여 형태, 계산 단위, 금액, 적용일 등록)
 */
export async function approveStaffAction(
  staffId: string,
  payType: "hourly" | "monthly",
  timeUnit: "minute" | "hour",
  amount: number,
  effectiveFrom: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await getSession();
    if (!session || session.role !== "shop_admin" || !session.shopId) {
      return { success: false, error: "권한이 없습니다." };
    }

    if (amount <= 0) return { success: false, error: "급여 금액은 0원보다 커야 합니다." };
    if (!effectiveFrom) return { success: false, error: "적용 시작일을 입력해주세요." };

    // 1. 직원 상태를 approved로 갱신
    await query(
      "UPDATE staff SET status = 'approved', resigned_at = NULL WHERE id = $1 AND shop_id = $2",
      [staffId, session.shopId]
    );

    // 2. 급여 조건 저장
    await query(`
      INSERT INTO compensation (staff_id, pay_type, time_unit, amount_krw, effective_from)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (staff_id, effective_from)
      DO UPDATE SET pay_type = EXCLUDED.pay_type, time_unit = EXCLUDED.time_unit, amount_krw = EXCLUDED.amount_krw
    `, [staffId, payType, timeUnit || "minute", Math.round(amount), effectiveFrom]);

    return { success: true };
  } catch {
    return { success: false, error: "직원 승인 처리 중 오류가 발생했습니다." };
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
    if (!session || session.role !== "shop_admin" || !session.shopId) {
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
 * 급여 조건 수정
 */
export async function updateStaffCompensationAction(
  staffId: string,
  payType: "hourly" | "monthly",
  timeUnit: "minute" | "hour",
  amount: number,
  effectiveFrom: string
): Promise<{ success: boolean; error?: string }> {
  return approveStaffAction(staffId, payType, timeUnit, amount, effectiveFrom);
}

/**
 * F-08: 관리자의 일별 출퇴근 기록 보완/수정
 */
export async function saveAttendanceByAdminAction(
  staffId: string,
  workDate: string,
  clockIn: string,
  clockOut: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await getSession();
    if (!session || session.role !== "shop_admin" || !session.shopId) {
      return { success: false, error: "권한이 없습니다." };
    }

    if (!workDate || !clockIn || !clockOut) {
      return { success: false, error: "출퇴근 시각을 모두 입력해주세요." };
    }
    if (clockOut <= clockIn) {
      return { success: false, error: "퇴근 시각은 출근 시각보다 늦어야 합니다." };
    }

    const [inH, inM] = clockIn.split(":").map(Number);
    const [outH, outM] = clockOut.split(":").map(Number);
    const totalMinutes = outH * 60 + outM - (inH * 60 + inM);

    if (totalMinutes <= 0) {
      return { success: false, error: "근무 시간이 0분보다 길어야 합니다." };
    }

    await query(`
      INSERT INTO attendance (staff_id, work_date, clock_in, clock_out, total_minutes, updated_at)
      VALUES ($1, $2, $3, $4, $5, NOW())
      ON CONFLICT (staff_id, work_date)
      DO UPDATE SET clock_in = EXCLUDED.clock_in, clock_out = EXCLUDED.clock_out,
                    total_minutes = EXCLUDED.total_minutes, updated_at = NOW()
    `, [staffId, workDate, clockIn, clockOut, totalMinutes]);

    return { success: true };
  } catch {
    return { success: false, error: "근무 기록 저장 중 오류가 발생했습니다." };
  }
}

/**
 * F-10: 관리자 본인 정보 수정 (이름 및 6자리 비밀번호)
 */
export async function updateShopAdminProfileAction(
  currentPin: string,
  newName: string,
  newPin?: string,
  confirmPin?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await getSession();
    if (!session || session.role !== "shop_admin") {
      return { success: false, error: "로그인이 필요합니다." };
    }

    const adminRes = await query<{ pin_hash: string }>(
      "SELECT pin_hash FROM shop_admins WHERE id = $1",
      [session.userId]
    );
    if (adminRes.rows.length === 0) {
      return { success: false, error: "관리자 정보를 찾을 수 없습니다." };
    }

    const valid = await verifyPin(currentPin, adminRes.rows[0].pin_hash);
    if (!valid) {
      return { success: false, error: "현재 비밀번호가 일치하지 않습니다." };
    }

    if (!newName || !newName.trim()) {
      return { success: false, error: "새 관리자 이름을 입력해주세요." };
    }

    let finalPinHash = adminRes.rows[0].pin_hash;
    if (newPin) {
      if (!/^[0-9]{6}$/.test(newPin)) {
        return { success: false, error: "새 비밀번호는 숫자 6자리여야 합니다." };
      }
      if (newPin !== confirmPin) {
        return { success: false, error: "새 비밀번호 확인이 일치하지 않습니다." };
      }
      finalPinHash = await hashPin(newPin);
    }

    await query(
      "UPDATE shop_admins SET name = $1, pin_hash = $2 WHERE id = $3",
      [newName.trim(), finalPinHash, session.userId]
    );

    await setSession({
      ...session,
      name: newName.trim(),
    });

    return { success: true };
  } catch (err: any) {
    if (err?.code === "23505") {
      return { success: false, error: "해당 매장에 이미 존재하는 이름입니다." };
    }
    return { success: false, error: "정보 수정 중 오류가 발생했습니다." };
  }
}

/**
 * 레거시 호환 export
 */
export async function getShopAdminAction(shopId: string): Promise<ShopAdminInfo | null> {
  try {
    const res = await query<ShopAdminInfo>(
      "SELECT id, name, TO_CHAR(created_at, 'YYYY-MM-DD') as created_at FROM shop_admins WHERE shop_id = $1 ORDER BY created_at ASC LIMIT 1",
      [shopId]
    );
    return res.rows[0] || null;
  } catch {
    return null;
  }
}

export async function loginShopAdminAction(shopId: string, name: string, pin: string) {
  const { loginUserAction } = await import("./authActions");
  return loginUserAction({ shopId, userType: "admin", name, pin });
}

export async function updateShopAdminAction(
  shopId: string,
  currentPin: string,
  newName: string,
  newPin: string,
  confirmPin: string
) {
  return updateShopAdminProfileAction(currentPin, newName, newPin, confirmPin);
}

export async function registerShopAdminAction(
  shopId: string,
  name: string,
  pin: string,
  confirmPin: string
) {
  return registerInitialShopAdminAction(shopId, name, pin, confirmPin);
}
