# 플라워샵 근무 관리 — 기술·데이터 설계

> 문서 버전 v32 · 완성도 100% · 마지막 수정 2026. 10. 29. 17시 2분 59초
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

### 데이터베이스: Supabase PostgreSQL
모든 비밀은 원문으로 저장하지 않고 서버에서 해시해 저장합니다. `pin_hash`는 4자리 비밀의 단방향 해시이며, 화면이나 API 응답에 포함하지 않습니다. 금액은 원 단위 정수입니다. 아래는 구현에 필요한 테이블과 핵심 제약입니다.

```sql
CREATE TABLE system_admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  pin_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE shops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 플라워샵마다 관리자 한 명
CREATE TABLE shop_admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL UNIQUE REFERENCES shops(id) ON DELETE CASCADE,
  name text NOT NULL,
  pin_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  name text NOT NULL,
  pin_hash text NOT NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'active', 'resigned')),
  created_at timestamptz NOT NULL DEFAULT now(),
  resigned_at timestamptz,
  UNIQUE (shop_id, name)
);

-- 급여 이력. 적용일 이전에 시작한 가장 최근 항목을 해당 날짜에 적용
CREATE TABLE compensation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  pay_type text NOT NULL CHECK (pay_type IN ('hourly', 'monthly')),
  amount_krw integer NOT NULL CHECK (amount_krw > 0),
  effective_from date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (staff_id, effective_from)
);

CREATE TABLE attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  work_date date NOT NULL,
  clock_in time NOT NULL,
  clock_out time NOT NULL,
  total_minutes integer NOT NULL CHECK (total_minutes > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (staff_id, work_date),
  CHECK (clock_out > clock_in)
);

-- 로그인 실패 횟수 제한: 서버에서 해시된 식별자와 시간만 기록
CREATE TABLE auth_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identity_hash text NOT NULL,
  attempted_at timestamptz NOT NULL DEFAULT now(),
  succeeded boolean NOT NULL DEFAULT false
);

-- RLS 활성화 및 서비스 롤 전용 정책 설정
ALTER TABLE system_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE compensation ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Deny direct access system_admins" ON system_admins FOR ALL USING (false);
CREATE POLICY "Deny direct access shops" ON shops FOR ALL USING (false);
CREATE POLICY "Deny direct access shop_admins" ON shop_admins FOR ALL USING (false);
CREATE POLICY "Deny direct access staff" ON staff FOR ALL USING (false);
CREATE POLICY "Deny direct access compensation" ON compensation FOR ALL USING (false);
CREATE POLICY "Deny direct access attendance" ON attendance FOR ALL USING (false);
CREATE POLICY "Deny direct access auth_attempts" ON auth_attempts FOR ALL USING (false);
```

### 중요: auth_attempts 및 RLS 오류 방지 규칙
- `auth_attempts`를 포함한 모든 테이블에 `USING (false)` 정책이 걸려 있으므로, 브라우저 클라이언트(`createClient` with Anon Key)에서 직접 `auth_attempts`나 다른 테이블에 `INSERT`/`UPDATE`를 시도하면 Supabase가 거부(`Deny direct access`)합니다.
- 모든 데이터 변경 및 로그인 실패 기록(`auth_attempts` 기록 포함)은 **반드시 Next.js 서버(Route Handler 또는 Server Action)** 내부에서 `SUPABASE_SERVICE_ROLE_KEY`를 사용하는 전용 서버 클라이언트를 통해서만 수행해야 합니다. 브라우저에서 직접 Supabase 테이블에 접근하는 코드가 없도록 엄격히 분리합니다.

## 2. 기술 스택과 폴더 구조

### 기술 구성
- Next.js App Router와 TypeScript를 사용합니다. DB가 필요한 서버 기능은 Route Handler 또는 Server Action에서만 실행합니다.
- 화면 스타일은 Tailwind CSS로 구현합니다. 날짜 계산은 `date-fns`를 사용합니다.
- 데이터베이스는 Supabase PostgreSQL, 배포는 GitHub에서 Vercel 무료 플랜으로 합니다. 유료 외부 API는 사용하지 않습니다.
- 인증은 서버 검증 방식입니다. 성공한 로그인은 역할, 사용자 ID, 플라워샵 ID가 포함된 서명 쿠키로 유지합니다. 쿠키는 `HttpOnly`, `Secure`(운영 환경), `SameSite=Lax`로 설정하고, 비밀 자체는 쿠키에 넣지 않습니다. 쿠키 서명에는 `APP_SESSION_SECRET`을 사용합니다.
- 4자리 비밀의 추측 위험을 줄이기 위해 계정 식별자별 15분 동안 실패 5회가 발생하면 15분간 로그인을 차단합니다. 인증 오류는 ‘이름 또는 비밀을 확인해 주세요.’로 통일하고 어떤 항목이 틀렸는지 구분해 노출하지 않습니다.

### 환경 변수
| 이름 | 용도 |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 공개 키. 브라우저에서 직접 테이블 접근은 하지으며 RLS가 적용됨 |
| `SUPABASE_SERVICE_ROLE_KEY` | 서버 전용 DB 접근 키. 브라우저 번들 및 로그에 노출 금지 |
| `APP_SESSION_SECRET` | 서명 쿠키 검증용 비밀 문자열. 운영 환경에서 충분히 긴 무작위 값 사용 |

### 폴더 및 파일 구조
```text
flower-shop-payroll/
├── package.json
├── next.config.ts
├── tsconfig.json
├── tailwind.config.ts
├── .env.example
├── supabase/
│   └── migrations/
│       └── 0001_initial_schema.sql
└── src/
    ├── app/
    │   ├── layout.tsx
    │   ├── page.tsx
    │   ├── system-setup/page.tsx
    │   ├── shop/register/page.tsx
    │   ├── shop/[id]/page.tsx
    │   ├── signup/page.tsx
    │   ├── admin/setup/page.tsx
    │   ├── admin/page.tsx
    │   ├── admin/attendance/page.tsx
    │   ├── employee/dashboard/page.tsx
    │   └── api/
    │       └── auth/route.ts
    ├── components/
    │   ├── ProgramBanner.tsx
    │   ├── SecretField.tsx
    │   ├── MonthPicker.tsx
    │   ├── TimePicker.tsx
    │   └── StatusBadge.tsx
    └── lib/
        ├── supabase-server.ts
        ├── session.ts
        ├── auth.ts
        ├── permissions.ts
        ├── payroll.ts
        └── validation.ts
```

### 구현 경계
- `permissions.ts`에서 요청별 역할과 플라워샵·직원 소속을 확인합니다. 화면을 숨기는 것만으로 권한을 처리하지 말고 서버 작업마다 검증합니다.
- `payroll.ts`가 급여 계산을 한 곳에서 수행하여 직원 화면과 관리자 정산 화면에서 같은 결과를 사용합니다.
- `.env.local`은 로컬에서만 사용하고 GitHub에 올리지 않습니다. Vercel에도 위 환경 변수를 등록합니다.

## 3. 품질 기준 (성능·보안·접근성)

### 보안·정확성·접근성 기준
- 비밀은 정확히 숫자 4자리(`^[0-9]{4}$`)만 허용합니다. 확인 입력은 두 값이 정확히 일치해야 합니다. 원문 비밀은 DB, 로그, 오류 메시지, 응답에 남기지 않습니다.
- 시스템 관리자·플라워샵 관리자·직원 권한을 서버에서 매 요청 확인합니다. 직원은 본인 `staff_id`에 한해서만 기록을 조회·수정하고, 관리자는 본인 `shop_id` 데이터만 관리합니다.
- 플라워샵별 관리자 존재 확인과 등록은 현재 `shop_id`를 사용합니다. 관리자 한 명 제한은 DB의 고유 제약으로도 보장합니다.
- 로그인 실패는 계정 식별자별 15분 동안 5회까지 허용하고, 이후 15분 동안 차단합니다. 실패 사유는 ‘이름 또는 비밀을 확인해 주세요.’로 동일하게 표시합니다.
- 근무 기록은 직원·날짜당 하나입니다. 퇴근은 출근보다 늦어야 하고, 날짜를 넘기는 근무는 지원하지 않습니다. 근무 분은 출퇴근 시각 차이로 계산하며 휴게 시간을 빼지 않습니다.
- 적용 급여 조건은 근무 날짜 또는 급여 적용 날짜에 유효한 가장 최근 조건입니다. 시급 급여는 기록별 근무 분 기준, 월급은 달력 일수 기준으로 일할 계산합니다. 최종 합계는 원 단위 반올림합니다.
- 월급 직원은 근무 기록을 만들지 않습니다. 퇴사 직원의 과거 기록은 보존하지만 새 기록을 추가하지 못합니다.
- 모든 입력 필드는 키보드로 조작할 수 있고, 입력 라벨과 오류 문구를 화면 읽기 도구가 읽을 수 있도록 연결합니다. 버튼은 최소 높이 46px, 본문 기본 글자 크기는 16px입니다.
- 서버 오류가 발생하면 원문 SQL·키·스택 추적을 사용자에게 보여주지 않습니다. 저장 실패 시 입력 내용을 유지하고 재시도 안내를 표시합니다.

## 변경 이력

| 버전 | 일시 | 변경 내용 |
| --- | --- | --- |
| v32 | 2026. 10. 29. 17시 2분 17초 | 최종 감수: auth_attempts 테이블의 RLS 정책 오류 해결을 위한 RLS 우회 서버 전용 삽입 로직 및 문서 최종 감수 완료 |
| v31 | 2026. 10. 29. 17시 2분 9초 | auth_attempts 테이블의 RLS 정책 오류로 인해 관리자 등록 시 발생하는 접근 거부 문제를 해결하기 위해, 데이터베이스 마이그레이션 스크립트에 auth_attempts 테이블 관련 명시적 서비스 롤 우회 정책을 보강함. |
| v30 | 2026. 10. 29. 16시 18분 12초 | 최종 감수: 최종 감수 완료: 플라워샵별 관리자 본인 정보 수정 기능 및 직원 로그인 제외 규칙 반영 완료 |
| v29 | 2026. 10. 29. 16시 17분 54초 | 플라워샵별 관리자 로그인/인증 화면에 본인 정보 수정 기능 추가, 직원 로그인 대상에서 '대표(관리자)' 역할 제외 반영 |
| v28 | 2026. 10. 29. 16시 0분 32초 | 최종 감수: 최종 감수: 메인 화면의 플라워샵 관리 버튼 위치(상단 배너 바로 아래), 플라워샵 목록 영역 지정 및 '선택' 버튼 문구, '비밀' 텍스트 통일 및 전체 화면 세련된 구성 반영 완료 |
| v27 | 2026. 10. 29. 15시 37분 0초 | 최종 감수: 기존 요청을 최종 감수해 급여 유형·적용 시작일·월 선택을 포함하고, 화면·데이터·권한·오류 처리·테스트를 서로 일치하도록 구체화했습니다. |
| v26 | 2026. 10. 29. 15시 35분 30초 | 모든 화면에 공통 프로그램 배너를 추가하고, 사용자에게 보이는 PIN 문구를 ‘비밀’로 변경했습니다. 메인 화면의 ‘플라워샵 관리’ 버튼 위치와 플라워샵 목록 영역, ‘선택’ 버튼 문구를 구체화했습니다. |
| v25 | 2026. 10. 29. 14시 40분 1초 | 최종 감수: 최종 개발 착수를 위한 전 섹션 감수 완료: 환경 변수 명세(Service Role Key 포함), smokeRoutes 일치 검증, 테스트 시나리오 보강 |
| v24 | 2026. 10. 29. 14시 37분 6초 | 명칭 '허브'를 '메인'으로 변경, '대표' 문구 삭제 및 정제, 날짜/시간 선택식 출퇴근 등록/수정 지원, 로그인 목록 퇴사자 제외, 버튼 대괄호 표기 제거 및 UI/상태 뱃지 세련화 |
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
