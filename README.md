# 플라워샵 근무 관리 (flower-shop-payroll)

복수의 플라워샵 환경에서 3계층 권한(시스템 관리자, 플라워샵 관리자, 플라워샵 직원)을 기반으로 출퇴근 기록, 시급·월급 급여 정산을 안전하게 관리하는 웹 프로그램입니다.

## 1. 사전 준비물 (비전문가용)
- **Node.js**: 버전 20 이상 (`node -v` 명령어로 확인)
- **Neon PostgreSQL**: [Neon 콘솔](https://console.neon.tech) 무료 계정 및 Pooled Connection String (`DATABASE_URL`)
- 인터넷 브라우저 (Chrome, Edge, Safari 등)

## 2. 프로젝트 설치
터미널을 열고 프로젝트 폴더에서 다음 명령어를 입력합니다.
```bash
npm install
```

## 3. 환경 변수 설정
프로젝트 루트 폴더에 `.env.local` 파일(또는 Vercel 환경 변수)을 생성하고 아래 내용을 입력합니다.
```text
DATABASE_URL=postgres://[user]:[password]@[neon-host]/[dbname]?sslmode=require
APP_SESSION_SECRET=super-secret-random-key-at-least-32-chars
```

## 4. 데이터베이스 마이그레이션 (Neon PostgreSQL)
배포 시 `db/migrations/`의 SQL 파일이 순서대로 적용되며, 적용된 파일명과 체크섬은 DB에 기록되어 이후 배포에서는 다시 실행되지 않습니다. 기존 마이그레이션 파일은 수정하지 마세요. 테이블 변경이 필요하면 다음 번호의 새 파일을 추가하고 `ALTER TABLE`로 변경합니다. 테이블 삭제·재생성은 기존 데이터를 손실시킬 수 있으므로 사용하지 않습니다.

새 DB를 수동으로 초기화할 때만 Neon 콘솔의 **SQL Editor**에서 `schema.sql`을 실행하세요. 이 파일은 기존 테이블을 삭제하지 않으며, 이미 존재하는 테이블과 인덱스는 건너뜁니다.

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

### 프로덕션 빌드 및 실행
```bash
npm run build
npm run start
```

## 6. 3계층 권한 및 이용 순서
1. **시스템 관리자 최초 등록**: DB에 시스템 관리자가 없을 경우 `/system/setup`으로 자동 유도하여 최초 관리자(6자리)를 등록합니다.
2. **플라워샵 등록 및 상태 관리**: 시스템 관리자가 대시보드(`/system/dashboard`)에서 플라워샵을 개설하고 상태(`active` / `inactive`)를 토글 관리합니다.
3. **플라워샵 최초/추가 관리자 등록**: 관리자가 없는 플라워샵은 `/signup`에서 최초 관리자(6자리)를 개설하고, 이후 추가 관리자는 대시보드 내부에서 등록합니다.
4. **직원 가입 및 승인**: 직원은 `/signup`에서 가입을 신청(`pending` 상태)하고, 플라워샵 관리자가 시급/월급 조건 및 적용일을 설정하여 승인(`approved`)합니다.
5. **출퇴근 기록 및 정산 CSV**: 승인된 직원은 `/employee/dashboard`에서 일별 출퇴근 시각을 등록하며, 관리자는 `/shop-admin/dashboard`에서 월별 정산 확인 및 UTF-8 with BOM CSV 다운로드를 진행합니다.
