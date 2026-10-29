# 플라워샵 근무 관리 (flower-shop-payroll)

복수의 플라워샵(매장) 환경에서 3계층 권한(시스템 관리자, 플라워샵 대표, 플라워샵 직원)을 기반으로 출퇴근 기록, 시급 관리, 월별 급여를 자동 집계하는 멀티 테넌트 웹 애플리케이션입니다.

## 1. 사전 준비물 (비전문가용)
- **Node.js**: 버전 20 이상 (`node -v` 명령어로 확인)
- 인터넷 브라우저 (Chrome, Edge, Safari 등)

## 2. 프로젝트 설치
터미널을 열고 프로젝트 폴더에서 다음 명령어를 입력합니다.
```bash
npm install
```

## 3. 환경 변수 설정
프로젝트 루트 폴더에 `.env.local` 파일을 생성하고 아래 내용을 입력합니다.
```text
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## 4. 데이터베이스 마이그레이션 (Supabase)
Supabase 대시보드의 **SQL Editor**에서 아래 파일 내용을 복사해 실행합니다.
- `supabase/migrations/001_create_tables.sql`

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
1. **시스템 관리자 최초 등록**: 시스템 관리자가 0명일 때 사이트 접속 시 자동으로 `/system-setup` 화면으로 이동하여 마스터 계정을 생성합니다.
2. **플라워샵 개설**: 메인 화면에서 [시스템 관리자 플라워샵 등록/수정] 버튼 클릭 후 마스터 PIN 인증을 거쳐 `/shop/register`에서 플라워샵을 개설합니다.
3. **플라워샵 대표 등록**: 메인 화면에서 플라워샵 카드 [입장하기]를 누르면 허브(`/shop/[id]`)로 이동합니다. 대표가 없을 경우 [플라워샵 대표 등록] 버튼을 눌러 해당 매장 전용 대표를 등록합니다.
4. **직원 가입 및 승인**: 직원은 허브에서 [직원 가입 신청]을 완료하고, 대표는 `/admin` 대시보드에서 시급을 입력 후 [승인]합니다.
5. **출퇴근 등록 및 급여 정산**: 직원은 `/employee/dashboard`에서 출근/퇴근을 등록하고, 대표는 `/admin/attendance`에서 월별 총 근무시간 및 총 지급 급여를 확인하고 필요 시 수동으로 보완합니다.
