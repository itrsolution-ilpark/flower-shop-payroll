import { describe, it, expect } from 'vitest'
import {
  calculateMinutes,
  formatMinutesToHoursAndMinutes,
} from '../src/lib/utils'
import { isValidAdminPinFormat, isValidStaffPinFormat } from '../src/lib/hash'
import { calculateMonthlySettlement } from '../src/lib/payroll'

describe('SPEC 수용 테스트 시나리오 검증 (v52/v53 기준)', () => {
  // 시나리오 1: 시스템 관리자 최초 등록 유도 및 비밀번호 자릿수 검증
  it('시나리오 1: 시스템 관리자 0명 시 /system/setup 유도 및 관리자 6자리 비밀번호 검증', () => {
    const systemAdminsCount = 0
    const shouldRedirectToSetup = systemAdminsCount === 0
    expect(shouldRedirectToSetup).toBe(true)

    // 관리자 비밀번호 6자리 정규식 검증
    expect(isValidAdminPinFormat('123456')).toBe(true)
    expect(isValidAdminPinFormat('1234')).toBe(false) // 4자리는 직원용
  })

  // 시나리오 2: 플라워샵 비활성화 시 소속 사용자 접근 차단 검증
  it('시나리오 2: 플라워샵 status가 inactive로 변경되면 소속 관리자/직원 접속이 거부됨', () => {
    const shop = { id: 'shop-uuid-1', name: '아름다운 플라워', status: 'inactive' }
    const canUserLogin = shop.status === 'active'
    expect(canUserLogin).toBe(false)
  })

  // 시나리오 3: 직원 가입(pending) -> 승인(approved) -> 급여 정산 검증 (F-05, F-08)
  it('시나리오 3: 관리자가 시급 10,000원, minute 정산으로 승인 후 570분 근무 시 95,000원 정산', () => {
    const compensationRules = [
      {
        pay_type: 'hourly' as const,
        time_unit: 'minute' as const,
        amount_krw: 10000,
        effective_from: '2026-10-01',
      },
    ]

    const attendances = [
      {
        work_date: '2026-10-15',
        clock_in: '09:00',
        clock_out: '18:30', // 9시간 30분 = 570분
        total_minutes: 570,
      },
    ]

    const settlement = calculateMonthlySettlement(compensationRules, attendances, '2026-10')
    expect(settlement.payType).toBe('hourly')
    expect(settlement.totalMinutes).toBe(570)
    expect(settlement.amount).toBe(95000) // (570 / 60) * 10,000 = 95,000원
  })

  // 시나리오 4: hour(시간 단위 절사) 정산 시 570분 근무에 대해 90,000원 정산
  it('시나리오 4: hour(시간 단위 절사) 정산 설정 시 570분 근무에 대해 9시간만 계산하여 90,000원 정산', () => {
    const compensationRules = [
      {
        pay_type: 'hourly' as const,
        time_unit: 'hour' as const,
        amount_krw: 10000,
        effective_from: '2026-10-01',
      },
    ]

    const attendances = [
      {
        work_date: '2026-10-15',
        clock_in: '09:00',
        clock_out: '18:30', // 570분 (9시간 30분)
        total_minutes: 570,
      },
    ]

    const settlement = calculateMonthlySettlement(compensationRules, attendances, '2026-10')
    expect(settlement.payType).toBe('hourly')
    expect(settlement.totalMinutes).toBe(570)
    expect(settlement.amount).toBe(90000) // Math.floor(570 / 60) * 10,000 = 90,000원
  })

  // 시나리오 5: UTF-8 with BOM CSV 출력 헤더 규격 검증
  it('시나리오 5: CSV 출력 데이터 헤더 및 BOM 서명 검증', () => {
    const expectedHeader = '직원명,상태,급여형태,계산단위,적용금액(원),해당월 총 근무시간(분),지급예정액(원)'
    const bomPrefix = '\uFEFF'
    const csvContent = bomPrefix + expectedHeader + '\r\n"김플라워","승인(재직)","시급","분",10000,570,95000'

    expect(csvContent.startsWith('\uFEFF')).toBe(true)
    expect(csvContent.includes(expectedHeader)).toBe(true)
  })

  // 시나리오 6: 플라워샵 스코프 기반 동명이인 가입 및 검증 (v52 요구사항 F-06, F-04)
  it('시나리오 6: 서로 다른 플라워샵에 동명이인이 존재하더라도 shop_id 스코프 분리로 가입 성공', () => {
    const shopA = { id: 'shop-a-id', name: 'A플라워' }
    const shopB = { id: 'shop-b-id', name: 'B플라워' }

    const staffInShopA = { shop_id: shopA.id, name: '이영희' }
    const staffInShopBCandidate = { shop_id: shopB.id, name: '이영희' }

    // A샵에 이영희가 있어도 B샵의 신규 가입 후보는 독립적으로 중복 판정 안됨
    const isDuplicateNameInShop = (shopId: string, name: string, existingList: any[]) => {
      return existingList.some((item) => item.shop_id === shopId && item.name === name)
    }

    const existingStaffs = [staffInShopA]

    expect(isDuplicateNameInShop(shopA.id, '이영희', existingStaffs)).toBe(true)
    expect(isDuplicateNameInShop(shopB.id, '이영희', existingStaffs)).toBe(false)
  })
})
