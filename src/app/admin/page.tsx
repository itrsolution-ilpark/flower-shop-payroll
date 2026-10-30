"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import ProgramBanner from "@/components/ProgramBanner";
import StatusBadge from "@/components/StatusBadge";
import Button from "@/components/ui/Button";
import * as StaffActions from "@/actions/staffActions";
import { getShopsAction } from "@/actions/shopActions";
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
      // 1. 플라워샵 이름 조회
      try {
        const shops = await getShopsAction();
        const curShop = shops?.find((s: { id: string; name: string }) => s.id === shopId);
        if (curShop) setShopName(curShop.name);
      } catch {
        // 무시
      }

      // 2. 직원 목록 및 급여 조건 조회
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
    } catch {
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
    val: string
  ) => {
    setPendingForms((prev) => ({
      ...prev,
      [staffId]: {
        ...(prev[staffId] || {
          payType: "hourly",
          amountKrw: "10000",
          effectiveFrom: format(new Date(), "yyyy-MM-dd"),
        }),
        [field]: val,
      },
    }));
  };

  // 승인 버튼 핸들러
  const handleApprove = async (staffId: string) => {
    const form = pendingForms[staffId] || {
      payType: "hourly",
      amountKrw: "10000",
      effectiveFrom: format(new Date(), "yyyy-MM-dd"),
    };

    const amount = parseInt(form.amountKrw, 10);
    if (isNaN(amount) || amount <= 0) {
      setErrorMsg("급여 금액은 0보다 큰 정수여야 합니다.");
      return;
    }
    if (!form.effectiveFrom) {
      setErrorMsg("급여 적용 시작일을 입력해주세요.");
      return;
    }

    try {
      const res = await StaffActions.approveStaffAction(
        staffId,
        form.payType,
        amount,
        form.effectiveFrom
      );

      if (!res.success) {
        setErrorMsg(res.error || "직원 승인 처리에 실패했습니다.");
        return;
      }

      setSuccessMsg("직원 가입이 승인되었습니다.");
      if (user) {
        await fetchShopAndStaff(user.shop_id);
      }
    } catch {
      setErrorMsg("직원 승인 처리 중 오류가 발생했습니다.");
    }
  };

  // 퇴사 처리 핸들러
  const handleResign = async (staff: StaffMember) => {
    const confirmed = window.confirm(
      `'${staff.name}' 직원을 퇴사 처리하시겠습니까?\n퇴사 후에는 직원 로그인 목록에서 제외되며 기록은 보존됩니다.`
    );
    if (!confirmed) return;

    try {
      const resignFn = (StaffActions as Record<string, any>).resignStaffAction;
      if (typeof resignFn === "function") {
        const res = await resignFn(staff.id);
        if (!res.success) {
          setErrorMsg(res.error || "퇴사 처리에 실패했습니다.");
          return;
        }
      }
      setSuccessMsg(`'${staff.name}' 직원이 퇴사 처리되었습니다.`);
      if (user) {
        await fetchShopAndStaff(user.shop_id);
      }
    } catch {
      setErrorMsg("퇴사 처리 중 오류가 발생했습니다.");
    }
  };

  // 재직 직원 급여 조건 수정 모달 열기
  const openEditModal = (staff: StaffMember) => {
    setEditingStaff(staff);
    const latestComp = staff.compensations && staff.compensations.length > 0
      ? staff.compensations[0]
      : null;

    setEditPayType(latestComp?.pay_type || "hourly");
    setEditAmountKrw(latestComp?.amount_krw ? String(latestComp.amount_krw) : "10000");
    setEditEffectiveFrom(format(new Date(), "yyyy-MM-dd"));
    setModalError("");
  };

  // 재직 직원 급여 조건 저장
  const handleSaveCompensation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaff) return;
    setModalError("");

    const amount = parseInt(editAmountKrw, 10);
    if (isNaN(amount) || amount <= 0) {
      setModalError("급여 금액은 0보다 큰 정수여야 합니다.");
      return;
    }
    if (!editEffectiveFrom) {
      setModalError("급여 적용 시작일을 입력해주세요.");
      return;
    }

    setModalSubmitting(true);
    try {
      const updateCompFn =
        (StaffActions as Record<string, any>).updateCompensationAction ||
        (StaffActions as Record<string, any>).addCompensationAction;

      if (typeof updateCompFn === "function") {
        const res = await updateCompFn(
          editingStaff.id,
          editPayType,
          amount,
          editEffectiveFrom
        );
        if (!res.success) {
          setModalError(res.error || "급여 조건 저장에 실패했습니다.");
          setModalSubmitting(false);
          return;
        }
      }

      setSuccessMsg("급여 조건이 성공적으로 저장되었습니다.");
      setEditingStaff(null);
      if (user) {
        await fetchShopAndStaff(user.shop_id);
      }
    } catch {
      setModalError("급여 조건 저장 중 오류가 발생했습니다.");
    } finally {
      setModalSubmitting(false);
    }
  };

  // 로그아웃
  const handleLogout = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("flower_shop_user");
    }
    router.push(user ? `/shop/${user.shop_id}` : "/");
  };

  const pendingStaff = staffList.filter((s) => s.status === "pending");
  const activeStaff = staffList.filter((s) => s.status === "active");
  const resignedStaff = staffList.filter((s) => s.status === "resigned");

  return (
    <div className="flex flex-col flex-1">
      {/* 1. 공통 프로그램 배너 */}
      <ProgramBanner
        rightElement={
          <div className="flex items-center gap-2">
            <Link
              href={`/shop/${user?.shop_id || ""}`}
              className="px-3 min-h-[40px] h-[40px] border border-[#E2E8F0] rounded-xl text-xs text-[#0F172A] font-semibold hover:bg-slate-50 flex items-center gap-1.5 transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              플라워샵 홈
            </Link>
            <button
              onClick={handleLogout}
              className="px-3 min-h-[40px] h-[40px] border border-rose-200 text-rose-600 rounded-xl text-xs font-semibold hover:bg-rose-50 flex items-center gap-1.5 transition"
            >
              <LogOut className="w-3.5 h-3.5" />
              로그아웃
            </button>
          </div>
        }
      />

      <main className="max-w-[1120px] mx-auto w-full p-4 md:p-6 space-y-6">
        {/* 상단 헤더: 플라워샵 이름 및 '직원 관리' 제목 */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-sm">
          <div>
            <p className="text-xs font-semibold text-[#059669]">{shopName}</p>
            <h1 className="text-xl font-bold text-[#0F172A] mt-0.5">직원 관리</h1>
            <p className="text-xs text-[#64748B] mt-1">
              승인 대기 직원 심사, 재직 직원의 급여 조건 관리 및 퇴사 처리를 수행합니다.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/admin/attendance"
              className="px-4 min-h-[46px] h-[46px] bg-[#059669] text-white rounded-xl text-xs font-semibold hover:bg-[#047857] flex items-center gap-2 shadow-sm transition"
            >
              <FileText className="w-4 h-4" />
              근무 기록 및 급여 정산
            </Link>
          </div>
        </div>

        {/* 상단 피드백 메시지 */}
        {errorMsg && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-xs text-rose-700">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-xs text-emerald-700">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* 1. 승인 대기 목록 */}
        <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-500" />
              <h2 className="text-base font-bold text-[#0F172A]">승인 대기 직원</h2>
            </div>
            <span className="text-xs font-semibold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
              {pendingStaff.length}명
            </span>
          </div>

          {loading ? (
            <div className="text-center py-8 text-xs text-[#64748B]">직원 목록 로딩 중...</div>
          ) : pendingStaff.length === 0 ? (
            <div className="text-center py-8 text-xs text-[#64748B]">
              현재 승인 대기 중인 직원이 없습니다.
            </div>
          ) : (
            <div className="space-y-3">
              {pendingStaff.map((staff) => {
                const form = pendingForms[staff.id] || {
                  payType: "hourly",
                  amountKrw: "10000",
                  effectiveFrom: format(new Date(), "yyyy-MM-dd"),
                };
                return (
                  <div
                    key={staff.id}
                    className="p-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-[#0F172A]">{staff.name}</span>
                        <StatusBadge status="pending" />
                      </div>
                      <p className="text-xs text-[#64748B]">
                        신청일: {staff.created_at ? format(new Date(staff.created_at), "yyyy-MM-dd HH:mm") : "-"}
                      </p>
                    </div>

                    {/* 승인 폼: 시급/월급 선택, 금액, 적용 시작일, 승인 버튼 */}
                    <div className="flex flex-wrap items-center gap-2">
                      <select
                        value={form.payType}
                        onChange={(e) =>
                          handlePendingFormChange(
                            staff.id,
                            "payType",
                            e.target.value as "hourly" | "monthly"
                          )
                        }
                        className="min-h-[46px] h-[46px] px-3 border border-[#E2E8F0] rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#059669]"
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
                          placeholder={form.payType === "hourly" ? "시급(원)" : "월급(원)"}
                          min={1}
                          className="min-h-[46px] h-[46px] w-28 px-3 border border-[#E2E8F0] rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#059669]"
                        />
                        <span className="text-xs text-[#64748B]">원</span>
                      </div>

                      <input
                        type="date"
                        value={form.effectiveFrom}
                        onChange={(e) =>
                          handlePendingFormChange(staff.id, "effectiveFrom", e.target.value)
                        }
                        className="min-h-[46px] h-[46px] px-3 border border-[#E2E8F0] rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#059669]"
                      />

                      <button
                        onClick={() => handleApprove(staff.id)}
                        className="min-h-[46px] h-[46px] px-4 bg-[#059669] text-white text-xs font-semibold rounded-xl hover:bg-[#047857] transition shadow-sm active:scale-95"
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
              <UserCheck className="w-4 h-4 text-emerald-600" />
              <h2 className="text-base font-bold text-[#0F172A]">재직 직원</h2>
            </div>
            <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
              {activeStaff.length}명
            </span>
          </div>

          {loading ? (
            <div className="text-center py-8 text-xs text-[#64748B]">직원 목록 로딩 중...</div>
          ) : activeStaff.length === 0 ? (
            <div className="text-center py-8 text-xs text-[#64748B]">
              현재 재직 중인 직원이 없습니다.
            </div>
          ) : (
            <div className="space-y-3">
              {activeStaff.map((staff) => {
                const latestComp = staff.compensations && staff.compensations.length > 0
                  ? staff.compensations[0]
                  : null;

                return (
                  <div
                    key={staff.id}
                    className="p-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-[#0F172A]">{staff.name}</span>
                        <StatusBadge status="active" />
                      </div>
                      <div className="text-xs text-[#64748B] flex flex-wrap items-center gap-3">
                        {latestComp ? (
                          <>
                            <span className="font-semibold text-[#0F172A]">
                              {latestComp.pay_type === "hourly" ? "시급" : "월급"}{" "}
                              {latestComp.amount_krw.toLocaleString()}원
                            </span>
                            <span className="text-slate-400">|</span>
                            <span>적용일: {latestComp.effective_from}</span>
                          </>
                        ) : (
                          <span className="text-rose-500">급여 조건 미등록</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEditModal(staff)}
                        className="min-h-[46px] h-[46px] px-3.5 border border-[#E2E8F0] bg-white rounded-xl text-xs font-semibold text-[#0F172A] hover:bg-slate-50 transition flex items-center gap-1.5"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-[#64748B]" />
                        급여 조건 수정
                      </button>
                      <button
                        onClick={() => handleResign(staff)}
                        className="min-h-[46px] h-[46px] px-3.5 border border-rose-200 bg-white rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 transition"
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
              <UserX className="w-4 h-4 text-slate-500" />
              <h2 className="text-base font-bold text-[#0F172A]">퇴사 직원</h2>
            </div>
            <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200">
              {resignedStaff.length}명
            </span>
          </div>

          {loading ? (
            <div className="text-center py-6 text-xs text-[#64748B]">로딩 중...</div>
          ) : resignedStaff.length === 0 ? (
            <div className="text-center py-6 text-xs text-[#64748B]">퇴사한 직원이 없습니다.</div>
          ) : (
            <div className="space-y-2">
              {resignedStaff.map((staff) => (
                <div
                  key={staff.id}
                  className="p-3.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl flex items-center justify-between opacity-80"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-[#0F172A]">{staff.name}</span>
                    <StatusBadge status="resigned" />
                  </div>
                  <span className="text-xs text-[#64748B]">과거 기록 보존됨</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* 재직 직원 급여 조건 수정 모달 */}
      {editingStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-[#E2E8F0] space-y-4">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
              <div>
                <h3 className="text-base font-bold text-[#0F172A]">급여 조건 수정</h3>
                <p className="text-xs text-[#64748B] mt-0.5">
                  직원: <span className="font-semibold text-[#059669]">{editingStaff.name}</span>
                </p>
              </div>
              <button
                onClick={() => setEditingStaff(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
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
                  className="w-full min-h-[46px] h-[46px] px-3.5 border border-[#E2E8F0] rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#059669]"
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
                  min={1}
                  placeholder="예: 10000"
                  className="w-full min-h-[46px] h-[46px] px-3.5 border border-[#E2E8F0] rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#059669]"
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
                  className="w-full min-h-[46px] h-[46px] px-3.5 border border-[#E2E8F0] rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#059669]"
                />
              </div>

              {modalError && (
                <p className="text-xs text-rose-500 font-medium text-center">{modalError}</p>
              )}

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingStaff(null)}
                  className="flex-1 min-h-[46px] h-[46px] border border-[#E2E8F0] rounded-xl text-xs font-semibold text-[#64748B] hover:bg-slate-50 transition"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={modalSubmitting}
                  className="flex-1 min-h-[46px] h-[46px] bg-[#059669] text-white rounded-xl text-xs font-semibold hover:bg-[#047857] transition disabled:opacity-50"
                >
                  {modalSubmitting ? "저장 중..." : "저장"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
