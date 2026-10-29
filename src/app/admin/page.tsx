"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import ProgramBanner from "@/components/ProgramBanner";
import StatusBadge from "@/components/StatusBadge";
import Button from "@/components/ui/Button";
import * as StaffActions from "@/actions/staffActions";
import { getShopsAction } from "@/actions/shopActions";
import { supabase } from "@/lib/supabaseClient";
import {
  Users,
  UserCheck,
  UserX,
  Clock,
  Calendar,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  LogOut,
  FileText,
  Edit3,
  X,
  CreditCard,
} from "lucide-react";
import { format } from "date-fns";

interface StaffUser {
  id: string;
  shop_id: string;
  name: string;
  is_admin: boolean;
}

interface CompensationItem {
  id?: string;
  staff_id?: string;
  pay_type: "hourly" | "monthly";
  amount_krw: number;
  effective_from: string;
  created_at?: string;
}

interface StaffMember {
  id: string;
  shop_id: string;
  name: string;
  status: "pending" | "active" | "resigned";
  is_admin?: boolean;
  created_at: string;
  resigned_at?: string | null;
  compensations?: CompensationItem[];
}

interface PendingFormState {
  payType: "hourly" | "monthly";
  amountKrw: string;
  effectiveFrom: string;
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<StaffUser | null>(null);
  const [shopName, setShopName] = useState<string>("");
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [successMsg, setSuccessMsg] = useState<string>("");

  // 대기 직원별 인라인 입력 폼 상태 (staffId -> PendingFormState)
  const [pendingForms, setPendingForms] = useState<Record<string, PendingFormState>>({});

  // 재직 직원 급여 조건 수정 모달 상태
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [editPayType, setEditPayType] = useState<"hourly" | "monthly">("hourly");
  const [editAmountKrw, setEditAmountKrw] = useState<string>("10000");
  const [editEffectiveFrom, setEditEffectiveFrom] = useState<string>(
    format(new Date(), "yyyy-MM-dd")
  );
  const [modalError, setModalError] = useState<string>("");
  const [modalSubmitting, setModalSubmitting] = useState<boolean>(false);

  // 상단 알림 자동 초기화
  useEffect(() => {
    if (successMsg) {
      const timer = setTimeout(() => setSuccessMsg(""), 4000);
      return () => clearTimeout(timer);
    }
  }, [successMsg]);

  useEffect(() => {
    if (errorMsg) {
      const timer = setTimeout(() => setErrorMsg(""), 5000);
      return () => clearTimeout(timer);
    }
  }, [errorMsg]);

  const fetchShopAndStaff = useCallback(async (shopId: string) => {
    setLoading(true);
    try {
      // 1. 플라워샵 이름 조회 (서버 액션 우선)
      let nameFound = "";
      try {
        const shops = await getShopsAction();
        const curShop = shops?.find((s: { id: string; name: string }) => s.id === shopId);
        if (curShop) nameFound = curShop.name;
      } catch {
        // fallback to supabaseClient
        const { data: sData } = await supabase
          .from("shops")
          .select("name")
          .eq("id", shopId)
          .single();
        if (sData) nameFound = sData.name;
      }
      setShopName(nameFound || "플라워샵");

      // 2. 직원 목록 및 급여 조건 조회 (서버 액션 우선)
      let rawStaff: StaffMember[] = [];
      const staffFn =
        (StaffActions as Record<string, any>).getShopStaffAction ||
        (StaffActions as Record<string, any>).getStaffListWithCompensationAction;

      if (typeof staffFn === "function") {
        const res = await staffFn(shopId);
        if (Array.isArray(res)) {
          rawStaff = res;
        } else if (res && Array.isArray(res.data)) {
          rawStaff = res.data;
        }
      }

      // 서버 액션 응답이 없으면 fallback 조회
      if (!rawStaff || rawStaff.length === 0) {
        const { data: staffData } = await supabase
          .from("staff")
          .select("id, shop_id, name, status, created_at, resigned_at")
          .eq("shop_id", shopId)
          .order("created_at", { ascending: false });

        const list = (staffData as StaffMember[]) || [];
        const staffWithComp = await Promise.all(
          list.map(async (st) => {
            const { data: compData } = await supabase
              .from("compensation")
              .select("id, staff_id, pay_type, amount_krw, effective_from, created_at")
              .eq("staff_id", st.id)
              .order("effective_from", { ascending: false });
            return {
              ...st,
              compensations: (compData as CompensationItem[]) || [],
            };
          })
        );
        rawStaff = staffWithComp;
      }

      setStaffList(rawStaff);

      // 대기 직원 폼 초기 상태 채우기
      const initialPendingForms: Record<string, PendingFormState> = {};
      const todayStr = format(new Date(), "yyyy-MM-dd");
      rawStaff
        .filter((s) => s.status === "pending")
        .forEach((s) => {
          initialPendingForms[s.id] = {
            payType: "hourly",
            amountKrw: "10000",
            effectiveFrom: todayStr,
          };
        });
      setPendingForms(initialPendingForms);
    } catch (err: any) {
      console.error("데이터 로드 오류:", err);
      setErrorMsg("직원 목록을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const raw = typeof window !== "undefined" ? localStorage.getItem("flower_shop_user") : null;
    if (!raw) {
      router.push("/");
      return;
    }
    try {
      const parsed: StaffUser = JSON.parse(raw);
      if (!parsed.is_admin) {
        router.push("/employee/dashboard");
        return;
      }
      setUser(parsed);
      fetchShopAndStaff(parsed.shop_id);
    } catch {
      router.push("/");
    }
  }, [router, fetchShopAndStaff]);

  // 대기 직원 인라인 폼 값 변경
  const handlePendingFormChange = (
    staffId: string,
    field: keyof PendingFormState,
    value: string
  ) => {
    setPendingForms((prev) => ({
      ...prev,
      [staffId]: {
        ...(prev[staffId] || {
          payType: "hourly",
          amountKrw: "10000",
          effectiveFrom: format(new Date(), "yyyy-MM-dd"),
        }),
        [field]: value,
      },
    }));
  };

  // 대기 직원 승인 제출
  const handleApproveStaff = async (staff: StaffMember) => {
    const form = pendingForms[staff.id] || {
      payType: "hourly",
      amountKrw: "10000",
      effectiveFrom: format(new Date(), "yyyy-MM-dd"),
    };

    const numAmount = parseInt(form.amountKrw, 10);
    if (isNaN(numAmount) || numAmount <= 0) {
      setErrorMsg(`${staff.name} 직원의 급여 금액은 0보다 큰 정수여야 합니다.`);
      return;
    }
    if (!form.effectiveFrom) {
      setErrorMsg(`${staff.name} 직원의 급여 적용 시작일을 선택해주세요.`);
      return;
    }

    try {
      let success = false;
      let errorReturn = "";

      const approveFn =
        (StaffActions as Record<string, any>).approveStaffAction ||
        (StaffActions as Record<string, any>).approveStaff;

      if (typeof approveFn === "function") {
        const res = await approveFn(staff.id, form.payType, numAmount, form.effectiveFrom);
        if (res && res.success !== false) {
          success = true;
        } else {
          errorReturn = res?.error || "승인 처리에 실패했습니다.";
        }
      } else {
        // 서버 액션 미구현 시 fallback (Supabase 직접 호출)
        const { error: staffErr } = await supabase
          .from("staff")
          .update({ status: "active" })
          .eq("id", staff.id);

        if (staffErr) {
          errorReturn = staffErr.message;
        } else {
          const { error: compErr } = await supabase.from("compensation").insert([
            {
              staff_id: staff.id,
              pay_type: form.payType,
              amount_krw: numAmount,
              effective_from: form.effectiveFrom,
            },
          ]);
          if (compErr) {
            await supabase.from("compensation").upsert(
              [
                {
                  staff_id: staff.id,
                  pay_type: form.payType,
                  amount_krw: numAmount,
                  effective_from: form.effectiveFrom,
                },
              ],
              { onConflict: "staff_id,effective_from" }
            );
          }
          success = true;
        }
      }

      if (success) {
        setSuccessMsg(`${staff.name} 직원이 성공적으로 승인되었습니다. (재직 전환)`);
        if (user) fetchShopAndStaff(user.shop_id);
      } else {
        setErrorMsg(errorReturn || "승인 처리 중 오류가 발생했습니다.");
      }
    } catch (err: any) {
      console.error("승인 오류:", err);
      setErrorMsg("승인 처리 중 서버 통신 오류가 발생했습니다.");
    }
  };

  // 재직 직원 퇴사 처리
  const handleResignStaff = async (staff: StaffMember) => {
    const confirmed = window.confirm(
      `정말로 '${staff.name}' 직원을 퇴사 처리하시겠습니까?\n퇴사 처리 후에는 직원 로그인 목록에서 제외되며 과거 근무/급여 기록은 안전하게 보존됩니다.`
    );
    if (!confirmed) return;

    try {
      let success = false;
      let errorReturn = "";

      const updateStatusFn =
        (StaffActions as Record<string, any>).updateStaffStatusAction ||
        (StaffActions as Record<string, any>).updateStaffStatus;

      if (typeof updateStatusFn === "function") {
        const res = await updateStatusFn(staff.id, "resigned");
        if (res && res.success !== false) {
          success = true;
        } else {
          errorReturn = res?.error || "퇴사 처리에 실패했습니다.";
        }
      } else {
        const { error: updateErr } = await supabase
          .from("staff")
          .update({
            status: "resigned",
            resigned_at: new Date().toISOString(),
          })
          .eq("id", staff.id);

        if (updateErr) {
          errorReturn = updateErr.message;
        } else {
          success = true;
        }
      }

      if (success) {
        setSuccessMsg(`${staff.name} 직원이 퇴사 처리되었습니다.`);
        if (user) fetchShopAndStaff(user.shop_id);
      } else {
        setErrorMsg(errorReturn || "퇴사 처리 중 오류가 발생했습니다.");
      }
    } catch (err: any) {
      console.error("퇴사 처리 오류:", err);
      setErrorMsg("퇴사 처리 중 오류가 발생했습니다.");
    }
  };

  // 급여 조건 수정 모달 열기
  const handleOpenEditModal = (staff: StaffMember) => {
    setEditingStaff(staff);
    const latestComp =
      staff.compensations && staff.compensations.length > 0 ? staff.compensations[0] : null;

    if (latestComp) {
      setEditPayType(latestComp.pay_type);
      setEditAmountKrw(String(latestComp.amount_krw));
      setEditEffectiveFrom(latestComp.effective_from || format(new Date(), "yyyy-MM-dd"));
    } else {
      setEditPayType("hourly");
      setEditAmountKrw("10000");
      setEditEffectiveFrom(format(new Date(), "yyyy-MM-dd"));
    }
    setModalError("");
  };

  // 급여 조건 수정 저장
  const handleSaveCompensation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaff) return;
    setModalError("");

    const numAmount = parseInt(editAmountKrw, 10);
    if (isNaN(numAmount) || numAmount <= 0) {
      setModalError("유효한 급여 금액(0보다 큰 정수)을 입력해주세요.");
      return;
    }
    if (!editEffectiveFrom) {
      setModalError("적용 시작일을 선택해주세요.");
      return;
    }

    setModalSubmitting(true);
    try {
      let success = false;
      let errorReturn = "";

      const updateCompFn =
        (StaffActions as Record<string, any>).updateStaffCompensationAction ||
        (StaffActions as Record<string, any>).saveStaffCompensationAction ||
        (StaffActions as Record<string, any>).updateCompensation;

      if (typeof updateCompFn === "function") {
        const res = await updateCompFn(
          editingStaff.id,
          editPayType,
          numAmount,
          editEffectiveFrom
        );
        if (res && res.success !== false) {
          success = true;
        } else {
          errorReturn = res?.error || "급여 조건 수정에 실패했습니다.";
        }
      } else {
        const { error: compErr } = await supabase.from("compensation").upsert(
          [
            {
              staff_id: editingStaff.id,
              pay_type: editPayType,
              amount_krw: numAmount,
              effective_from: editEffectiveFrom,
            },
          ],
          { onConflict: "staff_id,effective_from" }
        );

        if (compErr) {
          errorReturn = compErr.message;
        } else {
          success = true;
        }
      }

      if (success) {
        setSuccessMsg(`${editingStaff.name} 직원의 급여 조건이 수정되었습니다.`);
        setEditingStaff(null);
        if (user) fetchShopAndStaff(user.shop_id);
      } else {
        setModalError(errorReturn || "급여 조건 저장 중 오류가 발생했습니다.");
      }
    } catch (err: any) {
      console.error("급여 조건 저장 오류:", err);
      setModalError("급여 조건 저장 중 오류가 발생했습니다.");
    } finally {
      setModalSubmitting(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("flower_shop_user");
    router.push("/");
  };

  const pendingList = staffList.filter((s) => s.status === "pending");
  const activeList = staffList.filter((s) => s.status === "active");
  const resignedList = staffList.filter((s) => s.status === "resigned");

  return (
    <div className="flex flex-col flex-1">
      {/* 최상단 공통 프로그램 배너 */}
      <ProgramBanner
        rightElement={
          <div className="flex items-center gap-2">
            <Link
              href="/admin/attendance"
              className="px-3 min-h-[40px] h-[40px] border border-[#E2E8F0] rounded-xl text-xs text-[#0F172A] font-semibold hover:bg-slate-50 flex items-center gap-1.5 transition"
            >
              <Calendar className="w-3.5 h-3.5 text-[#059669]" />
              근무 기록 및 급여 정산
            </Link>
            <button
              onClick={handleLogout}
              className="px-3 min-h-[40px] h-[40px] bg-slate-100 text-[#0F172A] text-xs font-semibold rounded-xl hover:bg-slate-200 flex items-center gap-1.5 transition"
            >
              <LogOut className="w-3.5 h-3.5" />
              로그아웃
            </button>
          </div>
        }
      />

      <main className="max-w-[1120px] mx-auto w-full p-4 md:p-6 space-y-6">
        {/* 플라워샵 이름 및 직원 관리 제목 */}
        <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-[#059669]">
                {shopName}
              </span>
              <h2 className="text-lg font-bold text-[#0F172A]">직원 관리</h2>
            </div>
            <p className="text-xs text-[#64748B] mt-1">
              소속 직원의 가입 신청 승인, 급여 조건 설정, 재직 및 퇴사 상태를 관리합니다.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/admin/attendance"
              className="px-4 min-h-[44px] h-[44px] bg-[#059669] text-white text-xs font-semibold rounded-xl hover:bg-[#047857] flex items-center gap-1.5 transition shadow-sm"
            >
              <CreditCard className="w-4 h-4" />
              정산 바로가기
            </Link>
          </div>
        </div>

        {errorMsg && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-600 font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-[#059669] font-medium flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* 1. 승인 대기 목록 */}
        <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-500" />
              <h3 className="text-base font-bold text-[#0F172A]">
                가입 승인 대기 ({pendingList.length})
              </h3>
            </div>
            <span className="text-xs text-[#64748B]">
              급여 조건(시급/월급, 금액, 적용 시작일) 설정 후 승인
            </span>
          </div>

          {loading ? (
            <p className="text-xs text-[#64748B] text-center py-6">로딩 중...</p>
          ) : pendingList.length === 0 ? (
            <p className="text-xs text-[#64748B] text-center py-6">
              현재 승인 대기 중인 직원이 없습니다.
            </p>
          ) : (
            <div className="space-y-3">
              {pendingList.map((staff) => {
                const form = pendingForms[staff.id] || {
                  payType: "hourly",
                  amountKrw: "10000",
                  effectiveFrom: format(new Date(), "yyyy-MM-dd"),
                };

                return (
                  <div
                    key={staff.id}
                    className="p-4 bg-amber-50/40 border border-amber-200/80 rounded-xl flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-[#0F172A]">{staff.name}</span>
                          <StatusBadge status={staff.status} />
                        </div>
                        <span className="text-xs text-[#64748B]">
                          신청일: {format(new Date(staff.created_at), "yyyy-MM-dd")}
                        </span>
                      </div>
                    </div>

                    {/* 대기 직원의 시급/월급 선택, 금액, 적용 시작일, 승인 버튼 */}
                    <div className="flex flex-wrap items-center gap-2.5">
                      <select
                        value={form.payType}
                        onChange={(e) =>
                          handlePendingFormChange(
                            staff.id,
                            "payType",
                            e.target.value as "hourly" | "monthly"
                          )
                        }
                        className="min-h-[42px] h-[42px] px-3 border border-[#E2E8F0] rounded-xl text-xs font-semibold bg-white text-[#0F172A]"
                      >
                        <option value="hourly">시급</option>
                        <option value="monthly">월급</option>
                      </select>

                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          value={form.amountKrw}
                          onChange={(e) =>
                            handlePendingFormChange(staff.id, "amountKrw", e.target.value)
                          }
                          placeholder="금액 입력"
                          className="w-28 min-h-[42px] h-[42px] px-3 border border-[#E2E8F0] rounded-xl text-xs bg-white text-right font-semibold"
                        />
                        <span className="text-xs text-[#64748B]">원</span>
                      </div>

                      <div className="flex items-center gap-1">
                        <span className="text-xs text-[#64748B]">시작일:</span>
                        <input
                          type="date"
                          value={form.effectiveFrom}
                          onChange={(e) =>
                            handlePendingFormChange(staff.id, "effectiveFrom", e.target.value)
                          }
                          className="min-h-[42px] h-[42px] px-2.5 border border-[#E2E8F0] rounded-xl text-xs bg-white"
                        />
                      </div>

                      <button
                        onClick={() => handleApproveStaff(staff)}
                        className="px-4 min-h-[42px] h-[42px] bg-[#059669] text-white text-xs font-semibold rounded-xl hover:bg-[#047857] transition shadow-sm"
                      >
                        승인
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 2. 재직 직원 목록 */}
        <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
            <div className="flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-[#059669]" />
              <h3 className="text-base font-bold text-[#0F172A]">
                재직 직원 ({activeList.length})
              </h3>
            </div>
            <span className="text-xs text-[#64748B]">
              출퇴근 기록 및 정산 대상 (급여 조건 수정 및 퇴사 처리 가능)
            </span>
          </div>

          {loading ? (
            <p className="text-xs text-[#64748B] text-center py-6">로딩 중...</p>
          ) : activeList.length === 0 ? (
            <p className="text-xs text-[#64748B] text-center py-6">
              현재 재직 중인 직원이 없습니다.
            </p>
          ) : (
            <div className="space-y-3">
              {activeList.map((staff) => {
                const latestComp =
                  staff.compensations && staff.compensations.length > 0
                    ? staff.compensations[0]
                    : null;

                return (
                  <div
                    key={staff.id}
                    className="p-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-[#0F172A]">{staff.name}</span>
                        <StatusBadge status={staff.status} />
                      </div>
                      <div className="text-xs text-[#64748B] flex flex-wrap items-center gap-2">
                        {latestComp ? (
                          <>
                            <span className="font-semibold text-[#059669]">
                              {latestComp.pay_type === "hourly" ? "시급" : "월급"}{" "}
                              {latestComp.amount_krw.toLocaleString()}원
                            </span>
                            <span>·</span>
                            <span>적용일: {latestComp.effective_from}</span>
                          </>
                        ) : (
                          <span className="text-amber-600 font-medium">급여 조건 미설정</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleOpenEditModal(staff)}
                        className="px-3.5 min-h-[40px] h-[40px] border border-[#E2E8F0] bg-white text-[#0F172A] text-xs font-semibold rounded-xl hover:bg-slate-50 transition flex items-center gap-1"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        급여 조건 수정
                      </button>
                      <button
                        onClick={() => handleResignStaff(staff)}
                        className="px-3.5 min-h-[40px] h-[40px] bg-rose-50 text-rose-600 border border-rose-200 text-xs font-semibold rounded-xl hover:bg-rose-100 transition"
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
        <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
            <div className="flex items-center gap-2">
              <UserX className="w-4 h-4 text-slate-400" />
              <h3 className="text-base font-bold text-[#0F172A]">
                퇴사 직원 ({resignedList.length})
              </h3>
            </div>
            <span className="text-xs text-[#64748B]">과거 근무/정산 내역 보존 (로그인 제외)</span>
          </div>

          {loading ? (
            <p className="text-xs text-[#64748B] text-center py-6">로딩 중...</p>
          ) : resignedList.length === 0 ? (
            <p className="text-xs text-[#64748B] text-center py-6">퇴사 직원이 없습니다.</p>
          ) : (
            <div className="space-y-2">
              {resignedList.map((staff) => (
                <div
                  key={staff.id}
                  className="p-3 bg-slate-50 border border-[#E2E8F0] rounded-xl flex items-center justify-between text-xs text-[#64748B]"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-700">{staff.name}</span>
                    <StatusBadge status={staff.status} />
                  </div>
                  <span>
                    퇴사일:{" "}
                    {staff.resigned_at
                      ? format(new Date(staff.resigned_at), "yyyy-MM-dd")
                      : "기록 없음"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* 재직 직원 급여 조건 수정 모달 */}
      {editingStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl border border-[#E2E8F0] space-y-4">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-2">
              <h3 className="text-base font-bold text-[#0F172A]">
                {editingStaff.name} 급여 조건 수정
              </h3>
              <button
                onClick={() => setEditingStaff(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCompensation} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                  급여 유형
                </label>
                <select
                  value={editPayType}
                  onChange={(e) => setEditPayType(e.target.value as "hourly" | "monthly")}
                  className="w-full min-h-[46px] h-[46px] px-3 border border-[#E2E8F0] rounded-xl text-sm bg-white"
                >
                  <option value="hourly">시급</option>
                  <option value="monthly">월급</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                  급여 금액 (원)
                </label>
                <input
                  type="number"
                  value={editAmountKrw}
                  onChange={(e) => setEditAmountKrw(e.target.value)}
                  placeholder="예: 10000"
                  className="w-full min-h-[46px] h-[46px] px-3.5 border border-[#E2E8F0] rounded-xl text-sm bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                  적용 시작일
                </label>
                <input
                  type="date"
                  value={editEffectiveFrom}
                  onChange={(e) => setEditEffectiveFrom(e.target.value)}
                  className="w-full min-h-[46px] h-[46px] px-3.5 border border-[#E2E8F0] rounded-xl text-sm bg-white"
                />
              </div>

              {modalError && (
                <p className="text-xs text-rose-500 text-center font-medium">{modalError}</p>
              )}

              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingStaff(null)}
                  disabled={modalSubmitting}
                >
                  취소
                </Button>
                <Button type="submit" variant="primary" disabled={modalSubmitting}>
                  {modalSubmitting ? "저장 중..." : "수정 내용 저장"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
