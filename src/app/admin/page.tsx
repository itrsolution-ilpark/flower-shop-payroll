"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import Button from "@/components/ui/Button";
import StatusBadge from "@/components/StatusBadge";
import { Users, Shield, Calendar, DollarSign, Check, X, ArrowLeft } from "lucide-react";

interface StaffUser {
  id: string;
  shop_id: string;
  name: string;
  is_admin: boolean;
}

interface StaffMember {
  id: string;
  name: string;
  status: "pending" | "active" | "resigned";
  created_at: string;
  pay_type?: "hourly" | "monthly";
  amount_krw?: number;
  effective_from?: string;
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<StaffUser | null>(null);
  const [shopName, setShopName] = useState<string>("");
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [successMsg, setSuccessMsg] = useState<string>("");

  // 승인 모달 또는 인라인 승인 폼 상태 (staff_id -> { pay_type, amount_krw, effective_from })
  const [approvalData, setApprovalData] = useState<
    Record<string, { pay_type: "hourly" | "monthly"; amount_krw: string; effective_from: string }>
  >({});

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

      const { data: staffData } = await supabase
        .from("staff")
        .select("*")
        .eq("shop_id", shopId)
        .order("created_at", { ascending: false });

      if (staffData) {
        const enhancedList: StaffMember[] = [];
        const initialApprovalMap: Record<
          string,
          { pay_type: "hourly" | "monthly"; amount_krw: string; effective_from: string }
        > = {};

        const todayStr = new Date().toISOString().split("T")[0];

        for (const st of staffData) {
          // 최신 급여 조건 조회
          const { data: compData } = await supabase
            .from("compensation")
            .select("*")
            .eq("staff_id", st.id)
            .order("effective_from", { ascending: false })
            .limit(1)
            .maybeSingle();

          enhancedList.push({
            ...st,
            pay_type: compData?.pay_type || "hourly",
            amount_krw: compData?.amount_krw || 10000,
            effective_from: compData?.effective_from || todayStr,
          });

          initialApprovalMap[st.id] = {
            pay_type: compData?.pay_type || "hourly",
            amount_krw: compData?.amount_krw ? String(compData.amount_krw) : "10000",
            effective_from: compData?.effective_from || todayStr,
          };
        }

        setStaffList(enhancedList);
        setApprovalData(initialApprovalMap);
      }
    } catch (err) {
      console.error("예외 발생:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveStaff = async (staffId: string) => {
    setErrorMsg("");
    setSuccessMsg("");

    const info = approvalData[staffId];
    if (!info || !info.amount_krw || isNaN(Number(info.amount_krw)) || Number(info.amount_krw) <= 0) {
      setErrorMsg("유효한 급여 금액을 입력해주세요.");
      return;
    }

    if (!info.effective_from) {
      setErrorMsg("적용 시작일을 선택해주세요.");
      return;
    }

    try {
      // 1. 직원 상태를 'active'로 변경
      const { error: updateError } = await supabase
        .from("staff")
        .update({ status: "active" })
        .eq("id", staffId);

      if (updateError) {
        setErrorMsg("직원 승인 처리 중 오류가 발생했습니다.");
        return;
      }

      // 2. 급여 조건 저장
      const { error: compError } = await supabase.from("compensation").upsert(
        [
          {
            staff_id: staffId,
            pay_type: info.pay_type,
            amount_krw: Number(info.amount_krw),
            effective_from: info.effective_from,
          },
        ],
        { onConflict: "staff_id,effective_from" }
      );

      if (compError) {
        setErrorMsg("급여 조건 저장 중 오류가 발생했습니다.");
        return;
      }

      setSuccessMsg("직원이 정상적으로 승인 및 재직 처리되었습니다.");
      if (user) fetchShopAndStaff(user.shop_id);
    } catch (err) {
      console.error("예외 발생:", err);
      setErrorMsg("처리 중 오류가 발생했습니다.");
    }
  };

  const handleUpdateComp = async (staffId: string) => {
    setErrorMsg("");
    setSuccessMsg("");

    const info = approvalData[staffId];
    if (!info || !info.amount_krw || Number(info.amount_krw) <= 0) {
      setErrorMsg("유효한 금액을 입력해주세요.");
      return;
    }

    try {
      const { error: compError } = await supabase.from("compensation").upsert(
        [
          {
            staff_id: staffId,
            pay_type: info.pay_type,
            amount_krw: Number(info.amount_krw),
            effective_from: info.effective_from,
          },
        ],
        { onConflict: "staff_id,effective_from" }
      );

      if (compError) {
        setErrorMsg("급여 조건 수정 중 오류가 발생했습니다.");
        return;
      }

      setSuccessMsg("급여 조건이 수정되었습니다.");
      if (user) fetchShopAndStaff(user.shop_id);
    } catch (err) {
      console.error("예외 발생:", err);
      setErrorMsg("처리 중 오류가 발생했습니다.");
    }
  };

  const handleResignStaff = async (staffId: string) => {
    if (!confirm("정말 퇴사 처리하시겠습니까? 퇴사 처리된 직원은 로그인 목록에서 제외됩니다.")) return;

    try {
      const { error } = await supabase
        .from("staff")
        .update({ status: "resigned", resigned_at: new Date().toISOString() })
        .eq("id", staffId);

      if (error) {
        setErrorMsg("퇴사 처리 중 오류가 발생했습니다.");
        return;
      }

      setSuccessMsg("퇴사 처리되었습니다.");
      if (user) fetchShopAndStaff(user.shop_id);
    } catch (err) {
      console.error("예외 발생:", err);
      setErrorMsg("처리 중 오류가 발생했습니다.");
    }
  };

  if (!user || loading) {
    return <div className="flex flex-col flex-1 p-6 justify-center text-center text-xs text-[#64748B]">로딩 중...</div>;
  }

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
            href="/admin/attendance"
            className="px-3.5 min-h-[40px] h-[40px] bg-[#059669] text-white rounded-xl text-xs font-semibold hover:bg-[#047857] flex items-center gap-1.5 transition"
          >
            근무 기록 및 급여 정산
          </Link>
          <button
            onClick={() => {
              localStorage.removeItem("flower_shop_user");
              router.push("/");
            }}
            className="px-3 min-h-[40px] h-[40px] border border-[#E2E8F0] rounded-xl text-xs text-[#0F172A] font-semibold hover:bg-slate-50 transition"
          >
            로그아웃
          </button>
        </div>
      </header>

      <div className="max-w-[1120px] mx-auto w-full p-4 md:p-6 space-y-6">
        <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-sm flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-[#0F172A]">직원 관리 대시보드</h2>
            <p className="text-xs text-[#64748B] mt-0.5">
              플라워샵: <span className="font-semibold text-[#059669]">{shopName}</span>
            </p>
          </div>
        </div>

        {errorMsg && <p className="text-xs text-rose-500 font-medium text-center">{errorMsg}</p>}
        {successMsg && <p className="text-xs text-[#059669] font-medium text-center">{successMsg}</p>}

        {/* 1. 승인 대기 목록 */}
        <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-sm space-y-4">
          <h3 className="text-base font-bold text-[#0F172A] flex items-center gap-2 border-b border-[#E2E8F0] pb-3">
            <Users className="w-4 h-4 text-[#059669]" />
            승인 대기 직원 ({pendingList.length}명)
          </h3>

          {pendingList.length === 0 ? (
            <p className="text-xs text-[#64748B] text-center py-6">승인 대기 중인 직원이 없습니다.</p>
          ) : (
            <div className="space-y-4">
              {pendingList.map((st) => {
                const info = approvalData[st.id] || {
                  pay_type: "hourly",
                  amount_krw: "10000",
                  effective_from: new Date().toISOString().split("T")[0],
                };

                return (
                  <div
                    key={st.id}
                    className="p-4 bg-slate-50 border border-[#E2E8F0] rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-[#0F172A]">{st.name}</span>
                        <StatusBadge status={st.status} />
                      </div>
                      <span className="text-xs text-[#64748B] mt-1 block">
                        신청일: {new Date(st.created_at).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <select
                        value={info.pay_type}
                        onChange={(e) =>
                          setApprovalData({
                            ...approvalData,
                            [st.id]: { ...info, pay_type: e.target.value as "hourly" | "monthly" },
                          })
                        }
                        className="min-h-[42px] h-[42px] px-3 border border-[#E2E8F0] rounded-xl text-xs bg-white font-semibold"
                      >
                        <option value="hourly">시급</option>
                        <option value="monthly">월급</option>
                      </select>

                      <input
                        type="number"
                        value={info.amount_krw}
                        onChange={(e) =>
                          setApprovalData({
                            ...approvalData,
                            [st.id]: { ...info, amount_krw: e.target.value },
                          })
                        }
                        placeholder="금액 (원)"
                        className="w-32 min-h-[42px] h-[42px] px-3 border border-[#E2E8F0] rounded-xl text-xs bg-white"
                      />

                      <input
                        type="date"
                        value={info.effective_from}
                        onChange={(e) =>
                          setApprovalData({
                            ...approvalData,
                            [st.id]: { ...info, effective_from: e.target.value },
                          })
                        }
                        className="min-h-[42px] h-[42px] px-3 border border-[#E2E8F0] rounded-xl text-xs bg-white"
                      />

                      <Button
                        variant="primary"
                        onClick={() => handleApproveStaff(st.id)}
                        className="w-auto px-5 h-[42px] min-h-[42px] text-xs font-semibold"
                      >
                        승인
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 2. 재직 직원 목록 */}
        <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-sm space-y-4">
          <h3 className="text-base font-bold text-[#0F172A] flex items-center gap-2 border-b border-[#E2E8F0] pb-3">
            <Shield className="w-4 h-4 text-[#059669]" />
            재직 직원 관리 ({activeList.length}명)
          </h3>

          {activeList.length === 0 ? (
            <p className="text-xs text-[#64748B] text-center py-6">재직 중인 직원이 없습니다.</p>
          ) : (
            <div className="space-y-4">
              {activeList.map((st) => {
                const info = approvalData[st.id] || {
                  pay_type: st.pay_type || "hourly",
                  amount_krw: st.amount_krw ? String(st.amount_krw) : "10000",
                  effective_from: st.effective_from || new Date().toISOString().split("T")[0],
                };

                return (
                  <div
                    key={st.id}
                    className="p-4 bg-slate-50 border border-[#E2E8F0] rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-[#0F172A]">{st.name}</span>
                        <StatusBadge status={st.status} />
                      </div>
                      <span className="text-xs text-[#64748B] mt-1 block">
                        현재 급여: {st.pay_type === "hourly" ? "시급" : "월급"} {(st.amount_krw || 0).toLocaleString()}원 (적용일: {st.effective_from})
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <select
                        value={info.pay_type}
                        onChange={(e) =>
                          setApprovalData({
                            ...approvalData,
                            [st.id]: { ...info, pay_type: e.target.value as "hourly" | "monthly" },
                          })
                        }
                        className="min-h-[42px] h-[42px] px-3 border border-[#E2E8F0] rounded-xl text-xs bg-white font-semibold"
                      >
                        <option value="hourly">시급</option>
                        <option value="monthly">월급</option>
                      </select>

                      <input
                        type="number"
                        value={info.amount_krw}
                        onChange={(e) =>
                          setApprovalData({
                            ...approvalData,
                            [st.id]: { ...info, amount_krw: e.target.value },
                          })
                        }
                        placeholder="금액"
                        className="w-32 min-h-[42px] h-[42px] px-3 border border-[#E2E8F0] rounded-xl text-xs bg-white"
                      />

                      <input
                        type="date"
                        value={info.effective_from}
                        onChange={(e) =>
                          setApprovalData({
                            ...approvalData,
                            [st.id]: { ...info, effective_from: e.target.value },
                          })
                        }
                        className="min-h-[42px] h-[42px] px-3 border border-[#E2E8F0] rounded-xl text-xs bg-white"
                      />

                      <button
                        onClick={() => handleUpdateComp(st.id)}
                        className="px-4 h-[42px] min-h-[42px] bg-slate-800 text-white text-xs font-semibold rounded-xl hover:bg-slate-900 transition"
                      >
                        급여 수정
                      </button>

                      <button
                        onClick={() => handleResignStaff(st.id)}
                        className="px-4 h-[42px] min-h-[42px] bg-rose-600 text-white text-xs font-semibold rounded-xl hover:bg-rose-700 transition"
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

        {/* 3. 퇴사 직원 목록 */}
        {resignedList.length > 0 && (
          <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-sm space-y-4">
            <h3 className="text-base font-bold text-[#0F172A] border-b border-[#E2E8F0] pb-3">
              퇴사 직원 목록 ({resignedList.length}명)
            </h3>
            <div className="space-y-2">
              {resignedList.map((st) => (
                <div key={st.id} className="p-3 bg-slate-50 border border-[#E2E8F0] rounded-xl flex items-center justify-between text-xs">
                  <span className="font-bold text-[#0F172A]">{st.name}</span>
                  <StatusBadge status={st.status} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
