"use client";

import React, { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";

interface NavbarProps {
  title: string;
}

interface UserSession {
  id: string;
  shop_id?: string;
  name: string;
  is_admin: boolean;
  hourly_wage: number;
  status: string;
}

export default function Navbar({ title }: NavbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<UserSession | null>(null);

  useEffect(() => {
    const rawUser = localStorage.getItem("flower_shop_user");
    if (rawUser) {
      try {
        setUser(JSON.parse(rawUser));
      } catch (err) {
        console.error("세션 파싱 오류:", err);
      }
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("flower_shop_user");
    sessionStorage.removeItem("system_admin_auth");
    router.push("/");
  };

  return (
    <header className="bg-[#1E293B] text-white shadow-sm border-b border-borderLine">
      <div className="flex items-center justify-between px-4 h-14">
        <h1 className="text-sm font-bold truncate tracking-tight">{title}</h1>
        <div className="flex items-center space-x-2 text-xs">
          {user && (
            <span className="font-medium text-slate-300">
              {user.name}님 {user.is_admin ? "(관리자)" : ""}
            </span>
          )}
          <button
            onClick={handleLogout}
            className="px-2.5 py-1 bg-white/10 hover:bg-white/20 rounded-lg text-xs transition font-medium text-slate-200"
          >
            로그아웃
          </button>
        </div>
      </div>
      {user?.is_admin && (
        <nav className="flex bg-[#0f172a] border-t border-white/10 text-xs overflow-x-auto">
          <Link
            href="/admin"
            className={`flex-1 text-center py-2.5 px-3 whitespace-nowrap hover:bg-white/10 transition ${
              pathname === "/admin" ? "bg-white/20 font-bold text-emerald-400" : "text-slate-300"
            }`}
          >
            직원 관리
          </Link>
          <Link
            href="/admin/attendance"
            className={`flex-1 text-center py-2.5 px-3 whitespace-nowrap hover:bg-white/10 transition ${
              pathname === "/admin/attendance" ? "bg-white/20 font-bold text-emerald-400" : "text-slate-300"
            }`}
          >
            근무 기록/급여 정산
          </Link>
        </nav>
      )}
    </header>
  );
}
