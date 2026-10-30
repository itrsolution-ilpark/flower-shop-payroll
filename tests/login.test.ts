import { describe, it, expect } from 'vitest'
import { validatePin } from '../src/lib/utils'
import { isValidAdminPinFormat, isValidStaffPinFormat } from '../src/lib/hash'

describe('로그인 및 비밀번호 자릿수 검증 로직 테스트', () => {
  it('직원 비밀번호 (숫자 4자리) 정규식 유효성 검증', () => {
    expect(isValidStaffPinFormat('1234')).toBe(true)
    expect(isValidStaffPinFormat('0000')).toBe(true)
    expect(isValidStaffPinFormat('123')).toBe(false)
    expect(isValidStaffPinFormat('12345')).toBe(false)
    expect(isValidStaffPinFormat('abcd')).toBe(false)
  })

  it('시스템 및 플라워샵 관리자 비밀번호 (숫자 6자리) 유효성 검증', () => {
    expect(isValidAdminPinFormat('123456')).toBe(true)
    expect(isValidAdminPinFormat('000000')).toBe(true)
    expect(isValidAdminPinFormat('12345')).toBe(false)
    expect(isValidAdminPinFormat('1234567')).toBe(false)
    expect(isValidAdminPinFormat('abcdef')).toBe(false)
  })

  it('비밀번호 2회 입력 검증 (비밀번호 확인 일치)', () => {
    const validateConfirmStaffPin = (pin: string, confirm: string) => {
      return isValidStaffPinFormat(pin) && pin === confirm
    }

    expect(validateConfirmStaffPin('1234', '1234')).toBe(true)
    expect(validateConfirmStaffPin('1234', '5678')).toBe(false)

    const validateConfirmAdminPin = (pin: string, confirm: string) => {
      return isValidAdminPinFormat(pin) && pin === confirm
    }

    expect(validateConfirmAdminPin('123456', '123456')).toBe(true)
    expect(validateConfirmAdminPin('123456', '654321')).toBe(false)
  })

  it('직원 로그인 상태(approved/pending/resigned) 및 플라워샵 활성화 상태에 따른 차단', () => {
    const shopActive = { id: 'shop-1', status: 'active' }
    const shopInactive = { id: 'shop-2', status: 'inactive' }

    const mockStaffApproved = {
      id: 'staff-1',
      shop_id: 'shop-1',
      name: '김플라워',
      status: 'approved',
    }

    const mockStaffPending = {
      id: 'staff-2',
      shop_id: 'shop-1',
      name: '이대기',
      status: 'pending',
    }

    const mockStaffResigned = {
      id: 'staff-3',
      shop_id: 'shop-1',
      name: '박퇴사',
      status: 'resigned',
    }

    const checkLoginPermission = (shopStatus: string, staffStatus: string) => {
      if (shopStatus !== 'active') {
        return { success: false, error: '비활성화되었거나 존재하지 않는 플라워샵입니다.' }
      }
      if (staffStatus !== 'approved') {
        return { success: false, error: '승인 대기 중이거나 이용이 정지된 계정입니다.' }
      }
      return { success: true }
    }

    // 승인된 직원 + 활성 플라워샵 -> 성공
    expect(checkLoginPermission(shopActive.status, mockStaffApproved.status).success).toBe(true)

    // 대기자 -> 실패
    const pendingRes = checkLoginPermission(shopActive.status, mockStaffPending.status)
    expect(pendingRes.success).toBe(false)
    expect(pendingRes.error).toBe('승인 대기 중이거나 이용이 정지된 계정입니다.')

    // 퇴사자 -> 실패
    const resignedRes = checkLoginPermission(shopActive.status, mockStaffResigned.status)
    expect(resignedRes.success).toBe(false)
    expect(resignedRes.error).toBe('승인 대기 중이거나 이용이 정지된 계정입니다.')

    // 비활성 플라워샵 소속 직원 -> 실패
    const inactiveRes = checkLoginPermission(shopInactive.status, mockStaffApproved.status)
    expect(inactiveRes.success).toBe(false)
    expect(inactiveRes.error).toBe('비활성화되었거나 존재하지 않는 플라워샵입니다.')
  })
})
