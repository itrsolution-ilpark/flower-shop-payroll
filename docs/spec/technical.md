# 플라워샵 근무 및 급여 관리 시스템 — 기술·데이터 설계

> 문서 버전 v7 · 완성도 100% · 마지막 수정 2026. 10. 29. 11시 2분 40초
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

#### 1. `shops` (화원 정보)
- `id` (uuid, Primary Key, 기본값 `gen_random_uuid()`)
- `name` (text, 화원 이름, Not Null)
- `created_at` (timestamp, 기본값 `now()`)

#### 2. `staff` (직원 및 관리자 정보)
- `id` (uuid, Primary Key, 기본값 `gen_random_uuid()`)
- `shop_id` (uuid, `shops.id` 외래키, On Delete Cascade, Not Null)
- `name` (text, 직원 이름, Not Null)
- `pin_code` (text, 4자리 비밀번호, Not Null)
- `hourly_wage` (integer, 시급, Not Null, 기본값 10000)
- `is_admin` (boolean, 관리자 여부, 기본값 false)
- `status` (text, 직원 상태: `pending` 대기, `active` 재직, `resigned` 퇴사, 기본값 `'pending'`)
- `created_at` (timestamp, 기본값 `now()`)

#### 3. `attendance` (출퇴근 기록)
- `id` (uuid, Primary Key, 기본값 `gen_random_uuid()`)
- `staff_id` (uuid, `staff.id` 외래키, On Delete Cascade)
- `work_date` (date, 근무 일자, Not Null)
- `clock_in` (time, 출근 시간, Not Null)
- `clock_out` (time, 퇴근 시간, Nullable)
- `created_at` (timestamp, 기본값 `now()`)

### RLS(행 수준 보안) 정책
- `shops` 테이블: SELECT, INSERT 누구나 가능.
- `staff` 테이블: SELECT는 누구나 가능(화원별 로그인 드롭다운용), INSERT는 누구나 가능(회원가입/최초설정), UPDATE는 `is_admin=true` 관리자 또는 본인 허용.
- `attendance` 테이블: `status='active'`인 본인 직원 또는 `is_admin=true` 관리자만 접근 허용.

## 2. 기술 스택과 폴더 구조

### 기술 스택과 폴더 구조
- **프레임워크**: Next.js (App Router)
- **스타일링**: Tailwind CSS
- **데이터베이스 및 인증**: Supabase
- **배포**: Vercel

### 환경 변수 명세 (`.env.local`)
```text
NEXT_PUBLIC_SUPABASE_URL=실제_슈퍼베이스_프로젝트_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=실제_슈퍼베이스_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=실제_슈퍼베이스_SERVICE_ROLE_KEY
```

### 폴더 구조
```text
src/
  app/
    page.tsx (화원 선택 및 메인 로그인)
    shop/
      register/page.tsx (화원 등록)
    signup/
      page.tsx (직원 회원가입)
    admin/
      setup/page.tsx (화원별 최초 관리자 설정)
      page.tsx (관리자 대시보드)
      attendance/page.tsx (근무 기록 관리)
    employee/
      dashboard/page.tsx (직원 마이페이지)
  lib/
    supabase.ts
```

## 3. 품질 기준 (성능·보안·접근성)

### 품질 기준
- **입력 검증(Validation)**: PIN 번호 등록 및 수정 시 '비밀번호 확인' 필드와 일치하는지 프론트엔드에서 검증 후 제출 허용
- **상태 제어**: `pending` 또는 `resigned` 상태의 직원은 로그인 및 출퇴근 등록 차단 및 안내 메시지 노출
- **보안**: 화원별 관리자 설정 완료 후에는 `/admin/setup` 경로 중복 등록 방지 로직 적용

## 변경 이력

| 버전 | 일시 | 변경 내용 |
| --- | --- | --- |
| v7 | 2026. 10. 29. 11시 1분 28초 | 최종 감수: 최종 감수 완료: 모든 섹션의 일관성을 맞추고 수용 기준 및 테스트 시나리오를 구체화함 |
| v6 | 2026. 10. 29. 11시 1분 10초 | 다중 화원(매장) 지원 기능 추가: 화원(플라워샵) 마스터 테이블 도입, 화원 선택 후 직원 로그인 및 관리자 접속 구조로 개편, 비밀번호 확인(Validation) 절차 명시 |
| v5 | 2026. 10. 29. 10시 41분 19초 | 최종 감수: 최종 감수 완료: 모든 섹션 상호 검증 및 기술 스택/환경변수/테스트 시나리오 구체화 |
| v4 | 2026. 10. 29. 10시 41분 16초 | 관리자 최초 등록 프로세스, 직원 상태(재직/퇴사/대기) 관리, 관리자 승인 후 출퇴근 등록 가능하도록 기능 및 데이터 모델 보강 |
| v3 | 2026. 10. 29. 9시 46분 31초 | 최종 감수: 최종 감수 완료: 모든 섹션 간의 일관성 확보, 수용 기준 및 테스트 시나리오 구체화, 기술 폴더 구조 및 환경 변수 명시. |
| v2 | 2026. 10. 29. 9시 45분 17초 | 사용자가 휴게 시간 차감 없음 및 관리자 전용 직원 계정(4자리 PIN) 방식을 확정하여 관련 문서 및 가정/미정 사항을 업데이트했습니다. |
| v1 | 2026. 10. 29. 9시 44분 35초 | 초기 요구사항을 기반으로 화원 시급 및 근무 관리 프로그램의 전체 개발 문서 초안을 작성했습니다. |
