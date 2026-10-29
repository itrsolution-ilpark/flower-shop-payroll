"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import Button from "@/components/ui/Button";
import StatusBadge from "@/components/StatusBadge";
import { Users, UserCheck, ShieldAlert, ArrowLeft, CheckCircle2, XCircle } from "lucide-react";

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
  status: "pending" | "active" | "resigned";
  is_admin: boolean;
  created_at: string;
  compensations?: {
    pay_type: "hourly" | "monthly";
    amount_krw: number;
    effective_from: string;
  }[];
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<StaffUser | null>(null);
  const [shopName, setShopName] = useState<string>("");
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // 승인 모달 상태
  const [approvingStaff, setApprovingStaff] = useState<StaffMember | null>(null);
  const [payType, setPayType] = useState<"hourly" | "monthly">("hourly");
  const [amountKrw, setAmountKrw] = useState<string>("10000");
  const [effectiveFrom, setEffectiveFrom] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
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

      const { data: staffData } = await supabase
        .from("staff")
        .select("id, shop_id, name, status, is_admin, created_at")
        .eq("shop_id", shopId)
        .order("created_at", { ascending: false });

      const list = staffData || [];
      // 각 직원의 최신 급여 조건 조회
      const staffWithComp = await Promise.all(
        list.map(async (st) => {
          const { data: compData } = await supabase
            .from("compensation")
            .select("pay_type, amount_krw, effective_from")
            .eq("staff_id", st.id)
            .order("effective_from", { ascending: false });
          return {
            ...st,
            compensations: compData || [],
          };
        })
      );

      setStaffList(staffWithComp);
    } catch (err) {
      console.error("예외 발생:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenApproveModal = (staff: StaffMember) => {
    setApprovingStaff(staff);
    setPayType("hourly");
    setAmountKrw("10000");
    setEffectiveFrom(new Date().toISOString().split("T")[0]);
    setErrorMsg("");
  };

  const handleApproveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!approvingStaff) return;
    setErrorMsg("");

    const numAmount = parseInt(amountKrw, 10);
    if (isNaN(numAmount) || numAmount <= 0) {
      setErrorMsg("유효한 금액을 입력해주세요.");
      return;
    }

    if (!effectiveFrom) {
      setErrorMsg("적용 시작일을 선택해주세요.");
      return;
    }

    try {
      // 1. 직원 상태를 active로 변경
      const { error: staffError } = await supabase
        .from("staff")
        .update({ status: "active" })
        .eq("id", approvingStaff.id);

      if (staffError) {
        setErrorMsg("직원 승인 중 오류가 발생했습니다.");
        return;
      }

      // 2. 급여 조건 등록
      const { error: compError } = await supabase.from("compensation").insert([
        {
          staff_id: approvingStaff.id,
          pay_type: payType,
          amount_krw: numAmount,
          effective_from: effectiveFrom,
        },
      ]);

      if (compError) {
        // 이미 해당일 조건이 있으면 upsert 처리 시도
        await supabase.from("compensation").upsert(
          [
            {
              staff_id: approvingStaff.id,
              pay_type: payType,
              amount_krw: numAmount,
              effective_from: effectiveFrom,
            },
          ],
          { onConflict: "staff_id,effective_from" }
        );
      }

      setApprovingStaff(null);
      if (user) fetchShopAndStaff(user.shop_id);
    } catch (err) {
      console.error("예외 발생:", err);
      setErrorMsg("승인 처리 중 오류가 발생했습니다.");
    }
  };

  const handleUpdateStatus = async (staffId: string, newStatus: "active" | "resigned") => {
    try {
      const updateData: any = { status: newStatus };
      if (newStatus === "resigned") {
        updateData.resigned_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from("staff")
        .update(updateData)
        .eq("id", staffId);

      if (error) {
        alert("상태 변경 중 오류가 발생했습니다.");
        return;
      }

      if (user) fetchShopAndStaff(user.shop_id);
    } catch (err) {
      console.error("예외 발생:", err);
    }
  };

  if (!user || loading) {
    return <div className="flex flex-col flex-1 p-6 justify-center text-center text-xs text-[#64748B]">로딩 중...</div>;
  }

  const pendingList = staffList.filter((s) => s.status === "pending" && !s.is_admin);
  const activeList = staffList.filter((s) => s.status === "active" && !s.is_admin);
  const resignedList = staffList.filter((s) => s.status === "resigned" && !s.is_admin);

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
            매장 홈으로
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
        <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-sm flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-[#0F172A]">직원 관리</h2>
            <p className="text-xs text-[#64748B] mt-0.5">
              플라워샵: <span className="font-semibold text-[#059669]">{shopName}</span> · 관리자: {user.name} 님
            </p>
          </div>
          <Link
            href="/admin/attendance"
            className="px-4 min-h-[42px] h-[42px] bg-[#059669] text-white text-xs font-semibold rounded-xl hover:bg-[#047857] transition flex items-center gap-1.5"
          >
            근무 기록/급여 정산 &rarr;
          </Link>
        </div>

        {/* 1. 승인 대기 목록 */}
        <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-[#E2E8F0] pb-3">
            <Users className="w-4 h-4 text-[#059669]" />
            <h3 className="text-sm font-bold text-[#0F172A]">승인 대기 직원 ({pendingList.length}명)</h3>
          </div>

          {pendingList.length === 0 ? (
            <p className="text-xs text-[#64748B] text-center py-4">승인 대기 중인 직원이 없습니다.</p>
          ) : (
            <div className="space-y-3">
              {pendingList.map((st) => (
                <div
                  key={st.id}
                  className="p-4 bg-amber-50/50 border border-amber-200 rounded-xl flex items-center justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-[#0F172A]">{st.name}</span>
                      <StatusBadge status={st.status} />
                    </div>
                    <span className="text-[11px] text-[#64748B] mt-0.5 block">
                      신청일: {new Date(st.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <button
                    onClick={() => handleOpenApproveModal(st)}
                    className="px-4 min-h-[40px] h-[40px] bg-[#059669] text-white text-xs font-semibold rounded-xl hover:bg-[#047857] transition flex items-center gap-1 shrink-0"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    승인하기
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 2. 재직 직원 목록 */}
        <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-[#E2E8F0] pb-3">
            <UserCheck className="w-4 h-4 text-[#059669]" />
            <h3 className="text-sm font-bold text-[#0F172A]">재직 중인 직원 ({activeList.length}명)</h3>
          </div>

          {activeList.length === 0 ? (
            <p className="text-xs text-[#64748B] text-center py-4">재직 중인 직원이 없습니다.</p>
          ) : (
            <div className="space-y-3">
              {activeList.map((st) => {
                const latestComp = st.compensations && st.compensations.length > 0 ? st.compensations[0] : null;
                return (
                  <div
                    key={st.id}
                    className="p-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-[#0F172A]">{st.name}</span>
                        <StatusBadge status={st.status} />
                      </div>
                      <p className="text-xs text-[#64748B] mt-0.5">
                        급여 조건:{" "}
                        <span className="font-semibold text-[#0F172A]">
                          {latestComp
                            ? `${latestComp.pay_type === "hourly" ? "시급" : "월급"} ${latestComp.amount_krw.toLocaleString()}원 (적용일: ${latestComp.effective_from})`
                            : "미설정"}
                        </span>
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleOpenApproveModal(st)}
                        className="px-3 min-h-[38px] h-[38px] border border-[#E2E8F0] bg-white text-[#0F172A] text-xs font-semibold rounded-lg hover:bg-slate-50 transition"
                      >
                        급여 조건 변경
                      </button>
                      <button
                        onClick={() => handleUpdateStatus(st.id, "resigned")}
                        className="px-3 min-h-[38px] h-[38px] bg-rose-50 text-rose-600 border border-rose-200 text-xs font-semibold rounded-lg hover:bg-rose-100 transition"
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
            <h3 className="text-sm font-bold text-[#64748B] border-b border-[#E2E8F0] pb-3">
              퇴사한 직원 ({resignedList.length}명)
            </h3>
            <div className="space-y-3">
              {resignedList.map((st) => (
                <div
                  key={st.id}
                  className="p-4 bg-slate-50 border border-[#E2E8F0] rounded-xl flex items-center justify-between gap-3 opacity-75"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-[#64748B]">{st.name}</span>
                    <StatusBadge status={st.status} />
                  </div>
                  <button
                    onClick={() => handleUpdateStatus(st.id, "active")}
                    className="px-3 min-h-[36px] h-[36px] border border-[#E2E8F0] bg-white text-[#059669] text-xs font-semibold rounded-lg hover:bg-slate-50 transition"
                  >
                    재직 복귀
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 승인 및 급여 조건 설정 모달 */}
      {approvingStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-[#E2E8F0] space-y-4">
            <h3 className="text-base font-bold text-[#0F172A]">
              {approvingStaff.status === "pending" ? "직원 가입 승인 및 급여 설정" : "급여 조건 변경"}
            </h3>
            <p className="text-xs text-[#64748B]">
              대상 직원: <span className="font-semibold text-[#059669]">{approvingStaff.name}</span>
            </p>

            <form onSubmit={handleApproveSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#0F172A] mb-1">급여 유형</label>
                <select
                  value={payType}
                  onChange={(e) => setPayType(e.target.value as "hourly" | "monthly")}
                  className="w-full min-h-[46px] h-[46px] px-3.5 border border-[#E2E8F0] rounded-xl text-sm bg-white focus:ring-2 focus:ring-[#059669]"
                >
                  <option value="hourly">시급</option>
                  <option value="monthly">월급</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                  금액 (원)
                </label>
                <input
                  type="number"
                  min="1"
                  value={amountKrw}
                  onChange={(e) => setAmountKrw(e.target.value)}
                  placeholder={payType === "hourly" ? "시간당 시급 (예: 10000)" : "월 고정액 (예: 2500000)"}
                  className="w-full min-h-[46px] h-[46px] px-3.5 border border-[#E2E8F0] rounded-xl text-sm bg-white focus:ring-2 focus:ring-[#059669]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0F172A] mb-1">적용 시작일</label>
                <input
                  type="date"
                  value={effectiveFrom}
                  onChange={(e) => setEffectiveFrom(e.target.value)}
                  className="w-full min-h-[46px] h-[46px] px-3.5 border border-[#E2E8F0] rounded-xl text-sm bg-white focus:ring-2 focus:ring-[#059669]"
                />
              </div>

              {errorMsg && (
                <p className="text-xs text-rose-500 font-medium text-center">{errorMsg}</p>
              )}

              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setApprovingStaff(null)}
                >
                  취소
                </Button>
                <Button type="submit" variant="primary">
                  {approvingStaff.status === "pending" ? "승인 완료" : "변경 저장"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
