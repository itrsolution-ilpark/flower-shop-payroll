import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "플라워샵 근무 및 급여 관리 시스템",
  description: "화원 직원들의 출퇴근 기록 및 월별 급여 자동 계산 프로그램",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body className="bg-background text-textColor min-h-screen font-sans antialiased">
        <main className="max-w-md mx-auto min-h-screen flex flex-col bg-white shadow-md">
          {children}
        </main>
      </body>
    </html>
  );
}
