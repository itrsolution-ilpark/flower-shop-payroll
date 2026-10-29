# 플라워샵 근무 및 급여 관리 시스템 — 기술·데이터 설계

> 문서 버전 v3 · 완성도 100% · 마지막 수정 2026. 10. 29. 10시 35분 37초
> 이 문서만 보고 AI(또는 개발자)가 개발해도 거의 같은 결과가 나오도록 작성되었습니다.

## 기본 정보

| 항목 | 값 |
| --- | --- |
| 사이트 이름 | 플라워샵 근무 및 급여 관리 시스템 |
| 영문 식별자(slug) | flower-shop-payroll |
| 개발 방식(framework) | nextjs |
| 데이터베이스 사용 | 예 (Supabase) |
| 배포 | GitHub → Vercel (무료) |

## 1. 데이터 모델

### 데이터베이스 테이블 설계 (Supabase)

#### 1. `staff` (직원 정보)
- `id` (uuid, Primary Key, 기본값 `gen_random_uuid()`)
- `name` (text, 직원 이름, Not Null)
- `pin_code` (text, 4자리 비밀번호, Not Null)
- `hourly_wage` (integer, 시급, Not Null, 기본값 10000)
- `is_admin` (boolean, 관리자 여부, 기본값 false)
- `created_at` (timestamp, 기본값 `now()`)

#### 2. `attendance` (출퇴근 기록)
- `id` (uuid, Primary Key, 기본값 `gen_random_uuid()`)
- `staff_id` (uuid, `staff.id` 외래키, On Delete Cascade)
- `work_date` (date, 근무 일자, Not Null)
- `clock_in` (time, 출근 시간, Not Null)
- `clock_out` (time, 퇴근 시간, Nullable)
- `created_at` (timestamp, 기본값 `now()`)

### RLS(행 수준 보안) 정책
- `staff` 테이블: 익명 및 인증된 사용자 모두 SELECT 허용(직원 선택용), INSERT는 누구나 가능(회원가입), UPDATE는 본인 또는 `is_admin=true` 관리자 허용.
- `attendance` 테이블: `staff_id`가 본인이거나 `is_admin=true`인 관리자만 SELECT, INSERT, UPDATE, DELETE 허용.

## 2. 기술 스택과 폴더 구조

### 기술 스택
- **프레임워크**: Next.js (App Router)
- **스타일링**: Tailwind CSS
- **데이터베이스 및 인증**: Supabase
- **배포**: Vercel

### 환경 변수 (.env.local)
```text
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 폴더 구조
```text
src/
  app/
    page.tsx (로그인/메인)
    signup/
      page.tsx (회원가입)
    employee/
      dashboard/page.tsx (직원 마이페이지)
    admin/
      page.tsx (관리자 대시보드)
      attendance/page.tsx (근무 기록 관리)
      staff/page.tsx (직원 관리)
  components/
    Navbar.tsx
    Button.tsx
  lib/
    supabase.ts
```

## 3. 품질 기준 (성능·보안·접근성)

### 품질 기준
- **보안**: 4자리 PIN은 평문 저장 또는 간단한 인증 대조 수행, 관리자 페이지는 `is_admin` 플래그 세션 검증 필수
- **성능**: 모바일 환경에서 페이지 로딩 시간 2초 이내
- **예외 처리**: 퇴근 시간이 출근 시간보다 빠를 경우 "퇴근 시간은 출근 시간보다 빠를 수 없습니다." 경고 팝업 노출

## 변경 이력

| 버전 | 일시 | 변경 내용 |
| --- | --- | --- |
| v3 | 2026. 10. 29. 9시 46분 31초 | 최종 감수: 최종 감수 완료: 모든 섹션 간의 일관성 확보, 수용 기준 및 테스트 시나리오 구체화, 기술 폴더 구조 및 환경 변수 명시. |
| v2 | 2026. 10. 29. 9시 45분 17초 | 사용자가 휴게 시간 차감 없음 및 관리자 전용 직원 계정(4자리 PIN) 방식을 확정하여 관련 문서 및 가정/미정 사항을 업데이트했습니다. |
| v1 | 2026. 10. 29. 9시 44분 35초 | 초기 요구사항을 기반으로 화원 시급 및 근무 관리 프로그램의 전체 개발 문서 초안을 작성했습니다. |
