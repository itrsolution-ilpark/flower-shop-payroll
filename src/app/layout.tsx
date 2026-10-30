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
      <body className="bg-amber-50/30 text-[#0F172A] min-h-screen font-sans antialiased">
        <div className="min-h-screen flex flex-col bg-amber-50/30">
          {children}
        </div>
      </body>
    </html>
  );
}
