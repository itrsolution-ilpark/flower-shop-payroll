"use server";

import { query } from "@/lib/db";
import { getSession } from "@/lib/session";
import { calculateStaffMonthlyEarnings } from "@/lib/payroll";

/**
 * F-09: 월별 정산 내역 CSV 데이터 생성 (UTF-8 with BOM 형식)
 * 헤더: 직원명,상태,급여형태,계산단위,적용금액(원),해당월 총 근무시간(분),지급예정액(원)
 */
export async function exportMonthlyPayrollCsvAction(
  shopId: string,
  monthStr: string
): Promise<{ success: boolean; data?: string; filename?: string; error?: string }> {
  try {
    const session = await getSession();
    if (!session || (session.role !== "shop_admin" && session.role !== "system_admin")) {
      return { success: false, error: "권한이 없습니다." };
    }

    const targetShopId = session.role === "shop_admin" ? session.shopId : shopId;
    if (!targetShopId) {
      return { success: false, error: "플라워샵을 찾을 수 없습니다." };
    }

    // 직원 목록
    const staffRes = await query<{
      id: string;
      name: string;
      status: "pending" | "approved" | "resigned";
      pay_type?: "hourly" | "monthly";
      time_unit?: "minute" | "hour";
      amount_krw?: number;
      effective_from?: string;
    }>(`
      SELECT 
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
      WHERE st.shop_id = $1
      ORDER BY st.name ASC
    `, [targetShopId]);

    // 해당 월 출퇴근 내역
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
    `, [targetShopId, monthStr]);

    const attMap: Record<string, any[]> = {};
    attRes.rows.forEach((att) => {
      if (!attMap[att.staff_id]) attMap[att.staff_id] = [];
      attMap[att.staff_id].push(att);
    });

    // CSV 행 생성
    const rows: string[] = [];
    rows.push("직원명,상태,급여형태,계산단위,적용금액(원),해당월 총 근무시간(분),지급예정액(원)");

    for (const st of staffRes.rows) {
      const staffAtts = attMap[st.id] || [];
      const compList = st.pay_type
        ? [
            {
              pay_type: st.pay_type,
              time_unit: st.time_unit || "minute",
              amount_krw: st.amount_krw || 0,
              effective_from: st.effective_from || monthStr + "-01",
            },
          ]
        : [];

      const calc = calculateStaffMonthlyEarnings(compList, staffAtts, monthStr);

      const statusLabel =
        st.status === "approved" ? "승인(재직)" : st.status === "pending" ? "승인대기" : "퇴사";
      const payTypeLabel =
        st.pay_type === "hourly" ? "시급" : st.pay_type === "monthly" ? "월급" : "미설정";
      const timeUnitLabel = st.time_unit === "hour" ? "시간" : "분";
      const amountLabel = st.amount_krw ? String(st.amount_krw) : "0";

      rows.push(
        `"${st.name}","${statusLabel}","${payTypeLabel}","${timeUnitLabel}",${amountLabel},${calc.totalMinutes},${calc.amount}`
      );
    }

    // UTF-8 with BOM
    const csvContent = "\uFEFF" + rows.join("\r\n");
    const sanitizedMonth = monthStr.replace("-", "_");
    const filename = `flower_payroll_${sanitizedMonth}.csv`;

    return {
      success: true,
      data: csvContent,
      filename,
    };
  } catch {
    return { success: false, error: "CSV 생성 중 오류가 발생했습니다." };
  }
}
