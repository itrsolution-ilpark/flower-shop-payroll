# 플라워샵 근무 관리 — 기술·데이터 설계

> 문서 버전 v23 · 완성도 100% · 마지막 수정 2026. 10. 29. 13시 47분 41초
> 이 문서만 보고 AI(또는 개발자)가 개발해도 거의 같은 결과가 나오도록 작성되었습니다.

## 기본 정보

| 항목 | 값 |
| --- | --- |
| 사이트 이름 | 플라워샵 근무 관리 |
| 영문 식별자(slug) | flower-shop-payroll |
| 개발 방식(framework) | nextjs |
| 데이터베이스 사용 | 예 (Supabase) |
| 배포 | GitHub → Vercel (무료) |

## 1. 데이터 모델

### 데이터베이스 스키마 및 RLS 보안 정책 (Supabase PostgreSQL)

#### 1. 테이블 정의 스키마

```sql
-- 1. 시스템 마스터 관리자 (시스템 전체 관리)
CREATE TABLE system_admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  pin_code TEXT NOT NULL, -- 4자리 숫자 PIN
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. 플라워샵 매장
CREATE TABLE shops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. 플라워샵 구성원 (대표 및 직원 통합 관리)
CREATE TABLE staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  pin_code TEXT NOT NULL, -- 4자리 숫자 PIN
  hourly_wage INTEGER NOT NULL DEFAULT 10000, -- 원 단위 기본 시급
  is_admin BOOLEAN NOT NULL DEFAULT false, -- true: 플라워샵 대표, false: 일반 직원
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending'(승인대기), 'active'(재직), 'resigned'(퇴사)
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT uq_shop_staff UNIQUE (shop_id, name)
);

-- 4. 일별 출퇴근 기록
CREATE TABLE attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  work_date DATE NOT NULL DEFAULT CURRENT_DATE,
  clock_in TIME NOT NULL,
  clock_out TIME,
  total_minutes INTEGER DEFAULT 0, -- 퇴근 시 (clock_out - clock_in) 계산된 분 단위 근무시간
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT uq_staff_work_date UNIQUE (staff_id, work_date)
);
```

#### 2. 플라워샵 대표 등록 버그 원천 해결 쿼리
- **버그 원인**: 기존 로직에서 매장 조건 없이 전체 테이블에서 `is_admin = true`를 검색하여 타 플라워샵의 관리자가 있으면 신규 매장인데도 관리자가 이미 존재한다고 오판단함.
- **해결 쿼리 (특정 shop_id 한정 스코핑)**:
```sql
-- 반드시 URL 파라미터 또는 선택된 shop_id를 WHERE 절에 명시
SELECT id, name, is_admin, hourly_wage, status 
FROM staff 
WHERE shop_id = :targetShopId AND is_admin = true 
LIMIT 1;
```
- 결과가 0건이면 무조건 **대표 등록 모드**, 1건 이상이면 기존 대표 정보 수정 모드로 동작.

#### 3. Row Level Security (RLS) 정책 사양
- 멀티 테넌트 데이터 보호를 위해 모든 테이블에 `ALTER TABLE ... ENABLE ROW LEVEL SECURITY;` 적용.
- `system_admins`: 인증 확인용 API(Server Actions/Route Handler)를 통해 Service Role로 안전하게 조회 및 등록.
- `shops`: 메인 화면 조회를 위해 익명/공개 읽기(`SELECT`) 허용. 생성/수정은 시스템 관리자 세션 검증 후 허용.
- `staff`: 동일한 `shop_id`를 가진 사용자 간 본인 소속 매장 확인 허용. 타 매장 데이터 노출 방지.
- `attendance`: 직원은 본인의 `staff_id` 데이터만 조회/등록 가능, 플라워샵 대표는 본인 매장(`shop_id`) 소속 직원의 모든 근태 데이터 조회/수정 가능.

## 2. 기술 스택과 폴더 구조

### 기술 스택
- **프레임워크**: Next.js 14+ (App Router, TypeScript)
- **스타일링**: Tailwind CSS, Lucide React (아이콘)
- **데이터베이스/인증**: Supabase PostgreSQL
- **배포 인프라**: GitHub 연동 Vercel (Serverless)

### 환경 변수 명세 (.env.local)
```text
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 전체 프로젝트 파일 및 폴더 트리 구조
```text
flower-shop-payroll/
├── package.json
├── tsconfig.json
├── tailwind.config.js
├── next.config.js
├── .env.local
├── public/
│   └── favicon.ico
└── src/
    ├── app/
    │   ├── layout.tsx                # 전역 루트 레이아웃 (폰트 설정, 토스트 컨테이너)
    │   ├── page.tsx                  # 메인: 플라워샵 검색 및 선택 허브 링크
    │   ├── system-setup/
    │   │   └── page.tsx              # 시스템 관리자 최초 등록 화면
    │   ├── shop/
    │   │   ├── register/
    │   │   │   └── page.tsx          # 시스템 관리자 전용: 플라워샵 등록/수정 화면
    │   │   └── [id]/
    │   │       └── page.tsx          # 개별 플라워샵 허브 (대표/직원 분기 화면)
    │   ├── signup/
    │   │   └── page.tsx              # 플라워샵 직원 가입 신청 화면
    │   ├── admin/
    │   │   ├── setup/
    │   │   │   └── page.tsx          # 플라워샵별 대표 관리자 등록/수정 화면 (버그 해결)
    │   │   ├── page.tsx              # 플라워샵 대표 대시보드 (직원 승인 및 시급 관리)
    │   │   └── attendance/
    │   │       └── page.tsx          # 플라워샵 대표 전용 근태 보완 및 월별 급여 집계 화면
    │   └── employee/
    │       └── dashboard/
    │           └── page.tsx          # 직원 마이페이지 (출퇴근 등록 및 급여 내역)
    ├── components/
    │   ├── Navbar.tsx                # 상단 헤더 네비게이션
    │   ├── PinModal.tsx              # 4자리 PIN 입력 및 검증 모달
    │   └── ui/                       # Button, Input, Modal, Table 공통 컴포넌트
    └── lib/
        ├── supabaseClient.ts         # 브라우저용 Supabase 클라이언트
        ├── supabaseServer.ts         # 서버 액션/API용 Supabase 클라이언트
        └── utils.ts                  # 날짜 포맷, 급여 계산 (ROUND((분/60)*시급)) 유틸
```

## 3. 품질 기준 (성능·보안·접근성)

### 품질 및 보안 검증 기준
1. **4자리 PIN 보안 및 정규식**:
   - 시스템 관리자, 대표, 직원의 모든 PIN 번호는 정확히 4자리 숫자(`^[0-9]{4}$`)여야 합니다.
   - 신규 등록 및 변경 시 '비밀번호 확인' 필드를 필수로 입력받아 100% 일치해야 저장 버튼이 활성화됩니다.
2. **멀티 테넌트 격리성**:
   - 모든 매장 데이터(`staff`, `attendance`)는 URL 파라미터의 `shop_id`와 인증된 세션의 `shop_id`를 교차 검증하여 타 매장 침범을 완전히 방지합니다.
3. **정확한 근무 시간 및 급여 산출 공식**:
   - 출근 기록 후 퇴근 전까지는 '근무 중' 상태로 표시되며 정산 집계에 포함되지 않습니다.
   - 일별 근무 분 = `퇴근 시간(분) - 출근 시간(분)` (휴게 시간 차감 없음).
   - 월 총 급여 산출: `Math.round((월 누적 근무 분 / 60) * staff.hourly_wage)` (원 단위 반올림 처리).

## 변경 이력

| 버전 | 일시 | 변경 내용 |
| --- | --- | --- |
| v23 | 2026. 10. 29. 13시 32분 4초 | 최종 감수: 최종 감수를 완료하여 3계층 권한(시스템 관리자/플라워샵 대표/직원), DB 스키마 및 RLS 보안 정책, 실제 동작 폴더 트리와 정적 공개 smokeRoutes 검증을 완비했습니다. |
| v22 | 2026. 10. 29. 13시 4분 11초 | 3계층 권한(시스템 관리자/플라워샵 대표/직원) 분리와 플라워샵별 관리자 중복 판별 버그 해결 로직을 개발 문서 전반에 정밀하게 반영하고 완성도를 완료 상태로 갱신 |
| v21 | 2026. 10. 29. 12시 58분 22초 | 최종 감수: 최종 감수 완료: '화원' 명칭을 '플라워샵'으로 전면 통일, 3계층 권한(시스템 관리자, 플라워샵 대표, 플라워샵 직원) 구조 명확화 및 관리자 중복 등록 버그 해결 방안을 반영한 최종 개발 문서 확정 |
| v20 | 2026. 10. 29. 12시 58분 13초 | 플라워샵 명칭 전면 적용 및 시스템 관리자/플라워샵 대표/직원 3계층 권한 모델 확정, 시스템 관리자 기반 플라워샵 등록 및 샵별 관리자 중복 등록 오류 해결 반영 |
| v19 | 2026. 10. 29. 12시 54분 51초 | 최종 감수: 최종 감수 완료: '화원' 명칭 전면 '플라워샵' 수정 및 계층형 권한 체계(시스템 관리자 / 플라워샵 대표 / 플라워샵 직원) 완비, 관리자 중복 등록 버그 방지 쿼리 고도화 반영 |
| v18 | 2026. 10. 29. 12시 54분 42초 | 시스템 관리자(System Admin) 계정 최초 등록 플로우 추가 및 플라워샵별 대표/직원 권한 체계 정비, 관리자 등록 중복 오류 해결 방안 명시 |
| v17 | 2026. 10. 29. 12시 45분 55초 | 최종 감수: 최종 감수 완료: 모든 '화원' 명칭을 '플라워샵'으로 통일하고, 시스템 관리자/플라워샵 대표/플라워샵 직원 간의 계층형 권한 구조 및 관리자 중복 등록 버그 수정 사항을 문서 전체에 반영 |
| v16 | 2026. 10. 29. 12시 45분 48초 | '화원' 단어를 '플라워샵'으로 일괄 변경하고, 시스템 관리자/샵별 대표/샵별 직원 계층형 권한 모델을 정의하였으며, 샵별 관리자 중복 판별 오류(쿼리 조건 누락 및 세션 오인식)를 해결하는 로직을 반영했습니다. |
| v15 | 2026. 10. 29. 12시 35분 8초 | 최종 감수: 최종 감수 완료: 플라워샵 근무 관리 시스템의 모든 명세, 화면, 데이터베이스, 테스트 시나리오를 일치시키고 개발 가능한 완성도 높은 문서로 확정함. |
| v14 | 2026. 10. 29. 12시 35분 0초 | 사이트 명칭을 '플라워샵 근무 관리'로 변경하고 메인 화면에 플라워샵 검색 및 목록 배치 구조 개선, 허브/로그인 화면의 관리자 등록 여부에 따른 조건부 UI 적용 완료 |
| v13 | 2026. 10. 29. 12시 21분 44초 | 최종 감수: 최종 감수 완료: 메인 화면을 플라워샵 목록 및 등록 전용으로 개편하고, 선택 시 허브 화면(/shop/[id])으로 이동하는 구조로 확정 |
| v12 | 2026. 10. 29. 12시 21분 33초 | '화원' 용어를 '플라워샵'으로 전면 수정하고, 메인 화면(`/`)에서는 플라워샵 등록 및 선택만 수행하며 선택 시 해당 플라워샵의 '관리자/직원 등록 및 로그인 화면'으로 이동하도록 플로우 개편 |
| v11 | 2026. 10. 29. 11시 18분 30초 | 화원별 관리자 등록 중 발생하던 '관리자가 표시되지 않는데 이미 존재한다고 나오는 오류'에 대한 원인 분석 및 해결 방안(서버/DB 쿼리 정합성 체크)을 품질 기준과 테스트 계획에 보완했습니다. |
| v10 | 2026. 10. 29. 11시 14분 33초 | 초기화면에서 화원 선택 후 관리자 화면 진입 시 해당 화원 고정, 관리자 존재 여부에 따른 수정/등록 모드 분기 및 타이틀('화원별 관리자 등록 화면') 반영 |
| v9 | 2026. 10. 29. 11시 8분 30초 | 관리자 등록 시 발생하는 오류 방지 및 관리자 계정 노출 누락 문제를 해결하기 위해, 관리자 계정도 일반 직원과 동일하게 `is_admin=true` 플래그를 가진 `staff` 테이블의 레코드로 통합 관리하고, 메인 로그인/화원 선택 화면 및 관리자 로그인/설정 화면의 로직을 보완했습니다. |
| v8 | 2026. 10. 29. 11시 4분 26초 | 관리자 등록 중 발생하는 오류(중복 등록 방지, 화원별 관리자 존재 여부 체크 등)에 대한 예외 처리 및 안정성 강화 가이드를 문서에 반영 |
| v7 | 2026. 10. 29. 11시 1분 28초 | 최종 감수: 최종 감수 완료: 모든 섹션의 일관성을 맞추고 수용 기준 및 테스트 시나리오를 구체화함 |
| v6 | 2026. 10. 29. 11시 1분 10초 | 다중 화원(매장) 지원 기능 추가: 화원(플라워샵) 마스터 테이블 도입, 화원 선택 후 직원 로그인 및 관리자 접속 구조로 개편, 비밀번호 확인(Validation) 절차 명시 |
| v5 | 2026. 10. 29. 10시 41분 19초 | 최종 감수: 최종 감수 완료: 모든 섹션 상호 검증 및 기술 스택/환경변수/테스트 시나리오 구체화 |
| v4 | 2026. 10. 29. 10시 41분 16초 | 관리자 최초 등록 프로세스, 직원 상태(재직/퇴사/대기) 관리, 관리자 승인 후 출퇴근 등록 가능하도록 기능 및 데이터 모델 보강 |
| v3 | 2026. 10. 29. 9시 46분 31초 | 최종 감수: 최종 감수 완료: 모든 섹션 간의 일관성 확보, 수용 기준 및 테스트 시나리오 구체화, 기술 폴더 구조 및 환경 변수 명시. |
| v2 | 2026. 10. 29. 9시 45분 17초 | 사용자가 휴게 시간 차감 없음 및 관리자 전용 직원 계정(4자리 PIN) 방식을 확정하여 관련 문서 및 가정/미정 사항을 업데이트했습니다. |
| v1 | 2026. 10. 29. 9시 44분 35초 | 초기 요구사항을 기반으로 화원 시급 및 근무 관리 프로그램의 전체 개발 문서 초안을 작성했습니다. |
