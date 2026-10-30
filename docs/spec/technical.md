# 플라워샵 근무 관리 — 기술·데이터 설계

> 문서 버전 v55 · 완성도 100% · 마지막 수정 2026. 10. 30. 16시 52분 1초
> 이 문서만 보고 AI(또는 개발자)가 개발해도 거의 같은 결과가 나오도록 작성되었습니다.

## 기본 정보

| 항목 | 값 |
| --- | --- |
| 사이트 이름 | 플라워샵 근무 관리 |
| 영문 식별자(slug) | flower-shop-payroll |
| 개발 방식(framework) | nextjs |
| 데이터베이스 사용 | 예 (Neon PostgreSQL) |
| 배포 | GitHub → Vercel (무료) |

## 1. 데이터 모델

### 데이터베이스 스키마 (Neon PostgreSQL 전용 실행 DDL)

Neon PostgreSQL 환경에서 앱 실행 전 반드시 아래 DDL 스크립트를 Neon SQL Editor에서 실행하거나 `schema.sql` 파일을 통해 초기화해야 합니다.

```sql
-- 1. 기존 테이블 정리
DROP TABLE IF EXISTS auth_attempts CASCADE;
DROP TABLE IF EXISTS attendance CASCADE;
DROP TABLE IF EXISTS compensation CASCADE;
DROP TABLE IF EXISTS staff CASCADE;
DROP TABLE IF EXISTS shop_admins CASCADE;
DROP TABLE IF EXISTS shops CASCADE;
DROP TABLE IF EXISTS system_admins CASCADE;

-- 2. 시스템 관리자 테이블 (복수 등록 지원, 6자리 비밀번호)
CREATE TABLE system_admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  pin_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. 플라워샵 테이블 (상태: active, inactive)
CREATE TABLE shops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. 플라워샵 관리자 테이블 (플라워샵별 복수 등록 지원, 6자리 비밀번호)
CREATE TABLE shop_admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  pin_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (shop_id, name)
);

-- 5. 플라워샵 직원 테이블 (상태: pending, approved, resigned, 4자리 비밀번호)
CREATE TABLE staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  pin_hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'resigned')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resigned_at TIMESTAMPTZ,
  UNIQUE (shop_id, name)
);

-- 6. 직원 급여 조건 테이블 (시급/월급, 시간/분 단위 정산)
CREATE TABLE compensation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  pay_type TEXT NOT NULL CHECK (pay_type IN ('hourly', 'monthly')),
  time_unit TEXT NOT NULL DEFAULT 'minute' CHECK (time_unit IN ('minute', 'hour')),
  amount_krw INTEGER NOT NULL CHECK (amount_krw > 0),
  effective_from DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (staff_id, effective_from)
);

-- 7. 출퇴근 근무 기록 테이블 (시급 직원용 일별 기록)
CREATE TABLE attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  work_date DATE NOT NULL,
  clock_in TIME NOT NULL,
  clock_out TIME NOT NULL,
  total_minutes INTEGER NOT NULL CHECK (total_minutes > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (staff_id, work_date),
  CHECK (clock_out > clock_in)
);

-- 8. 무차별 대입 공격 방지 테이블
CREATE TABLE auth_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identity_hash TEXT NOT NULL,
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  succeeded BOOLEAN NOT NULL DEFAULT FALSE
);

-- 9. 성능 최적화 인덱스
CREATE INDEX idx_shops_status ON shops(status);
CREATE INDEX idx_shop_admins_shop_id ON shop_admins(shop_id);
CREATE INDEX idx_staff_shop_status ON staff(shop_id, status);
CREATE INDEX idx_compensation_staff ON compensation(staff_id, effective_from DESC);
CREATE INDEX idx_attendance_staff_date ON attendance(staff_id, work_date);
CREATE INDEX idx_auth_attempts_identity ON auth_attempts(identity_hash, attempted_at DESC);
```

## 2. 기술 스택과 폴더 구조

### 기술 스택 및 연동 사양
- **Framework**: Next.js 14+ (App Router, Server Actions)
- **Database**: Neon PostgreSQL (`pg` 커넥션 풀을 사용하여 서버 측에서만 접속)
- **Styling**: Tailwind CSS
- **Icons**: `lucide-react`
- **Utils**: `date-fns` (한국 시간대 및 월별 날짜 연산), `bcryptjs` (비밀번호 단방향 해싱)

### 필수 환경 변수 (Vercel 및 Local `.env` 설정)
- `DATABASE_URL`: Neon PostgreSQL 연결 문자열 (`postgres://[user]:[password]@[neon-host]/[dbname]?sslmode=require`, Server Actions 전용)
- `APP_SESSION_SECRET`: 서명된 HttpOnly 세션 쿠키 암호화용 32자 이상 보안 무작위 키

### 디렉터리 구조
```text
flower-shop-payroll/
├── src/
│   ├── app/
│   │   ├── layout.tsx                    // 루트 레이아웃 (공통 배너 및 메타데이터)
│   │   ├── page.tsx                      // 메인 화면 (/)
│   │   ├── login/page.tsx                // 통합 로그인 (/login)
│   │   ├── signup/page.tsx               // 가입 신청 (/signup)
│   │   ├── system/
│   │   │   ├── login/page.tsx            // 시스템 관리자 로그인 (/system/login)
│   │   │   ├── setup/page.tsx            // 최초 시스템 관리자 등록 (/system/setup)
│   │   │   └── dashboard/page.tsx        // 시스템 관리자 대시보드 (/system/dashboard)
│   │   ├── shop-admin/
│   │   │   ├── dashboard/page.tsx        // 플라워샵 관리자 대시보드 (/shop-admin/dashboard)
│   │   │   └── admins/page.tsx           // 추가 관리자 전용 관리 페이지 (/shop-admin/admins)
│   │   └── employee/
│   │       └── dashboard/page.tsx        // 직원 대시보드 (/employee/dashboard)
│   ├── actions/
│   │   ├── systemActions.ts              // 시스템 관리자 및 플라워샵 등록/토글
│   │   ├── shopAdminActions.ts           // 플라워샵 관리자 등록, 승인/퇴사, 급여조건 설정
│   │   ├── staffActions.ts               // 직원 가입 신청, 출퇴근 기록 등록/수정
│   │   ├── authActions.ts                // 통합 로그인, 세션 검증, 비밀번호 변경, 로그아웃
│   │   └── exportActions.ts              // 급여 정산 CSV 데이터 생성
│   ├── components/
│   │   ├── Banner.tsx                    // 상단 고정 헤더 배너
│   │   ├── PinInput.tsx                  // 4자리/6자리 숫자 비밀번호 입력 필드
│   │   ├── StatusBadge.tsx               // pending/approved/resigned/active 뱃지
│   │   ├── TimePicker.tsx                // 출퇴근 시간 선택 컴포넌트
│   │   └── MonthPicker.tsx               // 정산 대상 연월(YYYY-MM) 선택기
│   └── lib/
│       ├── db.ts                         // Neon PostgreSQL Pool 싱글톤 인스턴스
│       ├── session.ts                    // HttpOnly 쿠키 기반 세션 유틸리티
│       ├── hash.ts                       // bcrypt 비밀번호 해싱 및 비교 유틸리티
│       └── payroll.ts                    // 분/시간 단위 시급 및 월할 계산 정산 엔진
└── schema.sql                            // Neon DB 테이블 생성 및 인덱스 스크립트
```

## 3. 품질 기준 (성능·보안·접근성)

### 계산 규칙 및 보안 무결성
1. **비밀번호 규칙**
   - 시스템 관리자 & 플라워샵 관리자: 반드시 **숫자 6자리** (`^[0-9]{6}$`)
   - 플라워샵 직원: 반드시 **숫자 4자리** (`^[0-9]{4}$`)
   - 모든 비밀번호는 단방향 bcrypt 해시 형태로만 DB에 저장되며 평문 저장 절대 금지
2. **플라워샵 비활성화 시 보안 통제**
   - `shops.status = 'inactive'`일 경우, 해당 플라워샵의 모든 관리자와 직원은 로그인 시도가 즉시 거부되며 기존 발급된 세션 쿠키도 요청 즉시 무효화됩니다.
3. **급여 계산 알고리즘**
   - **시급(`hourly`)**:
     - `time_unit = 'minute'`: `(총 근무 분 / 60) * 시급`, 원 단위 반올림 (`Math.round`)
     - `time_unit = 'hour'`: `Math.floor(총 근무 분 / 60) * 시급` (시간 단위 절사 정산)
   - **월급(`monthly`)**:
     - 기본적으로 해당 월 고정액 지급. 월 중간 시작일 적용 시 해당 월 전체 일수 대비 유효 일수로 일할 계산
4. **CSV 데이터 다운로드 형식**
   - 파일명: `flower_payroll_[YYYY_MM].csv`
   - UTF-8 with BOM 인코딩 (엑셀에서 한글 깨짐 방지)
   - 헤더: `직원명,상태,급여형태,계산단위,적용금액(원),해당월 총 근무시간(분),지급예정액(원)`

## 변경 이력

| 버전 | 일시 | 변경 내용 |
| --- | --- | --- |
| v55 | 2026. 10. 30. 16시 36분 5초 | 최종 감수: 최종 감수 완료: Neon DB 연동, 권한별 스코프 로그인, 모바일 최적화 및 수용 기준 전체 검증 완료 |
| v54 | 2026. 10. 30. 16시 27분 55초 | 메인 화면 상단 배너 펠트 아트 스타일 적용 및 메인 버튼 문구 변경(로그인, 가입 신청) |
| v53 | 2026. 10. 30. 16시 8분 49초 | 최종 감수: Neon PostgreSQL 및 Next.js Server Actions 기반의 명세서 전체 섹션 일관성 검수 완료 및 최종 개발 준비 상태 전환 |
| v52 | 2026. 10. 30. 15시 54분 24초 | 플라워샵별 회원가입/로그인 중복 이름 체크 명확화, 모바일(갤럭시 S25/아이폰 16) 반응형 UI 최적화, 플라워샵 관리자의 추가 관리자 등록 탭을 하단 링크 및 별도 화면으로 분리 |
| v51 | 2026. 10. 30. 15시 23분 38초 | Neon PostgreSQL DB 스키마 생성 및 연동 명세를 최종 검증하여 개발 준비를 완료하였습니다. |
| v50 | 2026. 10. 30. 15시 4분 33초 | 최종 감수: Neon PostgreSQL 및 Next.js App Router 기반 사양 감수 완료: 데이터 모델, 화면 구성, 수용 기준 및 테스트 시나리오 완결 |
| v49 | 2026. 10. 30. 15시 4분 16초 | Neon PostgreSQL DB 스키마 초기화 DDL 및 테이블 자동/수동 생성 가이드를 명확히 재정비했습니다. |
| v48 | 2026. 10. 30. 14시 58분 23초 | 최종 감수: 최종 감수를 통해 Next.js + Neon PostgreSQL 기반 문서 전반의 일관성 및 수용 기준을 완벽하게 검증 완료했습니다. |
| v47 | 2026. 10. 30. 14시 57분 42초 | Neon PostgreSQL 및 Next.js App Router 사양에 맞춘 개발 문서 최종 확정 및 준비 완료 |
| v46 | 2026. 10. 30. 14시 10분 48초 | 최종 감수: Neon PostgreSQL 기반 Next.js 개발 문서 최종 감수 완료 (구현 준비 완료 상태) |
| v45 | 2026. 10. 30. 14시 5분 20초 | Neon DB API 키 및 환경 변수 연동 사양을 명확히 보강하고 전체 개발 문서를 최신 상태로 확정했습니다. |
| v44 | 2026. 10. 30. 13시 48분 7초 | 최종 감수: Neon PostgreSQL 기반 Next.js 시스템 개발 사양에 맞춰 기능, 화면, 데이터베이스 스키마 및 테스트 시나리오의 상호 정합성을 검수 완료했습니다. |
| v43 | 2026. 10. 30. 13시 47분 42초 | Neon PostgreSQL 기반의 최신 데이터 모델과 Next.js 서버 환경 구성을 명확히 반영하여 전체 기획 문서를 최종 재구성하였습니다. |
| v42 | 2026. 10. 30. 12시 0분 23초 | 최종 감수: 최종 감수 완료: 3단계 권한(시스템 관리자·플라워샵 관리자·직원) 체계, 비밀번호 규칙(6자리/4자리), Neon DB DDL 및 무결성 제약조건, 급여 계산 알고리즘, 테스트 시나리오를 최종 검증하고 개발 준비를 완료했습니다. |
| v41 | 2026. 10. 30. 11시 53분 16초 | 새로운 권한 모델(복수 시스템 관리자 6자리 비밀, 복수 플라워샵 관리자 6자리 비밀, 직원 4자리 비밀, 플라워샵 활성/비활성, 승인대기/승인/퇴사 상태, 급여 내역 다운로드 등)과 화면 흐름을 완벽히 반영한 전체 문서 개정 |
| v40 | 2026. 10. 30. 9시 50분 8초 | 최종 감수: 최종 감수 완료: Neon DB 기반 전체 기능·화면·테스트·배포 아키텍처 정합성 검증 및 개발 착수 문서 확정 |
| v39 | 2026. 10. 30. 9시 46분 22초 | 데이터베이스를 Neon PostgreSQL 아키텍처로 전환하고 스키마, 서버 연결 방식, 배포 및 환경 변수 명세를 최신화했습니다. |
| v38 | 2026. 10. 29. 17시 55분 40초 | 최종 감수: 최종 감수 완료: 42501(RLS 정책 위반) 방지를 위한 Server Actions 아키텍처 및 Supabase SQL 스키마 최종 확정, 컴포넌트 및 환경변수 완비 |
| v37 | 2026. 10. 29. 17시 52분 33초 | 변경된 모델과 요구사항을 바탕으로 Supabase 스키마, RLS 정책 가이드, 서버 액션 구현 명세를 완벽히 정돈하여 재생성 준비를 완료했습니다. |
| v36 | 2026. 10. 29. 17시 45분 5초 | Supabase RLS(42501) 오류 해결을 위한 서버 전용 클라이언트(service_role) 사용 강제 및 데이터베이스 초기화 재적용 규칙 보강 |
| v35 | 2026. 10. 29. 17시 32분 1초 | 테이블 재생성을 위한 Supabase 완전 초기화 반영 및 모든 서버 작업에서 Service Role 클라이언트 강제화 규칙 명시 |
| v34 | 2026. 10. 29. 17시 9분 41초 | 최종 감수: 최종 감수: RLS 오류(42501) 원인인 system_admins 테이블을 포함한 모든 쓰기 작업을 서버 액션과 Service Role 클라이언트로 명확히 고정하고, 전체 문서 정합성을 검증함 |
| v33 | 2026. 10. 29. 17시 9분 25초 | 시스템 관리자 최초 등록 및 기타 서버 작업 시 RLS 오류(42501)를 방지하기 위해, 브라우저 클라이언트 대신 반드시 서버 전용 클라이언트(Service Role Key)를 사용하도록 데이터베이스 연동 규칙 및 코드 구현 경계를 명확히 보강함 |
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
