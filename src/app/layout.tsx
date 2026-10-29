import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "플라워샵 근무 관리",
  description: "복수 플라워샵 3계층 권한 근태 및 급여 자동 집계",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body className="bg-background text-textColor min-h-screen font-sans antialiased">
        <main className="max-w-xl mx-auto min-h-screen flex flex-col bg-surface shadow-sm border-x border-borderLine">
          {children}
        </main>
      </body>
    </html>
  );
}
