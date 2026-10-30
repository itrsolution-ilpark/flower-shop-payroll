# 플라워샵 근무 관리 (flower-shop-payroll)

복수의 플라워샵 환경에서 3계층 권한(시스템 관리자, 플라워샵 관리자, 플라워샵 직원)을 기반으로 출퇴근 기록, 시급·월급 급여 정산을 안전하게 관리하는 웹 프로그램입니다.

## 1. 사전 준비물 (비전문가용)
- **Node.js**: 버전 20 이상 (`node -v` 명령어로 확인)
- **Neon PostgreSQL**: [Neon](https://neon.tech) 무료 계정 및 PostgreSQL 데이터베이스 연결 주소 (`DATABASE_URL`)
- 인터넷 브라우저 (Chrome, Edge, Safari 등)

## 2. 프로젝트 설치
터미널을 열고 프로젝트 폴더에서 다음 명령어를 입력합니다.
```bash
npm install
```

## 3. 환경 변수 설정
프로젝트 루트 폴더에 `.env.local` 파일을 생성하고 아래 내용을 입력합니다.
```text
DATABASE_URL=postgres://username:password@ep-example-123456.us-east-2.aws.neon.tech/neondb?sslmode=require
APP_SESSION_SECRET=super-secret-random-key-at-least-32-chars
```

## 4. 데이터베이스 마이그레이션 (Neon PostgreSQL)
Neon 콘솔의 **SQL Editor**에서 아래 파일 내용을 복사해 실행합니다.
- `schema.sql` (또는 `db/migrations/001_initial_schema.sql`)

## 5. 실행 방법
### 개발 서버 실행
```bash
npm run dev
```
브라우저에서 `http://localhost:3000` 접속

### 자동화 테스트 실행
```bash
npm test
```

### 프로덕션 빌드
```bash
npm run build
npm run start
```

## 6. 3계층 권한 및 이용 순서
1. **시스템 관리자 최초 등록**: 시스템 관리자가 0명일 때 접속 시 자동으로 `/system-setup` 화면으로 이동하여 최초 관리자를 등록합니다.
2. **플라워샵 개설**: 메인 화면의 [플라워샵 관리] 버튼을 눌러 인증 후 `/shop/register`에서 플라워샵을 개설하거나 이름을 수정합니다.
3. **플라워샵 관리자 등록**: 메인 화면에서 플라워샵 카드의 [선택] 버튼을 눌러 `/shop/[id]`로 이동합니다. 관리자가 없을 경우 [관리자 등록]을 진행합니다.
4. **직원 가입 및 승인**: 직원은 [직원 가입 신청]을 완료하고, 관리자는 `/admin` 대시보드에서 시급 또는 월급 조건과 금액, 적용 시작일을 설정해 [승인]합니다.
5. **출퇴근 등록 및 급여 정산**: 시급 직원은 `/employee/dashboard`에서 출퇴근을 등록하고, 관리자는 `/admin/attendance`에서 월별 총 근무시간 및 총 지급 급여를 확인하고 필요 시 수동으로 보완합니다.
