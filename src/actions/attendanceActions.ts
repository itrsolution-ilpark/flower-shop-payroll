"use server";

import { query } from "@/lib/db";
import { getSession } from "@/lib/session";
import { AttendanceItem } from "@/lib/payroll";

export type { AttendanceItem };

/**
 * 특정 직원의 특정 월 일별 출퇴근 기록 조회
 */
export async function getStaffAttendanceMonthAction(
  staffId: string,
  monthStr: string
): Promise<AttendanceItem[]> {
  try {
    const res = await query<AttendanceItem>(`
      SELECT id, staff_id, TO_CHAR(work_date, 'YYYY-MM-DD') as work_date,
             TO_CHAR(clock_in, 'HH24:MI') as clock_in,
             TO_CHAR(clock_out, 'HH24:MI') as clock_out,
             total_minutes
      FROM attendance
      WHERE staff_id = $1 AND TO_CHAR(work_date, 'YYYY-MM') = $2
      ORDER BY work_date ASC
    `, [staffId, monthStr]);
    return res.rows;
  } catch {
    return [];
  }
}

/**
 * 출퇴근 기록 저장 (직원 또는 관리자)
 */
export async function saveAttendanceAction(
  staffId: string,
  workDate: string,
  clockIn: string,
  clockOut: string
): Promise<{ success: boolean; error?: string }> {
  try {
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
    return { success: false, error: "출퇴근 기록 저장 중 오류가 발생했습니다." };
  }
}
