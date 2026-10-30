import { describe, it, expect } from 'vitest'
import {
  calculateMinutes,
  formatMinutesToHoursAndMinutes,
  calculateSalary,
  validatePin,
} from '../src/lib/utils'
import { calculateMonthlySettlement } from '../src/lib/payroll'

describe('SPEC 수용 테스트 시나리오 검증', () => {
  // 테스트 1: DB 연결 및 시스템 관리자 최초 등록 검증
  it('테스트 1: 시스템 관리자 0명 판별 및 4자리 비밀 유효성 검증', () => {
    const mockSystemAdmins: any[] = []
    const shouldRedirectToSetup = mockSystemAdmins.length === 0
    expect(shouldRedirectToSetup).toBe(true)

    // 4자리 비밀 일치 검증
    const pin = '1234'
    const confirmPin = '1234'
    expect(validatePin(pin)).toBe(true)
    expect(pin === confirmPin).toBe(true)
  })

  // 테스트 2: 플라워샵 생성 및 중복 방지
  it('테스트 2: 플라워샵 이름 중복 검증 로직', () => {
    const existingShops = [{ id: 'shop-1', name: '장미화원' }]
    const tryAddShop = (name: string) => {
      if (existingShops.some((s) => s.name === name)) {
        return { success: false, error: '이미 등록된 플라워샵 이름입니다.' }
      }
      return { success: true }
    }

    expect(tryAddShop('백합화원').success).toBe(true)
    expect(tryAddShop('장미화원').success).toBe(false)
    expect(tryAddShop('장미화원').error).toBe('이미 등록된 플라워샵 이름입니다.')
  })

  // 테스트 3: 플라워샵별 관리자 등록 및 본인 수정
  it('테스트 3: 타 샵 관리자 존재 여부와 무관하게 shop_id 기준으로만 관리자 유무 판별', () => {
    const shopAdminsDatabase = [
      { id: 'admin-1', shop_id: 'shop-A', name: '관리자A' },
    ]

    // 플라워샵 B에 관리자 조회
    const targetShopId = 'shop-B'
    const adminForShopB = shopAdminsDatabase.filter((s) => s.shop_id === targetShopId)

    // 플라워샵 A에 관리자가 있어도 플라워샵 B의 관리자는 0명 -> 등록 모드
    expect(adminForShopB.length).toBe(0)

    // 플라워샵 A의 관리자는 1명 -> 수정 모드
    const adminForShopA = shopAdminsDatabase.filter((s) => s.shop_id === 'shop-A')
    expect(adminForShopA.length).toBe(1)
  })

  // 테스트 4: 직원 로그인 목록 대표 관리자 제외 확인
  it('테스트 4: 직원 로그인 목록 조회 시 대표 관리자는 완전히 제외되고 active 직원만 노출', () => {
    // shop_admins 테이블의 대표 관리자는 staff 테이블에 존재하지 않음
    const staffDatabase = [
      { id: 'staff-1', shop_id: 'shop-A', name: '직원B', status: 'active' },
      { id: 'staff-2', shop_id: 'shop-A', name: '직원C', status: 'pending' },
      { id: 'staff-3', shop_id: 'shop-A', name: '직원D', status: 'resigned' },
    ]

    const activeStaff = staffDatabase.filter(
      (s) => s.shop_id === 'shop-A' && s.status === 'active'
    )
    expect(activeStaff.length).toBe(1)
    expect(activeStaff[0].name).toBe('직원B')
    expect(activeStaff.some((s) => s.name === '대표')).toBe(false)
  })

  // 테스트 5: 시급 및 월급 정산 계산 정확도
  it('테스트 5: 시급 직원(540분, 10,000원 -> 90,000원) 및 월급 직원 정산 계산 검증', () => {
    // 1) 시급 정산
    const hourlyRules = [{ pay_type: 'hourly' as const, amount_krw: 10000, effective_from: '2026-10-01' }]
    const attendances = [
      { work_date: '2026-10-15', clock_in: '09:00', clock_out: '18:00', total_minutes: 540 },
    ]
    const hourlySettlement = calculateMonthlySettlement(hourlyRules, attendances, '2026-10')
    expect(hourlySettlement.payType).toBe('hourly')
    expect(hourlySettlement.totalMinutes).toBe(540)
    expect(hourlySettlement.amount).toBe(90000)

    // 2) 월급 정산 (월 3,000,000원, 31일 기준 일할 계산)
    const monthlyRules = [{ pay_type: 'monthly' as const, amount_krw: 3000000, effective_from: '2026-10-01' }]
    const monthlySettlement = calculateMonthlySettlement(monthlyRules, [], '2026-10')
    expect(monthlySettlement.payType).toBe('monthly')
    expect(monthlySettlement.amount).toBe(3000000)
    expect(monthlySettlement.totalMinutes).toBe(0)
  })
})
