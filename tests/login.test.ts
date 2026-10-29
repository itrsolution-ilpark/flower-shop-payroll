import { describe, it, expect } from 'vitest'

describe('로그인 및 PIN 번호 검증 로직 테스트', () => {
  it('4자리 PIN 번호 유효성 검증', () => {
    const validatePin = (pin: string) => {
      return pin.length === 4 && !isNaN(Number(pin))
    }

    expect(validatePin('1234')).toBe(true)
    expect(validatePin('123')).toBe(false)
    expect(validatePin('12345')).toBe(false)
    expect(validatePin('abcd')).toBe(false)
  })

  it('직원 로그인 정보 일치 여부 확인', () => {
    const mockStaff = {
      id: 'staff-uuid-1',
      name: '김플라워',
      pin_code: '7777',
      is_admin: false,
      hourly_wage: 10000,
    }

    const loginAttempt = (pin: string) => {
      if (pin === mockStaff.pin_code) {
        return { success: true, user: mockStaff }
      }
      return { success: false, error: 'PIN 번호가 일치하지 않습니다.' }
    }

    const successRes = loginAttempt('7777')
    expect(successRes.success).toBe(true)
    expect(successRes.user?.name).toBe('김플라워')

    const failRes = loginAttempt('0000')
    expect(failRes.success).toBe(false)
    expect(failRes.error).toBe('PIN 번호가 일치하지 않습니다.')
  })
})
