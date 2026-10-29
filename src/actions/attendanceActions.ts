"use server";

import { getServiceSupabase } from "@/lib/supabase-server";
import { getSession } from "@/lib/session";
import { calculateMinutes } from "@/lib/payroll";
import { ActionResult } from "./systemAdminActions";

export interface AttendanceRecordItem {
  id: string;
  staff_id: string;
  work_date: string;
  clock_in: string;
  clock_out: string;
  total_minutes: number;
}

/**
 * F-08: 출퇴근 기록 저장/수정 (시급 직원 본인 또는 관리자 보완)
 */
export async function recordAttendanceAction(
  staffId: string,
  workDate: string,
  clockIn: string,
  clockOut: string
): Promise<ActionResult> {
  const session = await getSession();
  if (!session) {
    return { success: false, error: "로그인이 필요합니다." };
  }

  // 직원은 본인 기록만, 관리자는 관리자 권한
  if (session.role === "employee" && session.userId !== staffId) {
    return { success: false, error: "본인의 근무 기록만 등록할 수 있습니다." };
  }

  if (!workDate || !clockIn || !clockOut) {
    return { success: false, error: "날짜, 출근 및 퇴근 시각을 모두 입력해주세요." };
  }

  if (clockOut <= clockIn) {
    return { success: false, error: "퇴근 시간은 출근 시간보다 늦어야 합니다." };
  }

  const totalMinutes = calculateMinutes(clockIn, clockOut);
  if (totalMinutes <= 0) {
    return { success: false, error: "퇴근 시간은 출근 시간보다 늦어야 합니다." };
  }

  const supabase = getServiceSupabase();

  // 대상 직원이 시급 직원인지 확인
  const { data: comp } = await supabase
    .from("compensation")
    .select("pay_type")
    .eq("staff_id", staffId)
    .order("effective_from", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (comp && comp.pay_type === "monthly") {
    return { success: false, error: "월급 직원은 출퇴근 기록을 입력하지 않습니다." };
  }

  // 대상 직원 상태 확인 (퇴사 직원은 추가 불가)
  const { data: staff } = await supabase
    .from("staff")
    .select("status")
    .eq("id", staffId)
    .single();

  if (!staff || staff.status !== "active") {
    return { success: false, error: "재직 상태인 직원만 근무를 등록할 수 있습니다." };
  }

  const { error } = await supabase.from("attendance").upsert(
    [
      {
        staff_id: staffId,
        work_date: workDate,
        clock_in: clockIn.length === 5 ? `${clockIn}:00` : clockIn,
        clock_out: clockOut.length === 5 ? `${clockOut}:00` : clockOut,
        total_minutes: totalMinutes,
        updated_at: new Date().toISOString(),
      },
    ],
    { onConflict: "staff_id,work_date" }
  );

  if (error) {
    return { success: false, error: "근무 기록 저장 중 오류가 발생했습니다." };
  }

  return { success: true };
}

/**
 * F-09, F-10: 특정 월 출퇴근 기록 조회
 */
export async function getMonthlyAttendanceAction(
  staffId: string,
  month: string // YYYY-MM
): Promise<AttendanceRecordItem[]> {
  const session = await getSession();
  if (!session) return [];

  // 직원은 본인 데이터만
  if (session.role === "employee" && session.userId !== staffId) {
    return [];
  }

  const supabase = getServiceSupabase();
  const startDate = `${month}-01`;
  const endDate = `${month}-31`;

  const { data } = await supabase
    .from("attendance")
    .select("id, staff_id, work_date, clock_in, clock_out, total_minutes")
    .eq("staff_id", staffId)
    .gte("work_date", startDate)
    .lte("work_date", endDate)
    .order("work_date", { ascending: true });

  return (data || []).map((r) => ({
    ...r,
    clock_in: r.clock_in.slice(0, 5),
    clock_out: r.clock_out.slice(0, 5),
  }));
}

/**
 * 직원용 대시보드 데이터 조회 (본인 정보, 급여 조건, 출퇴근 기록)
 */
export async function getEmployeeDashboardDataAction(targetMonth: string) {
  const session = await getSession();
  if (!session || session.role !== "employee") {
    return null;
  }

  const supabase = getServiceSupabase();

  const { data: staff } = await supabase
    .from("staff")
    .select("id, shop_id, name, status, shops(name)")
    .eq("id", session.userId)
    .single();

  if (!staff) return null;

  const { data: compList } = await supabase
    .from("compensation")
    .select("pay_type, amount_krw, effective_from")
    .eq("staff_id", session.userId)
    .order("effective_from", { ascending: true });

  const startDate = `${targetMonth}-01`;
  const endDate = `${targetMonth}-31`;

  const { data: attendances } = await supabase
    .from("attendance")
    .select("id, staff_id, work_date, clock_in, clock_out, total_minutes")
    .eq("staff_id", session.userId)
    .gte("work_date", startDate)
    .lte("work_date", endDate)
    .order("work_date", { ascending: true });

  return {
    staff: {
      id: staff.id,
      shopId: staff.shop_id,
      name: staff.name,
      shopName: (staff.shops as unknown as { name: string })?.name || "플라워샵",
      status: staff.status,
    },
    compensations: (compList || []).map((c) => ({
      pay_type: c.pay_type as "hourly" | "monthly",
      amount_krw: c.amount_krw,
      effective_from: c.effective_from,
    })),
    attendances: (attendances || []).map((a) => ({
      ...a,
      clock_in: a.clock_in.slice(0, 5),
      clock_out: a.clock_out.slice(0, 5),
    })),
  };
}
