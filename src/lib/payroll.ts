import { getDaysInMonth } from "date-fns";

export interface CompensationItem {
  id?: string;
  staff_id?: string;
  pay_type: "hourly" | "monthly";
  amount_krw: number;
  effective_from: string;
  created_at?: string;
}

export interface AttendanceRecord {
  id?: string;
  staff_id?: string;
  work_date: string;
  clock_in?: string;
  clock_out?: string;
  total_minutes: number;
  created_at?: string;
  updated_at?: string;
}

/**
 * 특정 날짜에 유효한 가장 최근 급여 조건 조회
 */
export function getEffectiveCompensationForDate(
  compensations: CompensationItem[],
  dateStr: string
): CompensationItem | null {
  if (!compensations || compensations.length === 0) return null;
  const sorted = [...compensations].sort((a, b) =>
    a.effective_from.localeCompare(b.effective_from)
  );

  let effective: CompensationItem | null = null;
  for (const c of sorted) {
    if (c.effective_from <= dateStr) {
      effective = c;
    }
  }
  return effective;
}

/**
 * SPEC F-09, F-10: 월별 근무 및 급여 정산 계산
 * - 시급: 각 근무 기록별 근무 분 기준으로 일자별 유효 시급을 적용하여 계산 후 원 단위 반올림
 * - 월급: 달력 일수 기준으로 일할 계산 후 원 단위 반올림
 */
export function calculateStaffMonthlyEarnings(
  compensations: CompensationItem[],
  attendanceList: AttendanceRecord[],
  targetMonth: string
): {
  error: string | null;
  amount: number;
  totalMinutes: number;
  payType: "hourly" | "monthly" | null;
} {
  if (!compensations || compensations.length === 0) {
    return {
      error: "급여 적용 조건이 없어 계산할 수 없습니다.",
      amount: 0,
      totalMinutes: 0,
      payType: null,
    };
  }

  const sortedComp = [...compensations].sort((a, b) =>
    a.effective_from.localeCompare(b.effective_from)
  );
  const latestComp = sortedComp[sortedComp.length - 1];

  if (latestComp.pay_type === "hourly") {
    let totalMins = 0;
    let totalPay = 0;

    for (const att of attendanceList) {
      const comp = getEffectiveCompensationForDate(sortedComp, att.work_date);
      if (comp && comp.pay_type === "hourly") {
        const mins = att.total_minutes || 0;
        totalMins += mins;
        totalPay += (mins / 60) * comp.amount_krw;
      }
    }

    return {
      error: null,
      amount: Math.round(totalPay),
      totalMinutes: totalMins,
      payType: "hourly",
    };
  } else {
    // 월급 직원 달력 일수 기준 일할 계산
    const [year, month] = targetMonth.split("-").map(Number);
    const totalDaysInMonth = getDaysInMonth(new Date(year, month - 1));
    let weightedMonthlyPay = 0;

    for (let day = 1; day <= totalDaysInMonth; day++) {
      const dateStr = `${targetMonth}-${String(day).padStart(2, "0")}`;
      const comp = getEffectiveCompensationForDate(sortedComp, dateStr);
      if (comp && comp.pay_type === "monthly") {
        weightedMonthlyPay += comp.amount_krw / totalDaysInMonth;
      }
    }

    return {
      error: null,
      amount: Math.round(weightedMonthlyPay),
      totalMinutes: 0,
      payType: "monthly",
    };
  }
}

/**
 * 수용 테스트 및 모듈 호환성을 위한 별칭 export
 */
export const calculateMonthlySettlement = calculateStaffMonthlyEarnings;
