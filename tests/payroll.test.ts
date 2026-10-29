import { describe, it, expect } from 'vitest'
import { calculateMinutes, formatMinutesToHoursAndMinutes, calculateSalary } from '../src/lib/utils'

describe('근무 시간 산정 및 급여 계산 로직 검증 테스트', () => {
  it('출퇴근 시간에 따른 근무 시간(분) 산정 검증', () => {
    // 09:00 ~ 18:00 (540분 = 9시간)
    expect(calculateMinutes('09:00', '18:00')).toBe(540)

    // 09:30 ~ 13:30 (240분 = 4시간)
    expect(calculateMinutes('09:30', '13:30')).toBe(240)

    // 퇴근 시간이 출근 시간보다 빠른 경우 (0분)
    expect(calculateMinutes('18:00', '09:00')).toBe(0)

    // 퇴근 시간이 없는 경우 (0분)
    expect(calculateMinutes('09:00', null)).toBe(0)
  })

  it('시급 적용 월별 예상 급여 계산 검증 (분 단위 집계 후 원 단위 반올림)', () => {
    const hourlyWage = 10000

    const records = [
      { clock_in: '09:00', clock_out: '18:00' }, // 540분
      { clock_in: '10:00', clock_out: '15:00' }, // 300분
    ]

    const totalMinutes = records.reduce((acc, cur) => {
      return acc + calculateMinutes(cur.clock_in, cur.clock_out)
    }, 0)

    expect(totalMinutes).toBe(840) // 14시간
    expect(formatMinutesToHoursAndMinutes(totalMinutes)).toBe('14시간 00분')

    const estimatedPay = calculateSalary(totalMinutes, hourlyWage)
    expect(estimatedPay).toBe(140000)
  })

  it('30분 단위 시급 비례 계산 정합성 (예: 1시간 30분, 시급 10,000원 -> 15,000원)', () => {
    const minutes = 90
    const wage = 10000
    expect(calculateSalary(minutes, wage)).toBe(15000)
  })
})
