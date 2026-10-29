import { getDaysInMonth } from "date-fns";

export interface CompensationRule {
  pay_type: "hourly" | "monthly";
  amount_krw: number;
  effective_from: string; // YYYY-MM-DD
}

export interface AttendanceItem {
  work_date: string; // YYYY-MM-DD
  clock_in: string; // HH:mm or HH:mm:ss
  clock_out: string;
  total_minutes: number;
}

/**
 * 출퇴근 시간을 기준으로 총 근무 분(minutes)을 계산합니다.
 * 퇴근 시각이 출근 시각보다 빠른 경우 0 반환
 */
export function calculateMinutes(clockIn: string, clockOut: string | null): number {
  if (!clockOut) return 0;
  const [inH, inM] = clockIn.split(":").map(Number);
  const [outH, outM] = clockOut.split(":").map(Number);

  const inMinutes = inH * 60 + inM;
  const outMinutes = outH * 60 + outM;

  const diff = outMinutes - inMinutes;
  return diff > 0 ? diff : 0;
}

export function formatMinutesToHoursAndMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}시간 ${remainingMinutes.toString().padStart(2, "0")}분`;
}

/**
 * 특정 일자에 유효한 가장 최근의 급여 조건을 반환합니다.
 */
export function getEffectiveCompensation(
  rules: CompensationRule[],
  targetDate: string
): CompensationRule | null {
  const sorted = [...rules].sort((a, b) => a.effective_from.localeCompare(b.effective_from));
  let valid: CompensationRule | null = null;
  for (const rule of sorted) {
    if (rule.effective_from <= targetDate) {
      valid = rule;
    }
  }
  return valid;
}

/**
 * 월별 급여 정산 (시급 및 월급 일할 계산 포함, 최종 합계 원 단위 반올림)
 */
export function calculateMonthlySettlement(
  rules: CompensationRule[],
  attendances: AttendanceItem[],
  targetMonth: string // YYYY-MM
): {
  error: string | null;
  payType: "hourly" | "monthly" | null;
  amount: number;
  totalMinutes: number;
} {
  if (!rules || rules.length === 0) {
    return {
      error: "급여 적용 조건이 없어 계산할 수 없습니다.",
      payType: null,
      amount: 0,
      totalMinutes: 0,
    };
  }

  const [yearStr, monthStr] = targetMonth.split("-");
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const daysInMonth = getDaysInMonth(new Date(year, month - 1));

  // 해당 월 말일 기준 유효 급여 조건으로 유형 판단
  const endOfMonthDate = `${targetMonth}-${String(daysInMonth).padStart(2, "0")}`;
  const effectiveRuleAtMonthEnd = getEffectiveCompensation(rules, endOfMonthDate);

  if (!effectiveRuleAtMonthEnd) {
    // 월초에도 유효한 게 전혀 없는지 확인
    const anyEffective = rules.some((r) => r.effective_from <= endOfMonthDate);
    if (!anyEffective) {
      return {
        error: "급여 적용 조건이 없어 계산할 수 없습니다.",
        payType: null,
        amount: 0,
        totalMinutes: 0,
      };
    }
  }

  const currentPayType = effectiveRuleAtMonthEnd?.pay_type ?? rules[rules.length - 1].pay_type;

  if (currentPayType === "hourly") {
    let totalMins = 0;
    let totalEarnings = 0;

    for (const record of attendances) {
      if (!record.work_date.startsWith(targetMonth)) continue;
      const rule = getEffectiveCompensation(rules, record.work_date);
      if (rule && rule.pay_type === "hourly") {
        totalMins += record.total_minutes;
        totalEarnings += (record.total_minutes / 60) * rule.amount_krw;
      }
    }

    return {
      error: null,
      payType: "hourly",
      amount: Math.round(totalEarnings),
      totalMinutes: totalMins,
    };
  } else {
    // 월급 직원: 달력 일수 기준 일할 계산
    let weightedPay = 0;

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${targetMonth}-${String(day).padStart(2, "0")}`;
      const rule = getEffectiveCompensation(rules, dateStr);
      if (rule && rule.pay_type === "monthly") {
        weightedPay += rule.amount_krw / daysInMonth;
      }
    }

    return {
      error: null,
      payType: "monthly",
      amount: Math.round(weightedPay),
      totalMinutes: 0,
    };
  }
}
