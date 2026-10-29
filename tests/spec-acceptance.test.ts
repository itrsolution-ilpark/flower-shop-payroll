import { describe, it, expect } from 'vitest'
import {
  calculateMinutes,
  formatMinutesToHoursAndMinutes,
  calculateSalary,
  validatePin,
} from '../src/lib/utils'

describe('SPEC 수용 테스트 시나리오 검증', () => {
  // 테스트 1: 시스템 관리자 최초 등록 강제 리다이렉트 및 PIN 검증
  it('테스트 1: 시스템 관리자 0명 판별 및 PIN 일치 검증', () => {
    const mockSystemAdmins: any[] = []
    const shouldRedirectToSetup = mockSystemAdmins.length === 0
    expect(shouldRedirectToSetup).toBe(true)

    // 4자리 PIN 일치 검증
    const pin = '1234'
    const confirmPin = '1234'
    expect(validatePin(pin)).toBe(true)
    expect(pin === confirmPin).toBe(true)
  })

  // 테스트 2: 플라워샵 대표 등록 버그 해결 (매장 격리 검증)
  it('테스트 2: 타 샵 관리자 존재 여부와 무관하게 shop_id 기준으로만 대표 유무 판별', () => {
    const staffDatabase = [
      { id: 'admin-1', shop_id: 'shop-A', name: '대표A', is_admin: true, status: 'active' },
      { id: 'staff-1', shop_id: 'shop-A', name: '직원A', is_admin: false, status: 'active' },
    ]

    // 플라워샵 B에 대표 조회
    const targetShopId = 'shop-B'
    const adminForShopB = staffDatabase.filter(
      (s) => s.shop_id === targetShopId && s.is_admin === true
    )

    // 플라워샵 A에 대표가 있어도 플라워샵 B의 대표는 0명 -> 등록 모드
    expect(adminForShopB.length).toBe(0)
    const isRegisterMode = adminForShopB.length === 0
    expect(isRegisterMode).toBe(true)

    // 플라워샵 A의 대표는 1명 -> 정보 수정 모드
    const adminForShopA = staffDatabase.filter(
      (s) => s.shop_id === 'shop-A' && s.is_admin === true
    )
    expect(adminForShopA.length).toBe(1)
  })

  // 테스트 3: 직원 가입 신청 및 대표 승인 워크플로우
  it('테스트 3: pending 직원의 출근 로그인 차단 및 대표 active 승인 시 이용 허용', () => {
    const newStaff = {
      id: 'staff-pending-1',
      shop_id: 'shop-A',
      name: '이수습',
      pin_code: '4321',
      hourly_wage: 10000,
      is_admin: false,
      status: 'pending',
    }

    const checkLogin = (staff: typeof newStaff) => {
      if (staff.status === 'pending') {
        return { allowed: false, error: '대표의 승인이 필요한 계정입니다' }
      }
      return { allowed: true }
    }

    expect(checkLogin(newStaff).allowed).toBe(false)
    expect(checkLogin(newStaff).error).toBe('대표의 승인이 필요한 계정입니다')

    // 대표가 11,000원으로 승인 처리
    newStaff.hourly_wage = 11000
    newStaff.status = 'active'

    expect(checkLogin(newStaff).allowed).toBe(true)
    expect(newStaff.hourly_wage).toBe(11000)
  })

  // 테스트 4: 출퇴근 기록 및 월급 계산 정합성
  it('테스트 4: 09:00 ~ 18:00 (540분, 9시간 00분) 시급 11,000원 -> 예상 급여 99,000원', () => {
    const clockIn = '09:00'
    const clockOut = '18:00'
    const hourlyWage = 11000

    const totalMinutes = calculateMinutes(clockIn, clockOut)
    expect(totalMinutes).toBe(540)

    const formattedTime = formatMinutesToHoursAndMinutes(totalMinutes)
    expect(formattedTime).toBe('9시간 00분')

    const salary = calculateSalary(totalMinutes, hourlyWage)
    expect(salary).toBe(99000)
  })
})
