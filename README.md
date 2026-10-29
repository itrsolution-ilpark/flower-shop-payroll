# 플라워샵 근무 및 급여 관리 시스템 — 설치 및 실행 가이드

이 가이드는 비전문가도 쉽게 따라 할 수 있도록 플라워샵 근무 및 급여 관리 시스템을 설치하고 실행하는 방법을 안내합니다.

## 1. 사전 요구사항
컴퓨터에 아래 프로그램이 설치되어 있어야 합니다.
- **Node.js**: 버전 20 이상 (`node -v` 명령어로 확인 가능)
- **Git**: 코드 다운로드용

## 2. 프로젝트 다운로드 및 의존성 설치
1. 터미널(명령 프롬프트)을 엽니다.
2. 프로젝트 폴더로 이동한 뒤 필요한 패키지를 설치합니다.
```bash
npm install
```

## 3. 환경 변수 설정
1. 프로젝트 루트 폴더에 `.env.local` 파일을 생성합니다.
2. `.env.example` 파일을 참고하여 아래 내용을 입력합니다.
```text
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```
*(Supabase 대시보드에서 프로젝트 URL과 Anon Key, Service Role Key를 확인하여 입력하세요.)*

## 4. 데이터베이스 설정 (Supabase)
Supabase SQL Editor에서 `supabase/migrations/001_create_tables.sql` 파일의 내용을 복사하여 실행합니다. 테이블 생성 및 RLS 보안 정책이 자동으로 적용됩니다.

## 5. 애플리케이션 실행
개발 모드로 앱을 실행하려면 아래 명령어를 입력합니다.
```bash
npm run dev
```
브라우저에서 `http://localhost:3000`으로 접속하여 사용할 수 있습니다.

## 6. 테스트 실행
프로젝트에 포함된 자동화 테스트를 실행하려면 아래 명령어를 입력합니다.
```bash
npm test
```
