import { describe, it, expect } from 'vitest'

describe('근무 시간 산정 및 급여 계산 로직 검증 테스트', () => {
  const calculateWorkHours = (inTime: string, outTime: string | null) => {
    if (!outTime) return 0
    const [inH, inM] = inTime.split(':').map(Number)
    const [outH, outM] = outTime.split(':').map(Number)

    const inMinutes = inH * 60 + inM
    const outMinutes = outH * 60 + outM

    const diffMinutes = outMinutes - inMinutes
    if (diffMinutes <= 0) return 0

    return diffMinutes / 60
  }

  it('출퇴근 시간에 따른 근무 시간 산정 검증', () => {
    // 09:00 ~ 18:00 (9시간)
    expect(calculateWorkHours('09:00', '18:00')).toBe(9)

    // 09:30 ~ 13:30 (4시간)
    expect(calculateWorkHours('09:30', '13:30')).toBe(4)

    // 퇴근 시간이 출근 시간보다 빠른 경우 (0시간)
    expect(calculateWorkHours('18:00', '09:00')).toBe(0)

    // 퇴근 시간이 없는 경우 (0시간)
    expect(calculateWorkHours('09:00', null)).toBe(0)
  })

  it('시급 적용 월별 예상 급여 계산 검증', () => {
    const hourlyWage = 10000

    const records = [
      { clock_in: '09:00', clock_out: '18:00' }, // 9시간
      { clock_in: '10:00', clock_out: '15:00' }, // 5시간
    ]

    const totalHours = records.reduce((acc, cur) => {
      return acc + calculateWorkHours(cur.clock_in, cur.clock_out)
    }, 0)

    expect(totalHours).toBe(14)

    const estimatedPay = Math.round(totalHours * hourlyWage)
    expect(estimatedPay).toBe(140000)
  })

  it('퇴근 시간이 출근 시간보다 빠를 때의 유효성 검사', () => {
    const validateTimes = (inTime: string, outTime: string) => {
      if (!outTime) return true
      return inTime <= outTime
    }

    expect(validateTimes('09:00', '18:00')).toBe(true)
    expect(validateTimes('18:00', '09:00')).toBe(false)
  })
})
