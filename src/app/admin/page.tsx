"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import Navbar from "@/components/Navbar";
import Button from "@/components/ui/Button";
import StatusBadge from "@/components/StatusBadge";
import { Users, Clock, AlertCircle } from "lucide-react";

interface StaffUser {
  id: string;
  shop_id: string;
  name: string;
  is_admin: boolean;
  hourly_wage: number;
}

interface StaffMember {
  id: string;
  shop_id: string;
  name: string;
  hourly_wage: number;
  is_admin: boolean;
  status: "pending" | "active" | "resigned" | string;
  created_at: string;
}

export default function AdminPage() {
  const router = useRouter();
  const [user, setUser] = useState<StaffUser | null>(null);
  const [shopName, setShopName] = useState<string>("");
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // 시급 인풋 상태 맵 (staff.id -> string)
  const [wageInputs, setWageInputs] = useState<Record<string, string>>({});
  const [errorMsg, setErrorMsg] = useState<string>("");

  useEffect(() => {
    const raw = localStorage.getItem("flower_shop_user");
    if (!raw) {
      router.push("/");
      return;
    }
    const parsed: StaffUser = JSON.parse(raw);
    if (!parsed.is_admin) {
      router.push("/employee/dashboard");
      return;
    }
    setUser(parsed);
    fetchShopAndStaff(parsed.shop_id);
  }, [router]);

  const fetchShopAndStaff = async (shopId: string) => {
    setLoading(true);
    try {
      const { data: shopData } = await supabase
        .from("shops")
        .select("name")
        .eq("id", shopId)
        .single();

      if (shopData) {
        setShopName(shopData.name);
      }

      const { data: staffData, error } = await supabase
        .from("staff")
        .select("*")
        .eq("shop_id", shopId)
        .eq("is_admin", false)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("직원 목록 조회 오류:", error);
      } else if (staffData) {
        setStaffList(staffData);
        const map: Record<string, string> = {};
        staffData.forEach((st) => {
          map[st.id] = st.hourly_wage.toString();
        });
        setWageInputs(map);
      }
    } catch (err) {
      console.error("예외 발생:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (staffId: string) => {
    setErrorMsg("");
    const wage = parseInt(wageInputs[staffId] || "10000", 10);
    if (isNaN(wage) || wage <= 0) {
      setErrorMsg("유효한 시급을 입력해주세요.");
      return;
    }

    try {
      const { error } = await supabase
        .from("staff")
        .update({
          status: "active",
          hourly_wage: wage,
        })
        .eq("id", staffId);

      if (error) {
        setErrorMsg("승인 처리 중 오류가 발생했습니다.");
        return;
      }
      if (user) fetchShopAndStaff(user.shop_id);
    } catch (err) {
      console.error("예외 발생:", err);
    }
  };

  const handleUpdateWage = async (staffId: string) => {
    setErrorMsg("");
    const wage = parseInt(wageInputs[staffId] || "10000", 10);
    if (isNaN(wage) || wage <= 0) {
      setErrorMsg("유효한 시급을 입력해주세요.");
      return;
    }

    try {
      const { error } = await supabase
        .from("staff")
        .update({ hourly_wage: wage })
        .eq("id", staffId);

      if (error) {
        setErrorMsg("시급 수정 중 오류가 발생했습니다.");
        return;
      }
      alert("시급이 수정되었습니다.");
      if (user) fetchShopAndStaff(user.shop_id);
    } catch (err) {
      console.error("예외 발생:", err);
    }
  };

  const handleResign = async (staffId: string) => {
    if (!confirm("해당 직원을 퇴사 처리하시겠습니까? 퇴사 처리 시 직원 로그인 목록에서 즉시 배제됩니다.")) {
      return;
    }

    try {
      const { error } = await supabase
        .from("staff")
        .update({ status: "resigned" })
        .eq("id", staffId);

      if (error) {
        alert("퇴사 처리 중 오류가 발생했습니다.");
        return;
      }
      if (user) fetchShopAndStaff(user.shop_id);
    } catch (err) {
      console.error("예외 발생:", err);
    }
  };

  if (!user) return null;

  const pendingList = staffList.filter((s) => s.status === "pending");
  const activeList = staffList.filter((s) => s.status === "active");
  const resignedList = staffList.filter((s) => s.status === "resigned");

  return (
    <div className="flex flex-col flex-1">
      <Navbar title={`${shopName} — 플라워샵 관리 대시보드`} />

      <div className="pt-6 px-4 pb-8 flex-1 space-y-6">
        {/* 1. 상단 헤더: 매장명 및 네비게이션 (근무 기록/급여 정산 화면 이동 링크) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-xl border border-borderLine shadow-sm">
          <div>
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-[#059669]" />
              <h1 className="text-base font-bold text-textColor">{shopName} 직원 관리</h1>
            </div>
            <p className="text-xs text-subText mt-0.5">
              승인 대기자 시급 책정, 재직 직원 시급 변경 및 퇴사 전환
            </p>
          </div>
          <Link
            href="/admin/attendance"
            className="min-h-[46px] h-[46px] px-4 bg-[#1E293B] text-white text-xs font-semibold rounded-xl hover:bg-[#0f172a] transition flex items-center justify-center gap-1.5"
          >
            <Clock className="w-4 h-4 text-emerald-400" />
            근무 기록/급여 정산 화면 이동
          </Link>
        </div>

        {errorMsg && (
          <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 text-rose-600 rounded-xl text-xs font-medium">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* 2. 상태별 탭/섹션 상단 배치 */}

        {/* (1) 승인 대기자 목록: 이름, 신청일, 시급 설정 인풋, 승인 완료 버튼 */}
        <section className="bg-white border border-borderLine rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-borderLine pb-3">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-textColor">승인 대기자 목록</h2>
              <StatusBadge status="pending" />
            </div>
            <span className="text-xs font-semibold text-[#D97706]">{pendingList.length}명</span>
          </div>

          {loading ? (
            <p className="text-xs text-subText text-center py-4">로딩 중...</p>
          ) : pendingList.length === 0 ? (
            <p className="text-xs text-subText text-center py-4">대기 중인 직원이 없습니다.</p>
          ) : (
            <div className="space-y-3">
              {pendingList.map((st) => (
                <div
                  key={st.id}
                  className="p-3.5 bg-amber-50/50 border border-amber-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div>
                    <p className="text-sm font-bold text-textColor">{st.name}</p>
                    <p className="text-xs text-subText">신청일: {st.created_at.slice(0, 10)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        value={wageInputs[st.id] ?? "10000"}
                        onChange={(e) =>
                          setWageInputs({ ...wageInputs, [st.id]: e.target.value })
                        }
                        className="w-24 min-h-[40px] h-[40px] px-2 text-xs border border-borderLine rounded-lg bg-white text-right focus:outline-none focus:ring-2 focus:ring-[#059669]"
                      />
                      <span className="text-xs text-subText">원</span>
                    </div>
                    <button
                      onClick={() => handleApprove(st.id)}
                      className="min-h-[40px] h-[40px] px-3.5 bg-[#059669] text-white text-xs font-semibold rounded-xl hover:bg-[#047857] transition"
                    >
                      승인 완료
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* (2) 재직 직원 목록: 이름, 시급 수정 인풋, 시급 저장 버튼, 퇴사 처리 버튼 */}
        <section className="bg-white border border-borderLine rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-borderLine pb-3">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-textColor">재직 직원 목록</h2>
              <StatusBadge status="active" />
            </div>
            <span className="text-xs font-semibold text-[#059669]">{activeList.length}명</span>
          </div>

          {loading ? (
            <p className="text-xs text-subText text-center py-4">로딩 중...</p>
          ) : activeList.length === 0 ? (
            <p className="text-xs text-subText text-center py-4">재직 중인 직원이 없습니다.</p>
          ) : (
            <div className="space-y-3">
              {activeList.map((st) => (
                <div
                  key={st.id}
                  className="p-3.5 bg-slate-50 border border-borderLine rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div>
                    <p className="text-sm font-bold text-textColor">{st.name}</p>
                    <p className="text-xs text-subText">현재 시급: {st.hourly_wage.toLocaleString()}원</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        value={wageInputs[st.id] ?? st.hourly_wage.toString()}
                        onChange={(e) =>
                          setWageInputs({ ...wageInputs, [st.id]: e.target.value })
                        }
                        className="w-24 min-h-[40px] h-[40px] px-2 text-xs border border-borderLine rounded-lg bg-white text-right focus:outline-none focus:ring-2 focus:ring-[#059669]"
                      />
                      <span className="text-xs text-subText">원</span>
                    </div>
                    <button
                      onClick={() => handleUpdateWage(st.id)}
                      className="min-h-[40px] h-[40px] px-3 bg-[#1E293B] text-white text-xs font-medium rounded-xl hover:bg-[#0f172a] transition"
                    >
                      시급 저장
                    </button>
                    <button
                      onClick={() => handleResign(st.id)}
                      className="min-h-[40px] h-[40px] px-3 bg-rose-600 text-white text-xs font-medium rounded-xl hover:bg-rose-700 transition"
                    >
                      퇴사 처리
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* (3) 퇴사자 목록: 이름, 퇴사일, 조회 전용 표시 */}
        <section className="bg-white border border-borderLine rounded-xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-borderLine pb-3">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-subText">퇴사자 목록</h2>
              <StatusBadge status="resigned" />
            </div>
            <span className="text-xs font-semibold text-subText">{resignedList.length}명</span>
          </div>

          {resignedList.length === 0 ? (
            <p className="text-xs text-subText text-center py-2">퇴사자가 없습니다.</p>
          ) : (
            <div className="divide-y divide-borderLine">
              {resignedList.map((st) => (
                <div key={st.id} className="py-2.5 flex justify-between items-center text-xs text-subText">
                  <span className="font-medium text-textColor">{st.name}</span>
                  <div className="flex items-center gap-2">
                    <span>조회 전용</span>
                    <StatusBadge status="resigned" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
