"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import Navbar from "@/components/Navbar";
import Button from "@/components/ui/Button";

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
    if (!confirm("해당 직원을 퇴사 처리하시겠습니까?")) return;

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
      <Navbar title={`${shopName} — 대표 대시보드`} />

      <div className="p-4 flex-1 space-y-6">
        <div className="flex items-center justify-between border-b pb-3">
          <div>
            <h2 className="text-base font-bold text-textColor">{shopName} 직원 관리</h2>
            <p className="text-xs text-gray-500">승인 대기자, 재직자 시급 설정 및 퇴사 관리</p>
          </div>
          <Button
            variant="outline"
            className="w-auto px-3 h-9 text-xs"
            onClick={() => router.push("/admin/attendance")}
          >
            근무 기록/급여 정산 탭 →
          </Button>
        </div>

        {errorMsg && (
          <p className="text-xs text-errorColor text-center font-medium bg-red-50 p-2 rounded">
            {errorMsg}
          </p>
        )}

        {/* 1. 승인 대기자 목록 */}
        <section className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-textColor">
              승인 대기자 목록 <span className="text-xs text-emerald font-semibold">({pendingList.length}명)</span>
            </h3>
          </div>

          {loading ? (
            <p className="text-xs text-gray-500 text-center py-4">로딩 중...</p>
          ) : pendingList.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-4">대기 중인 직원이 없습니다.</p>
          ) : (
            <div className="space-y-2">
              {pendingList.map((st) => (
                <div
                  key={st.id}
                  className="p-3 bg-amber-50/50 border border-amber-200 rounded-lg flex items-center justify-between gap-2"
                >
                  <div>
                    <p className="text-sm font-bold text-textColor">{st.name}</p>
                    <p className="text-xs text-gray-500">신청일: {st.created_at.slice(0, 10)}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      value={wageInputs[st.id] ?? "10000"}
                      onChange={(e) =>
                        setWageInputs({ ...wageInputs, [st.id]: e.target.value })
                      }
                      className="w-20 h-9 px-2 text-xs border border-gray-300 rounded bg-white text-right"
                    />
                    <span className="text-xs text-gray-600">원</span>
                    <button
                      onClick={() => handleApprove(st.id)}
                      className="px-3 h-9 bg-emerald text-white text-xs font-semibold rounded hover:bg-[#065F46]"
                    >
                      [승인]
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* 2. 재직자 목록 */}
        <section className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-textColor">
              재직자 목록 <span className="text-xs text-primary font-semibold">({activeList.length}명)</span>
            </h3>
          </div>

          {loading ? (
            <p className="text-xs text-gray-500 text-center py-4">로딩 중...</p>
          ) : activeList.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-4">재직 중인 직원이 없습니다.</p>
          ) : (
            <div className="space-y-2">
              {activeList.map((st) => (
                <div
                  key={st.id}
                  className="p-3 bg-white border border-gray-200 rounded-lg flex items-center justify-between gap-2"
                >
                  <div>
                    <p className="text-sm font-bold text-textColor">{st.name}</p>
                    <p className="text-xs text-gray-500">현재 시급: {st.hourly_wage.toLocaleString()}원</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      value={wageInputs[st.id] ?? st.hourly_wage.toString()}
                      onChange={(e) =>
                        setWageInputs({ ...wageInputs, [st.id]: e.target.value })
                      }
                      className="w-20 h-9 px-2 text-xs border border-gray-300 rounded bg-white text-right"
                    />
                    <button
                      onClick={() => handleUpdateWage(st.id)}
                      className="px-2.5 h-9 bg-primary text-white text-xs font-medium rounded hover:bg-[#172554]"
                    >
                      시급 수정
                    </button>
                    <button
                      onClick={() => handleResign(st.id)}
                      className="px-2.5 h-9 bg-errorColor text-white text-xs font-medium rounded hover:bg-[#DC2626]"
                    >
                      [퇴사 처리]
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* 3. 퇴사자 목록 */}
        <section className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm space-y-3">
          <h3 className="text-sm font-bold text-gray-500">
            퇴사자 목록 ({resignedList.length}명)
          </h3>
          {resignedList.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-2">퇴사자가 없습니다.</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {resignedList.map((st) => (
                <div key={st.id} className="py-2 flex justify-between items-center text-xs text-gray-500">
                  <span>{st.name}</span>
                  <span className="px-2 py-0.5 bg-gray-100 rounded text-gray-600">퇴사</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
