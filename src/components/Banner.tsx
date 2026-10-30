import React from "react";
import Link from "next/link";
import { Flower2 } from "lucide-react";

interface BannerProps {
  rightElement?: React.ReactNode;
}

export default function Banner({ rightElement }: BannerProps) {
  return (
    <header className="w-full h-[64px] bg-white/90 backdrop-blur-md border-b border-[#E2E8F0] px-4 md:px-6 flex items-center justify-between sticky top-0 z-40 shadow-sm">
      <Link href="/" className="flex items-center gap-2 group">
        <div className="w-8 h-8 rounded-xl bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-700 group-hover:bg-emerald-200 transition">
          <Flower2 className="w-5 h-5" />
        </div>
        <h1 className="text-[20px] font-[700] text-[#0F172A] tracking-tight">
          플라워샵 근무 관리
        </h1>
      </Link>
      {rightElement && <div className="flex items-center gap-2">{rightElement}</div>}
    </header>
  );
}
