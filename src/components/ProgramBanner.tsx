import React from "react";
import Link from "next/link";

interface ProgramBannerProps {
  rightElement?: React.ReactNode;
}

export default function ProgramBanner({ rightElement }: ProgramBannerProps) {
  return (
    <header className="bg-white border-b border-[#E2E8F0] px-4 md:px-6 h-[56px] md:h-[64px] flex items-center justify-between sticky top-0 z-40">
      <Link href="/" className="flex items-center gap-2">
        <h1 className="text-lg md:text-xl font-bold text-[#0F172A] tracking-tight">
          플라워샵 근무 관리
        </h1>
      </Link>
      {rightElement && <div className="flex items-center gap-2">{rightElement}</div>}
    </header>
  );
}
