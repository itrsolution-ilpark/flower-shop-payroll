"use client";

import React, { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";

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
    <header className="bg-primary text-white shadow-md">
      <div className="flex items-center justify-between px-4 h-14">
        <h1 className="text-base font-bold truncate">{title}</h1>
        <div className="flex items-center space-x-3 text-sm">
          {user && (
            <span className="font-medium text-slate-100 text-xs">
              {user.name}님 {user.is_admin ? "(대표)" : ""}
            </span>
          )}
          <button
            onClick={handleLogout}
            className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded text-xs transition font-medium"
          >
            로그아웃
          </button>
        </div>
      </div>
      {user?.is_admin && (
        <nav className="flex bg-[#172554] border-t border-white/10 text-xs overflow-x-auto">
          <a
            href="/admin"
            className={`flex-1 text-center py-2.5 px-3 whitespace-nowrap hover:bg-white/10 transition ${
              pathname === "/admin" ? "bg-white/20 font-bold" : ""
            }`}
          >
            직원 관리
          </a>
          <a
            href="/admin/attendance"
            className={`flex-1 text-center py-2.5 px-3 whitespace-nowrap hover:bg-white/10 transition ${
              pathname === "/admin/attendance" ? "bg-white/20 font-bold" : ""
            }`}
          >
            근무 기록/급여 정산
          </a>
        </nav>
      )}
    </header>
  );
}
