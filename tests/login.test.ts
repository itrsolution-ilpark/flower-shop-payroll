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

  it('PIN 번호 2회 입력 검증 (Validation) 테스트', () => {
    const validateConfirmPin = (pin: string, confirm: string) => {
      return pin === confirm && pin.length === 4
    }

    expect(validateConfirmPin('1234', '1234')).toBe(true)
    expect(validateConfirmPin('1234', '5678')).toBe(false)
  })

  it('직원 로그인 상태 및 PIN 일치 여부 확인', () => {
    const mockStaffActive = {
      id: 'staff-uuid-1',
      shop_id: 'shop-uuid-1',
      name: '김플라워',
      pin_code: '7777',
      is_admin: false,
      hourly_wage: 10000,
      status: 'active',
    }

    const mockStaffPending = {
      id: 'staff-uuid-2',
      shop_id: 'shop-uuid-1',
      name: '이대기',
      pin_code: '1111',
      is_admin: false,
      hourly_wage: 10000,
      status: 'pending',
    }

    const loginAttempt = (staff: typeof mockStaffActive, pin: string) => {
      if (pin !== staff.pin_code) {
        return { success: false, error: 'PIN 번호가 일치하지 않습니다.' }
      }
      if (!staff.is_admin && staff.status !== 'active') {
        return { success: false, error: '승인 대기 중이거나 퇴사한 직원은 로그인할 수 없습니다.' }
      }
      return { success: true, user: staff }
    }

    const successRes = loginAttempt(mockStaffActive, '7777')
    expect(successRes.success).toBe(true)
    expect(successRes.user?.name).toBe('김플라워')

    const pendingRes = loginAttempt(mockStaffPending, '1111')
    expect(pendingRes.success).toBe(false)
    expect(pendingRes.error).toContain('승인 대기')
  })
})
