import { getDaysInMonth, parseISO } from "date-fns";

export interface CompensationData {
  id?: string;
  staff_id?: string;
  pay_type: "hourly" | "monthly";
  time_unit?: "minute" | "hour";
  amount_krw: number;
  effective_from: string;
  created_at?: string;
}

export interface AttendanceItem {
  id?: string;
  staff_id?: string;
  work_date: string;
  clock_in: string;
  clock_out: string;
  total_minutes: number;
  created_at?: string;
  updated_at?: string;
}

export interface MonthlyEarningsResult {
  amount: number;
  totalMinutes: number;
  payType: "hourly" | "monthly" | null;
  timeUnit: "minute" | "hour";
  error?: string;
}

/**
 * 출퇴근 문자열(HH:mm) 사이의 총 근무 분을 계산합니다.
 */
export function calculateMinutesBetween(clockIn: string, clockOut: string): number {
  if (!clockIn || !clockOut) return 0;
  const [inH, inM] = clockIn.split(":").map(Number);
  const [outH, outM] = clockOut.split(":").map(Number);
  if (isNaN(inH) || isNaN(inM) || isNaN(outH) || isNaN(outM)) return 0;
  const inMinutes = inH * 60 + inM;
  const outMinutes = outH * 60 + outM;
  return Math.max(0, outMinutes - inMinutes);
}

/**
 * 시급 정산: minute(분 단위 정밀 정산: 반올림) 또는 hour(시간 단위 정산: 버림)
 */
export function calculateHourlyWage(
  totalMinutes: number,
  hourlyRate: number,
  timeUnit: "minute" | "hour" = "minute"
): number {
  if (totalMinutes <= 0 || hourlyRate <= 0) return 0;
  if (timeUnit === "hour") {
    const hours = Math.floor(totalMinutes / 60);
    return hours * hourlyRate;
  }
  // minute 단위 정밀 정산 (원 단위 반올림)
  return Math.round((totalMinutes / 60) * hourlyRate);
}

/**
 * 월급 정산: 월 중간 적용 시 해당 월 전체 일수 대비 유효 일수로 일할 계산
 */
export function calculateMonthlyWage(
  monthlyRate: number,
  effectiveFrom: string,
  targetMonth: string
): number {
  if (monthlyRate <= 0) return 0;
  const [yearStr, monthStr] = targetMonth.split("-");
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  if (isNaN(year) || isNaN(month)) return monthlyRate;

  const totalDays = getDaysInMonth(new Date(year, month - 1));
  const monthStartStr = `${targetMonth}-01`;
  const monthEndStr = `${targetMonth}-${String(totalDays).padStart(2, "0")}`;

  if (effectiveFrom <= monthStartStr) {
    return monthlyRate;
  }
  if (effectiveFrom > monthEndStr) {
    return 0;
  }

  // 월 중간 시작: effectiveFrom부터 월말까지 유효 일수 계산
  const effectiveDay = parseInt(effectiveFrom.split("-")[2], 10);
  const activeDays = Math.max(0, totalDays - effectiveDay + 1);
  return Math.round((monthlyRate / totalDays) * activeDays);
}

/**
 * 직원의 특정 월 총 급여 및 근무시간을 산출합니다.
 */
export function calculateStaffMonthlyEarnings(
  compensations: CompensationData[] = [],
  attendances: AttendanceItem[] = [],
  targetMonth: string
): MonthlyEarningsResult {
  if (!compensations || compensations.length === 0) {
    return {
      amount: 0,
      totalMinutes: 0,
      payType: null,
      timeUnit: "minute",
      error: "급여 적용 조건이 없어 계산할 수 없습니다.",
    };
  }

  // targetMonth에 유효한 가장 최신 급여 조건 찾기
  const [yearStr, monthStr] = targetMonth.split("-");
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const totalDays = getDaysInMonth(new Date(year, month - 1));
  const monthEndStr = `${targetMonth}-${String(totalDays).padStart(2, "0")}`;

  const eligibleComps = [...compensations]
    .filter((c) => c.effective_from <= monthEndStr)
    .sort((a, b) => b.effective_from.localeCompare(a.effective_from));

  if (eligibleComps.length === 0) {
    return {
      amount: 0,
      totalMinutes: 0,
      payType: null,
      timeUnit: "minute",
      error: "급여 적용 조건이 없어 계산할 수 없습니다.",
    };
  }

  const latestComp = eligibleComps[0];
  const timeUnit = latestComp.time_unit || "minute";

  if (latestComp.pay_type === "monthly") {
    const amount = calculateMonthlyWage(
      latestComp.amount_krw,
      latestComp.effective_from,
      targetMonth
    );
    return {
      amount,
      totalMinutes: 0,
      payType: "monthly",
      timeUnit,
    };
  }

  // 시급 직원의 경우 해당 월의 출퇴근 기록 집계
  const monthAttendances = attendances.filter((att) =>
    att.work_date.startsWith(targetMonth)
  );
  const totalMinutes = monthAttendances.reduce((acc, cur) => acc + (cur.total_minutes || 0), 0);
  const amount = calculateHourlyWage(totalMinutes, latestComp.amount_krw, timeUnit);

  return {
    amount,
    totalMinutes,
    payType: "hourly",
    timeUnit,
  };
}

export const calculateMonthlySettlement = calculateStaffMonthlyEarnings;
