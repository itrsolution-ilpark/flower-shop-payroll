"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import StatusBadge from "@/components/StatusBadge";
import { Users, Clock, AlertCircle, ArrowLeft } from "lucide-react";

interface StaffUser {
  id: string;
  shop_id: string;
  name: string;
  is_admin: boolean;
}

interface StaffMember {
  id: string;
  shop_id: string;
  name: string;
  status: "pending" | "active" | "resigned" | string;
  created_at: string;
}

interface CompensationItem {
  pay_type: "hourly" | "monthly";
  amount_krw: number;
  effective_from: string;
}

export default function AdminPage() {
  const router = useRouter();
  const [user, setUser] = useState<StaffUser | null>(null);
  const [shopName, setShopName] = useState<string>("");
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [compensations, setCompensations] = useState<Record<string, CompensationItem>>({});
  const [loading, setLoading] = useState<boolean>(true);

  // 승인/수정 폼 입력 상태
  const [payTypes, setPayTypes] = useState<Record<string, "hourly" | "monthly">>({});
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [effectiveDates, setEffectiveDates] = useState<Record<string, string>>({});
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
    fetchShopAndData(parsed.shop_id);
  }, [router]);

  const fetchShopAndData = async (shopId: string) => {
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
        .order("created_at", { ascending: false });

      if (error) {
        console.error("직원 목록 조회 오류:", error);
      } else if (staffData) {
        setStaffList(staffData);

        const staffIds = staffData.map((s) => s.id);
        if (staffIds.length > 0) {
          const { data: compData } = await supabase
            .from("compensation")
            .select("*")
            .in("staff_id", staffIds)
            .order("effective_from", { ascending: false });

          const compMap: Record<string, CompensationItem> = {};
          const ptMap: Record<string, "hourly" | "monthly"> = {};
          const amMap: Record<string, string> = {};
          const edMap: Record<string, string> = {};

          const todayStr = new Date().toISOString().slice(0, 10);

          (compData || []).forEach((c) => {
            if (!compMap[c.staff_id]) {
              compMap[c.staff_id] = {
                pay_type: c.pay_type,
                amount_krw: c.amount_krw,
                effective_from: c.effective_from,
              };
            }
          });

          staffData.forEach((st) => {
            const activeComp = compMap[st.id];
            ptMap[st.id] = activeComp ? activeComp.pay_type : "hourly";
            amMap[st.id] = activeComp ? activeComp.amount_krw.toString() : "10000";
            edMap[st.id] = activeComp ? activeComp.effective_from : todayStr;
          });

          setCompensations(compMap);
          setPayTypes(ptMap);
          setAmounts(amMap);
          setEffectiveDates(edMap);
        }
      }
    } catch (err) {
      console.error("예외 발생:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (staffId: string) => {
    setErrorMsg("");
    const payType = payTypes[staffId] || "hourly";
    const amount = parseInt(amounts[staffId] || "0", 10);
    const effectiveFrom = effectiveDates[staffId] || new Date().toISOString().slice(0, 10);

    if (isNaN(amount) || amount <= 0) {
      setErrorMsg("유효한 금액을 입력해주세요.");
      return;
    }

    try {
      const { error: staffError } = await supabase
        .from("staff")
        .update({ status: "active" })
        .eq("id", staffId);

      if (staffError) {
        setErrorMsg("승인 처리 중 오류가 발생했습니다.");
        return;
      }

      const { error: compError } = await supabase.from("compensation").insert([
        {
          staff_id: staffId,
          pay_type: payType,
          amount_krw: amount,
          effective_from: effectiveFrom,
        },
      ]);

      if (compError) {
        console.error("급여 조건 저장 오류:", compError);
      }

      alert("직원이 승인되었습니다.");
      if (user) fetchShopAndData(user.shop_id);
    } catch (err) {
      console.error("예외 발생:", err);
      setErrorMsg("처리 중 오류가 발생했습니다.");
    }
  };

  const handleUpdateCompensation = async (staffId: string) => {
    setErrorMsg("");
    const payType = payTypes[staffId] || "hourly";
    const amount = parseInt(amounts[staffId] || "0", 10);
    const effectiveFrom = effectiveDates[staffId] || new Date().toISOString().slice(0, 10);

    if (isNaN(amount) || amount <= 0) {
      setErrorMsg("유효한 금액을 입력해주세요.");
      return;
    }

    try {
      const { error } = await supabase.from("compensation").insert([
        {
          staff_id: staffId,
          pay_type: payType,
          amount_krw: amount,
          effective_from: effectiveFrom,
        },
      ]);

      if (error) {
        setErrorMsg("이미 등록된 적용 시작일이거나 저장 중 오류가 발생했습니다.");
        return;
      }

      alert("급여 조건이 추가/변경되었습니다.");
      if (user) fetchShopAndData(user.shop_id);
    } catch (err) {
      console.error("예외 발생:", err);
      setErrorMsg("급여 조건 저장 중 오류가 발생했습니다.");
    }
  };

  const handleResign = async (staffId: string) => {
    if (!confirm("해직 처리하시겠습니까? 퇴사 처리 시 로그인 목록에서 제외됩니다.")) {
      return;
    }

    try {
      const { error } = await supabase
        .from("staff")
        .update({ status: "resigned", resigned_at: new Date().toISOString() })
        .eq("id", staffId);

      if (error) {
        alert("퇴사 처리 중 오류가 발생했습니다.");
        return;
      }
      if (user) fetchShopAndData(user.shop_id);
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
      {/* 공통 배너 */}
      <header className="bg-white border-b border-[#E2E8F0] px-4 md:px-6 h-[56px] md:h-[64px] flex items-center justify-between sticky top-0 z-40">
        <h1 className="text-lg md:text-xl font-bold text-[#0F172A] tracking-tight">
          플라워샵 근무 관리
        </h1>
        <div className="flex items-center gap-2">
          <Link
            href={`/shop/${user.shop_id}`}
            className="px-3 min-h-[40px] h-[40px] border border-[#E2E8F0] rounded-xl text-xs text-[#0F172A] font-semibold hover:bg-slate-50 flex items-center gap-1.5 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            매장 메인
          </Link>
          <button
            onClick={() => {
              localStorage.removeItem("flower_shop_user");
              router.push("/");
            }}
            className="px-3 min-h-[40px] h-[40px] bg-slate-100 text-[#0F172A] text-xs font-semibold rounded-xl hover:bg-slate-200 transition"
          >
            로그아웃
          </button>
        </div>
      </header>

      <div className="max-w-[1120px] mx-auto w-full p-4 md:p-6 space-y-6">
        <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-[#059669]" />
              <h2 className="text-lg font-bold text-[#0F172A]">{shopName} 직원 관리</h2>
            </div>
            <p className="text-xs text-[#64748B]">
              직원 가입 승인, 급여 조건 설정 및 퇴사 상태 관리
            </p>
          </div>
          <Link
            href="/admin/attendance"
            className="min-h-[46px] h-[46px] px-5 bg-[#1E293B] text-white text-xs font-semibold rounded-xl hover:bg-[#0f172a] transition flex items-center justify-center gap-2 shadow-sm"
          >
            <Clock className="w-4 h-4 text-emerald-400" />
            월별 정산 및 기록 보완
          </Link>
        </div>

        {errorMsg && (
          <div className="flex items-center gap-2 p-4 bg-rose-50 border border-rose-200 text-rose-600 rounded-xl text-xs font-medium">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* 승인 대기자 목록 */}
        <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
            <h3 className="text-base font-bold text-[#0F172A]">승인 대기자 목록</h3>
            <span className="text-xs font-semibold text-[#D97706]">{pendingList.length}명</span>
          </div>

          {loading ? (
            <p className="text-xs text-[#64748B] text-center py-6">로딩 중...</p>
          ) : pendingList.length === 0 ? (
            <p className="text-xs text-[#64748B] text-center py-6">승인 대기 중인 직원이 없습니다.</p>
          ) : (
            <div className="space-y-4">
              {pendingList.map((st) => (
                <div
                  key={st.id}
                  className="p-4 bg-amber-50/40 border border-amber-200 rounded-xl flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-[#0F172A]">{st.name}</span>
                      <StatusBadge status="pending" />
                    </div>
                    <p className="text-xs text-[#64748B]">신청일: {st.created_at.slice(0, 10)}</p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      value={payTypes[st.id] || "hourly"}
                      onChange={(e) =>
                        setPayTypes({ ...payTypes, [st.id]: e.target.value as "hourly" | "monthly" })
                      }
                      className="min-h-[40px] h-[40px] px-3 border border-[#E2E8F0] rounded-xl text-xs bg-white font-medium"
                    >
                      <option value="hourly">시급</option>
                      <option value="monthly">월급</option>
                    </select>

                    <input
                      type="number"
                      value={amounts[st.id] ?? "10000"}
                      onChange={(e) => setAmounts({ ...amounts, [st.id]: e.target.value })}
                      placeholder="금액"
                      className="w-28 min-h-[40px] h-[40px] px-3 border border-[#E2E8F0] rounded-xl text-xs bg-white text-right font-medium"
                    />
                    <span className="text-xs text-[#64748B]">원</span>

                    <input
                      type="date"
                      value={effectiveDates[st.id] || new Date().toISOString().slice(0, 10)}
                      onChange={(e) => setEffectiveDates({ ...effectiveDates, [st.id]: e.target.value })}
                      className="min-h-[40px] h-[40px] px-3 border border-[#E2E8F0] rounded-xl text-xs bg-white"
                    />

                    <button
                      onClick={() => handleApprove(st.id)}
                      className="min-h-[40px] h-[40px] px-4 bg-[#059669] text-white text-xs font-semibold rounded-xl hover:bg-[#047857] transition"
                    >
                      승인
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 재직 직원 목록 */}
        <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
            <h3 className="text-base font-bold text-[#0F172A]">재직 직원 목록</h3>
            <span className="text-xs font-semibold text-[#059669]">{activeList.length}명</span>
          </div>

          {loading ? (
            <p className="text-xs text-[#64748B] text-center py-6">로딩 중...</p>
          ) : activeList.length === 0 ? (
            <p className="text-xs text-[#64748B] text-center py-6">재직 중인 직원이 없습니다.</p>
          ) : (
            <div className="space-y-4">
              {activeList.map((st) => {
                const comp = compensations[st.id];
                return (
                  <div
                    key={st.id}
                    className="p-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-[#0F172A]">{st.name}</span>
                        <StatusBadge status="active" />
                      </div>
                      <p className="text-xs text-[#64748B]">
                        현재 조건:{" "}
                        <span className="font-semibold text-[#0F172A]">
                          {comp ? (comp.pay_type === "hourly" ? "시급" : "월급") : "미설정"}{" "}
                          {comp ? comp.amount_krw.toLocaleString() + "원" : ""}
                        </span>{" "}
                        (적용일: {comp ? comp.effective_from : "-"})
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <select
                        value={payTypes[st.id] || "hourly"}
                        onChange={(e) =>
                          setPayTypes({ ...payTypes, [st.id]: e.target.value as "hourly" | "monthly" })
                        }
                        className="min-h-[40px] h-[40px] px-3 border border-[#E2E8F0] rounded-xl text-xs bg-white font-medium"
                      >
                        <option value="hourly">시급</option>
                        <option value="monthly">월급</option>
                      </select>

                      <input
                        type="number"
                        value={amounts[st.id] ?? "10000"}
                        onChange={(e) => setAmounts({ ...amounts, [st.id]: e.target.value })}
                        placeholder="금액"
                        className="w-28 min-h-[40px] h-[40px] px-3 border border-[#E2E8F0] rounded-xl text-xs bg-white text-right font-medium"
                      />
                      <span className="text-xs text-[#64748B]">원</span>

                      <input
                        type="date"
                        value={effectiveDates[st.id] || new Date().toISOString().slice(0, 10)}
                        onChange={(e) => setEffectiveDates({ ...effectiveDates, [st.id]: e.target.value })}
                        className="min-h-[40px] h-[40px] px-3 border border-[#E2E8F0] rounded-xl text-xs bg-white"
                      />

                      <button
                        onClick={() => handleUpdateCompensation(st.id)}
                        className="min-h-[40px] h-[40px] px-4 bg-[#1E293B] text-white text-xs font-semibold rounded-xl hover:bg-[#0f172a] transition"
                      >
                        조건 변경
                      </button>

                      <button
                        onClick={() => handleResign(st.id)}
                        className="min-h-[40px] h-[40px] px-4 bg-rose-600 text-white text-xs font-semibold rounded-xl hover:bg-rose-700 transition"
                      >
                        퇴사 처리
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 퇴사자 목록 */}
        <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
            <h3 className="text-base font-bold text-[#64748B]">퇴사자 목록</h3>
            <span className="text-xs font-semibold text-[#64748B]">{resignedList.length}명</span>
          </div>

          {resignedList.length === 0 ? (
            <p className="text-xs text-[#64748B] text-center py-4">퇴사자가 없습니다.</p>
          ) : (
            <div className="divide-y divide-[#E2E8F0]">
              {resignedList.map((st) => (
                <div key={st.id} className="py-3 flex justify-between items-center text-xs text-[#64748B]">
                  <span className="font-semibold text-[#0F172A]">{st.name}</span>
                  <div className="flex items-center gap-2">
                    <span>퇴사 완료 (과거 기록 유지)</span>
                    <StatusBadge status="resigned" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
