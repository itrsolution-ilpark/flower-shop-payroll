"use server";

import { query } from "@/lib/db";
import { getDaysInMonth } from "date-fns";
import { ActionResult } from "./systemAdminActions";

export interface AttendanceItem {
  id?: string;
  staff_id: string;
  work_date: string; // YYYY-MM-DD
  clock_in: string; // HH:mm
  clock_out: string; // HH:mm
  total_minutes: number;
}

/**
 * F-08: 시급 직원 출퇴근 기록 저장/수정
 */
export async function saveAttendanceAction(
  staffId: string,
  workDate: string,
  clockIn: string,
  clockOut: string
): Promise<ActionResult> {
  if (!staffId || !workDate || !clockIn || !clockOut) {
    return { success: false, error: "출근 및 퇴근 시각을 모두 입력해주세요." };
  }

  if (clockOut <= clockIn) {
    return { success: false, error: "퇴근 시간은 출근 시간보다 늦어야 합니다." };
  }

  const [inH, inM] = clockIn.split(":").map(Number);
  const [outH, outM] = clockOut.split(":").map(Number);
  const totalMinutes = outH * 60 + outM - (inH * 60 + inM);

  if (totalMinutes <= 0) {
    return { success: false, error: "퇴근 시간은 출근 시간보다 늦어야 합니다." };
  }

  try {
    // 퇴사 직원인지 확인
    const staffCheck = await query(
      "SELECT status FROM staff WHERE id = $1 LIMIT 1",
      [staffId]
    );
    if (!staffCheck.rows || staffCheck.rows.length === 0) {
      return { success: false, error: "직원 정보를 찾을 수 없습니다." };
    }
    if (staffCheck.rows[0].status === "resigned") {
      return { success: false, error: "퇴사한 직원은 새 근무 기록을 추가할 수 없습니다." };
    }

    const clockInVal = clockIn.length === 5 ? `${clockIn}:00` : clockIn;
    const clockOutVal = clockOut.length === 5 ? `${clockOut}:00` : clockOut;

    await query(
      `INSERT INTO attendance (staff_id, work_date, clock_in, clock_out, total_minutes, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       ON CONFLICT (staff_id, work_date)
       DO UPDATE SET
         clock_in = EXCLUDED.clock_in,
         clock_out = EXCLUDED.clock_out,
         total_minutes = EXCLUDED.total_minutes,
         updated_at = NOW()`,
      [staffId, workDate, clockInVal, clockOutVal, totalMinutes]
    );

    return { success: true };
  } catch {
    return { success: false, error: "근무 기록 저장 중 오류가 발생했습니다." };
  }
}

/**
 * F-09: 직원의 특정 월 출퇴근 기록 조회
 */
export async function getStaffAttendanceMonthAction(
  staffId: string,
  monthStr: string
): Promise<AttendanceItem[]> {
  try {
    const [year, month] = monthStr.split("-").map(Number);
    const startDate = `${monthStr}-01`;
    const lastDay = getDaysInMonth(new Date(year, month - 1));
    const endDate = `${monthStr}-${String(lastDay).padStart(2, "0")}`;

    const res = await query(
      `SELECT id, staff_id, TO_CHAR(work_date, 'YYYY-MM-DD') AS work_date,
              TO_CHAR(clock_in, 'HH24:MI') AS clock_in,
              TO_CHAR(clock_out, 'HH24:MI') AS clock_out,
              total_minutes
       FROM attendance
       WHERE staff_id = $1
         AND work_date >= $2
         AND work_date <= $3
       ORDER BY work_date ASC`,
      [staffId, startDate, endDate]
    );

    return res.rows || [];
  } catch {
    return [];
  }
}
