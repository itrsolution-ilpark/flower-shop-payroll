import React from "react";
import Link from "next/link";

interface BannerProps {
  rightElement?: React.ReactNode;
}

export default function Banner({ rightElement }: BannerProps) {
  return (
    <header className="w-full h-[64px] bg-white border-b border-[#E2E8F0] px-4 md:px-6 flex items-center justify-between sticky top-0 z-40">
      <Link href="/" className="flex items-center gap-2">
        <h1 className="text-[20px] font-[700] text-[#0F172A] tracking-tight">
          플라워샵 근무 관리
        </h1>
      </Link>
      {rightElement && <div className="flex items-center gap-2">{rightElement}</div>}
    </header>
  );
}
