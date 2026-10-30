"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Banner from "@/components/Banner";
import StatusBadge from "@/components/StatusBadge";
import MonthPicker from "@/components/MonthPicker";
import TimePickerModal from "@/components/TimePickerModal";
import PinInput from "@/components/PinInput";
import Button from "@/components/ui/Button";
import {
  getShopAdminDashboardDataAction,
  approveStaffAction,
  updateCompensationAction,
  resignStaffAction,
  updateShopAdminSelfAction,
  ApprovedStaffItem,
  PendingStaffItem,
} from "@/actions/shopAdminActions";
import {
  getStaffAttendanceMonthAction,
  saveAttendanceAction,
  AttendanceItem,
} from "@/actions/attendanceActions";
import { exportMonthlyPayrollCsvAction } from "@/actions/exportActions";
import { logoutAction } from "@/actions/authActions";
import { formatCurrency, formatMinutesToHoursAndMinutes } from "@/lib/utils";
import { format } from "date-fns";
import {
  Users,
  Clock,
  Download,
  CheckCircle2,
  UserX,
  Edit3,
  LogOut,
  Calendar,
  Lock,
  ChevronRight,
  ShieldCheck,
} from "lucide-react";

export default function ShopAdminDashboardPage() {
  const router = useRouter();

  const [currentMonth, setCurrentMonth] = useState<string>(format(new Date(), "yyyy-MM"));
  const [activeTab, setActiveTab] = useState<"staff" | "payroll">("staff");

  const [shopName, setShopName] = useState<string>("");
  const [adminName, setAdminName] = useState<string>("");
  const [pendingStaff, setPendingStaff] = useState<PendingStaffItem[]>([]);
  const [approvedStaff, setApprovedStaff] = useState<ApprovedStaffItem[]>([]);

  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string>("");

  // 직원 승인 / 수정을 위한 폼 상태 Map
  const [approvalForms, setApprovalForms] = useState<
    Record<
      string,
      {
        payType: "hourly" | "monthly";
        timeUnit: "minute" | "hour";
        amount: string;
        effectiveFrom: string;
      }
    >
  >({});

  // 비밀번호 변경 모달 상태
  const [showSelfEditModal, setShowSelfEditModal] = useState<boolean>(false);
  const [selfName, setSelfName] = useState<string>("");
  const [selfPin, setSelfPin] = useState<string>("");
  const [selfConfirmPin, setSelfConfirmPin] = useState<string>("");
  const [selfError, setSelfError] = useState<string>("");
  const [selfSubmitting, setSelfSubmitting] = useState<boolean>(false);

  // 직원별 출퇴근 상세 조회/수정용 모달 상태
  const [selectedStaffForAtt, setSelectedStaffForAtt] = useState<ApprovedStaffItem | null>(null);
  const [staffAttendances, setStaffAttendances] = useState<AttendanceItem[]>([]);
  const [attDate, setAttDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  const [attClockIn, setAttClockIn] = useState<string>("09:00");
  const [attClockOut, setAttClockOut] = useState<string>("18:00");
  const [attLoading, setAttLoading] = useState<boolean>(false);
  const [attMsg, setAttMsg] = useState<string>("");

  // TimePicker Modal
  const [timePickerTarget, setTimePickerTarget] = useState<"in" | "out" | null>(null);

  const loadData = async (month: string = currentMonth) => {
    setLoading(true);
    setErrorMsg("");

    const res = await getShopAdminDashboardDataAction(month);
    if (!res.success || !res.data) {
      setErrorMsg(res.error || "데이터를 불러올 수 없습니다.");
      setLoading(false);
      return;
    }

    setShopName(res.data.shopName);
    setAdminName(res.data.adminName);
    setPendingStaff(res.data.pendingStaff);
    setApprovedStaff(res.data.approvedStaff);

    // 승인 대기자 승인 폼 기본값 세팅
    const initialForms: Record<string, any> = {};
    const todayStr = format(new Date(), "yyyy-MM-dd");

    res.data.pendingStaff.forEach((st) => {
      initialForms[st.id] = {
        payType: "hourly",
        timeUnit: "minute",
        amount: "10000",
        effectiveFrom: todayStr,
      };
    });

    res.data.approvedStaff.forEach((st) => {
      initialForms[st.id] = {
        payType: st.pay_type || "hourly",
        timeUnit: st.time_unit || "minute",
        amount: st.amount_krw ? String(st.amount_krw) : "10000",
        effectiveFrom: st.effective_from || todayStr,
      };
    });

    setApprovalForms(initialForms);
    setLoading(false);
  };

  useEffect(() => {
    loadData(currentMonth);
  }, [currentMonth]);

  const handleFormChange = (staffId: string, field: string, value: any) => {
    setApprovalForms((prev) => ({
      ...prev,
      [staffId]: {
        ...prev[staffId],
        [field]: value,
      },
    }));
  };

  // 직원 승인 처리
  const handleApprove = async (staffId: string) => {
    const form = approvalForms[staffId];
    if (!form) return;

    const amt = parseInt(form.amount, 10);
    if (isNaN(amt) || amt <= 0) {
      alert("올바른 급여 금액(원)을 입력해주세요.");
      return;
    }

    const res = await approveStaffAction(
      staffId,
      form.payType,
      form.timeUnit,
      amt,
      form.effectiveFrom
    );

    if (!res.success) {
      alert(res.error || "승인 처리 중 오류가 발생했습니다.");
      return;
    }

    alert("직원이 승인 처리되었습니다.");
    await loadData(currentMonth);
  };

  // 기존 재직 직원 급여 조건 수정
  const handleUpdateComp = async (staffId: string) => {
    const form = approvalForms[staffId];
    if (!form) return;

    const amt = parseInt(form.amount, 10);
    if (isNaN(amt) || amt <= 0) {
      alert("올바른 급여 금액(원)을 입력해주세요.");
      return;
    }

    const res = await updateCompensationAction(
      staffId,
      form.payType,
      form.timeUnit,
      amt,
      form.effectiveFrom
    );

    if (!res.success) {
      alert(res.error || "급여 조건 수정 중 오류가 발생했습니다.");
      return;
    }

    alert("급여 조건이 수정되었습니다.");
    await loadData(currentMonth);
  };

  // 퇴사 처리
  const handleResign = async (staffId: string, name: string) => {
    if (!confirm(`정말로 '${name}' 직원을 퇴사 처리하시겠습니까?`)) return;

    const res = await resignStaffAction(staffId);
    if (!res.success) {
      alert(res.error || "퇴사 처리 중 오류가 발생했습니다.");
      return;
    }

    alert("퇴사 처리가 완료되었습니다.");
    await loadData(currentMonth);
  };

  // CSV 다운로드
  const handleExportCsv = async () => {
    const res = await exportMonthlyPayrollCsvAction("", currentMonth);
    if (!res.success || !res.data) {
      alert(res.error || "CSV 파일 생성에 실패했습니다.");
      return;
    }

    const blob = new Blob([res.data], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", res.filename || `flower_payroll_${currentMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 본인 정보/비밀번호 변경
  const handleOpenSelfEditModal = () => {
    setSelfName(adminName);
    setSelfPin("");
    setSelfConfirmPin("");
    setSelfError("");
    setShowSelfEditModal(true);
  };

  const handleSelfEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSelfError("");

    if (!selfName.trim()) {
      setSelfError("이름을 입력해주세요.");
      return;
    }
    if (selfPin.length !== 6) {
      setSelfError("비밀번호는 숫자 6자리여야 합니다.");
      return;
    }
    if (selfPin !== selfConfirmPin) {
      setSelfError("비밀번호 확인이 일치하지 않습니다.");
      return;
    }

    setSelfSubmitting(true);
    try {
      const res = await updateShopAdminSelfAction(selfName, selfPin, selfConfirmPin);
      if (!res.success) {
        setSelfError(res.error || "수정에 실패했습니다.");
        setSelfSubmitting(false);
        return;
      }

      alert("본인 정보 및 비밀번호가 안전하게 변경되었습니다.");
      setShowSelfEditModal(false);
      await loadData(currentMonth);
    } catch {
      setSelfError("처리 중 오류가 발생했습니다.");
    } finally {
      setSelfSubmitting(false);
    }
  };

  // 직원 출퇴근 기록 직접 모완 모달 열기
  const handleOpenAttendanceModal = async (staff: ApprovedStaffItem) => {
    setSelectedStaffForAtt(staff);
    setAttMsg("");
    setAttLoading(true);

    const atts = await getStaffAttendanceMonthAction(staff.id, currentMonth);
    setStaffAttendances(atts);
    setAttLoading(false);
  };

  const handleSaveAttendance = async () => {
    if (!selectedStaffForAtt) return;
    setAttMsg("");

    const res = await saveAttendanceAction(
      selectedStaffForAtt.id,
      attDate,
      attClockIn,
      attClockOut
    );

    if (!res.success) {
      setAttMsg(res.error || "저장 실패");
      return;
    }

    setAttMsg("출퇴근 기록이 보완/저장되었습니다.");
    const updated = await getStaffAttendanceMonthAction(selectedStaffForAtt.id, currentMonth);
    setStaffAttendances(updated);
    await loadData(currentMonth);
  };

  const handleLogout = async () => {
    await logoutAction();
    router.push("/login");
  };

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen">
        <Banner />
        <div className="flex flex-1 items-center justify-center p-6 text-xs text-slate-500">
          대시보드 데이터를 불러오는 중...
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#F8FAFC]">
      {/* 상단 고정 헤더 배너 */}
      <Banner
        rightElement={
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-700 hidden sm:inline">
              {shopName} | {adminName} 님
            </span>
            <button
              onClick={handleOpenSelfEditModal}
              className="px-3 min-h-[38px] h-[38px] bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition flex items-center gap-1.5"
            >
              <Lock className="w-3.5 h-3.5 text-slate-600" />
              비밀번호 변경
            </button>
            <button
              onClick={handleLogout}
              className="px-3 min-h-[38px] h-[38px] bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold transition flex items-center gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" />
              로그아웃
            </button>
          </div>
        }
      />

      <main className="flex-1 max-w-[1120px] mx-auto w-full p-4 md:p-6 space-y-6 pb-20">
        {/* 상단 매장 헤더 요약 카드 */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
              <ShieldCheck className="w-3.5 h-3.5" />
              플라워샵 관리자 전용
            </div>
            <h2 className="text-xl font-extrabold text-slate-900">{shopName} 대시보드</h2>
            <p className="text-xs text-slate-500">
              직원 가입 승인, 급여 조건 설정, 근무 보완 및 월별 정산을 관리합니다.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <MonthPicker value={currentMonth} onChange={setCurrentMonth} />
            <button
              onClick={handleExportCsv}
              className="min-h-[42px] h-[42px] px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl transition flex items-center gap-1.5 shadow-sm shrink-0"
            >
              <Download className="w-4 h-4" />
              CSV 다운로드
            </button>
          </div>
        </div>

        {errorMsg && (
          <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-medium text-center">
            {errorMsg}
          </div>
        )}

        {/* 탭 구분: [직원 관리] / [근무 및 급여 정산] */}
        <div className="flex border-b border-slate-200 gap-2">
          <button
            onClick={() => setActiveTab("staff")}
            className={`pb-3 px-4 font-bold text-sm border-b-2 transition flex items-center gap-2 ${
              activeTab === "staff"
                ? "border-emerald-600 text-emerald-700"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Users className="w-4 h-4" />
            직원 관리
            {pendingStaff.length > 0 && (
              <span className="px-2 py-0.5 bg-amber-500 text-white text-[11px] font-extrabold rounded-full">
                {pendingStaff.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("payroll")}
            className={`pb-3 px-4 font-bold text-sm border-b-2 transition flex items-center gap-2 ${
              activeTab === "payroll"
                ? "border-emerald-600 text-emerald-700"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Clock className="w-4 h-4" />
            근무 및 급여 정산
          </button>
        </div>

        {/* 탭 1: 직원 관리 (승인 대기자 + 재직 직원) */}
        {activeTab === "staff" && (
          <div className="space-y-6">
            {/* 1. 승인 대기자 목록 */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <h3 className="text-sm font-bold text-slate-900">
                    승인 대기자 목록 ({pendingStaff.length}명)
                  </h3>
                </div>
              </div>

              {pendingStaff.length === 0 ? (
                <p className="text-center py-6 text-xs text-slate-400">
                  승인 대기 중인 신규 직원 신청이 없습니다.
                </p>
              ) : (
                <div className="space-y-4">
                  {pendingStaff.map((st) => {
                    const form = approvalForms[st.id] || {
                      payType: "hourly",
                      timeUnit: "minute",
                      amount: "10000",
                      effectiveFrom: format(new Date(), "yyyy-MM-dd"),
                    };

                    return (
                      <div
                        key={st.id}
                        className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-slate-900">{st.name}</span>
                            <StatusBadge status="pending" />
                          </div>
                          <span className="text-xs text-slate-500">신청일: {st.created_at}</span>
                        </div>

                        {/* 급여 조건 설정 폼 */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 bg-white p-3 rounded-xl border border-slate-200">
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                              급여 형태
                            </label>
                            <select
                              value={form.payType}
                              onChange={(e) =>
                                handleFormChange(st.id, "payType", e.target.value)
                              }
                              className="w-full min-h-[38px] h-[38px] px-2.5 border border-slate-200 rounded-lg text-xs bg-white text-slate-900"
                            >
                              <option value="hourly">시급</option>
                              <option value="monthly">월급</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                              계산 단위
                            </label>
                            <select
                              value={form.timeUnit}
                              onChange={(e) =>
                                handleFormChange(st.id, "timeUnit", e.target.value)
                              }
                              disabled={form.payType === "monthly"}
                              className="w-full min-h-[38px] h-[38px] px-2.5 border border-slate-200 rounded-lg text-xs bg-white text-slate-900 disabled:bg-slate-100"
                            >
                              <option value="minute">분 단위 (정밀)</option>
                              <option value="hour">시간 단위 (절사)</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                              금액 (원)
                            </label>
                            <input
                              type="number"
                              value={form.amount}
                              onChange={(e) => handleFormChange(st.id, "amount", e.target.value)}
                              placeholder="10000"
                              className="w-full min-h-[38px] h-[38px] px-2.5 border border-slate-200 rounded-lg text-xs bg-white text-slate-900"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                              적용 시작일
                            </label>
                            <input
                              type="date"
                              value={form.effectiveFrom}
                              onChange={(e) =>
                                handleFormChange(st.id, "effectiveFrom", e.target.value)
                              }
                              className="w-full min-h-[38px] h-[38px] px-2.5 border border-slate-200 rounded-lg text-xs bg-white text-slate-900"
                            />
                          </div>
                        </div>

                        <div className="flex justify-end">
                          <button
                            onClick={() => handleApprove(st.id)}
                            className="min-h-[38px] px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition flex items-center gap-1.5"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            가입 승인
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 2. 재직 직원 및 급여 조건 수정 목록 */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <h3 className="text-sm font-bold text-slate-900">소속 직원 목록</h3>
                </div>
                <span className="text-xs text-slate-500">총 {approvedStaff.length}명</span>
              </div>

              {approvedStaff.length === 0 ? (
                <p className="text-center py-6 text-xs text-slate-400">
                  승인된 직원이 없습니다.
                </p>
              ) : (
                <div className="space-y-4">
                  {approvedStaff.map((st) => {
                    const form = approvalForms[st.id] || {
                      payType: st.pay_type || "hourly",
                      timeUnit: st.time_unit || "minute",
                      amount: st.amount_krw ? String(st.amount_krw) : "10000",
                      effectiveFrom: st.effective_from || format(new Date(), "yyyy-MM-dd"),
                    };

                    return (
                      <div
                        key={st.id}
                        className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-slate-900">{st.name}</span>
                            <StatusBadge status={st.status} />
                            <span className="text-xs text-slate-500 font-medium">
                              ({st.pay_type === "monthly" ? "월급" : "시급"}{" "}
                              {st.amount_krw ? formatCurrency(st.amount_krw) : "미설정"})
                            </span>
                          </div>

                          {st.status === "approved" && (
                            <button
                              onClick={() => handleResign(st.id, st.name)}
                              className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-semibold transition flex items-center gap-1"
                            >
                              <UserX className="w-3 h-3" />
                              퇴사 처리
                            </button>
                          )}
                        </div>

                        {/* 급여 조건 수정 폼 */}
                        {st.status === "approved" && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 bg-white p-3 rounded-xl border border-slate-200">
                            <div>
                              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                                급여 형태
                              </label>
                              <select
                                value={form.payType}
                                onChange={(e) =>
                                  handleFormChange(st.id, "payType", e.target.value)
                                }
                                className="w-full min-h-[38px] h-[38px] px-2.5 border border-slate-200 rounded-lg text-xs bg-white text-slate-900"
                              >
                                <option value="hourly">시급</option>
                                <option value="monthly">월급</option>
                              </select>
                            </div>

                            <div>
                              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                                계산 단위
                              </label>
                              <select
                                value={form.timeUnit}
                                onChange={(e) =>
                                  handleFormChange(st.id, "timeUnit", e.target.value)
                                }
                                disabled={form.payType === "monthly"}
                                className="w-full min-h-[38px] h-[38px] px-2.5 border border-slate-200 rounded-lg text-xs bg-white text-slate-900 disabled:bg-slate-100"
                              >
                                <option value="minute">분 단위 (정밀)</option>
                                <option value="hour">시간 단위 (절사)</option>
                              </select>
                            </div>

                            <div>
                              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                                금액 (원)
                              </label>
                              <input
                                type="number"
                                value={form.amount}
                                onChange={(e) => handleFormChange(st.id, "amount", e.target.value)}
                                className="w-full min-h-[38px] h-[38px] px-2.5 border border-slate-200 rounded-lg text-xs bg-white text-slate-900"
                              />
                            </div>

                            <div className="flex items-end gap-2">
                              <div className="flex-1">
                                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                                  적용 시작일
                                </label>
                                <input
                                  type="date"
                                  value={form.effectiveFrom}
                                  onChange={(e) =>
                                    handleFormChange(st.id, "effectiveFrom", e.target.value)
                                  }
                                  className="w-full min-h-[38px] h-[38px] px-2.5 border border-slate-200 rounded-lg text-xs bg-white text-slate-900"
                                />
                              </div>
                              <button
                                onClick={() => handleUpdateComp(st.id)}
                                className="min-h-[38px] px-3 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-lg transition shrink-0"
                              >
                                조건 저장
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 탭 2: 근무 및 급여 정산 (모바일 반응형 최적화) */}
        {activeTab === "payroll" && (
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-3 gap-2">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  {currentMonth} 월별 근무 및 급여 정산 내역
                </h3>
                <p className="text-xs text-slate-500">
                  직원별 총 근무 시간과 지급 예정액을 한눈에 조회하고 근무시간을 보완합니다.
                </p>
              </div>

              <button
                onClick={handleExportCsv}
                className="px-3 min-h-[36px] h-[36px] bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition flex items-center gap-1.5 self-start sm:self-auto"
              >
                <Download className="w-3.5 h-3.5" />
                CSV 다운로드
              </button>
            </div>

            {/* 모바일(S25, 아이폰 16) 지원 수평 스크롤 테이블 */}
            <div className="w-full overflow-x-auto whitespace-nowrap -mx-4 px-4 sm:mx-0 sm:px-0">
              <table className="w-full text-xs text-left border-collapse min-w-[600px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                    <th className="py-2.5 px-3">직원명</th>
                    <th className="py-2.5 px-3">상태</th>
                    <th className="py-2.5 px-3">급여 형태</th>
                    <th className="py-2.5 px-3">계산 단위</th>
                    <th className="py-2.5 px-3">적용 금액</th>
                    <th className="py-2.5 px-3">총 근무시간</th>
                    <th className="py-2.5 px-3 text-right">지급 예정액</th>
                    <th className="py-2.5 px-3 text-center">근무 보완</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {approvedStaff.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-6 text-slate-400">
                        정산 데이터가 존재하지 않습니다.
                      </td>
                    </tr>
                  ) : (
                    approvedStaff.map((st) => (
                      <tr key={st.id} className="hover:bg-slate-50/80 transition">
                        <td className="py-3 px-3 font-bold text-slate-900">{st.name}</td>
                        <td className="py-3 px-3">
                          <StatusBadge status={st.status} />
                        </td>
                        <td className="py-3 px-3">
                          {st.pay_type === "hourly"
                            ? "시급"
                            : st.pay_type === "monthly"
                            ? "월급"
                            : "미설정"}
                        </td>
                        <td className="py-3 px-3">
                          {st.time_unit === "hour" ? "시간(절사)" : "분(정밀)"}
                        </td>
                        <td className="py-3 px-3">
                          {st.amount_krw ? formatCurrency(st.amount_krw) : "0원"}
                        </td>
                        <td className="py-3 px-3 font-semibold text-slate-800">
                          {st.pay_type === "monthly"
                            ? "-"
                            : formatMinutesToHoursAndMinutes(st.totalMinutes || 0)}
                        </td>
                        <td className="py-3 px-3 text-right font-extrabold text-emerald-700 text-sm">
                          {formatCurrency(st.monthlyAmount || 0)}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <button
                            onClick={() => handleOpenAttendanceModal(st)}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold text-[11px] transition inline-flex items-center gap-1"
                          >
                            <Edit3 className="w-3 h-3 text-slate-600" />
                            출퇴근 보완
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 하단 영구 배치 링크: SPEC 명세 기준 추가 관리자 분리 링크 ('추가 관리자 등록/관리 →') */}
        <div className="bg-slate-900 text-white rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm">
          <div className="space-y-0.5 text-center sm:text-left">
            <h4 className="text-sm font-bold text-slate-100">소속 플라워샵 추가 관리자 관리</h4>
            <p className="text-xs text-slate-400">
              동일 플라워샵에 2명 이상의 복수 관리자를 6자리 비밀번호로 등록 및 관리합니다.
            </p>
          </div>
          <Link
            href="/shop-admin/admins"
            className="px-4 min-h-[42px] h-[42px] bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold transition flex items-center gap-1.5 shrink-0"
          >
            추가 관리자 등록/관리 →
          </Link>
        </div>
      </main>

      {/* 출퇴근 기록 직접 보완 모달 */}
      {selectedStaffForAtt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {selectedStaffForAtt.name} 출퇴근 기록 보완
                </h3>
                <p className="text-xs text-slate-500">{currentMonth} 월별 기록 직접 등록/수정</p>
              </div>
              <button
                onClick={() => setSelectedStaffForAtt(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {/* 입력 폼 */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    근무 날짜
                  </label>
                  <input
                    type="date"
                    value={attDate}
                    onChange={(e) => setAttDate(e.target.value)}
                    className="w-full min-h-[38px] h-[38px] px-2.5 border border-slate-200 rounded-lg text-xs bg-white text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    출근 시각
                  </label>
                  <button
                    type="button"
                    onClick={() => setTimePickerTarget("in")}
                    className="w-full min-h-[38px] h-[38px] px-2.5 border border-slate-200 rounded-lg text-xs bg-white text-slate-900 text-left font-semibold"
                  >
                    {attClockIn}
                  </button>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    퇴근 시각
                  </label>
                  <button
                    type="button"
                    onClick={() => setTimePickerTarget("out")}
                    className="w-full min-h-[38px] h-[38px] px-2.5 border border-slate-200 rounded-lg text-xs bg-white text-slate-900 text-left font-semibold"
                  >
                    {attClockOut}
                  </button>
                </div>
              </div>

              {attMsg && (
                <p className="text-xs font-medium text-emerald-700 text-center">{attMsg}</p>
              )}

              <button
                onClick={handleSaveAttendance}
                className="w-full min-h-[38px] bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold transition"
              >
                출퇴근 기록 저장하기
              </button>
            </div>

            {/* 해당 월 기존 내역 표 */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-800">
                {currentMonth} 등록된 출퇴근 내역 ({staffAttendances.length}건)
              </h4>
              <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100">
                {staffAttendances.length === 0 ? (
                  <p className="p-4 text-center text-xs text-slate-400">
                    등록된 출퇴근 기록이 없습니다.
                  </p>
                ) : (
                  staffAttendances.map((att) => (
                    <div
                      key={att.id || att.work_date}
                      className="p-2.5 text-xs flex items-center justify-between bg-white hover:bg-slate-50"
                    >
                      <span className="font-semibold text-slate-900">{att.work_date}</span>
                      <span className="text-slate-600">
                        {att.clock_in} ~ {att.clock_out}
                      </span>
                      <span className="font-bold text-emerald-700">
                        {formatMinutesToHoursAndMinutes(att.total_minutes)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button variant="outline" onClick={() => setSelectedStaffForAtt(null)}>
                닫기
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 관리자 본인 정보/비밀번호 변경 모달 */}
      {showSelfEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl border border-slate-200 space-y-4">
            <h3 className="text-base font-bold text-slate-900">관리자 본인 정보 변경</h3>
            <p className="text-xs text-slate-500">
              이름 및 6자리 비밀번호를 안전하게 수정할 수 있습니다.
            </p>

            <form onSubmit={handleSelfEditSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1">
                  관리자 이름
                </label>
                <input
                  type="text"
                  value={selfName}
                  onChange={(e) => setSelfName(e.target.value)}
                  className="w-full min-h-[42px] h-[42px] px-3 border border-slate-200 rounded-xl text-sm bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-800"
                />
              </div>

              <PinInput
                label="새 6자리 비밀번호"
                value={selfPin}
                onChange={setSelfPin}
                length={6}
              />

              <PinInput
                label="새 6자리 비밀번호 확인"
                value={selfConfirmPin}
                onChange={setSelfConfirmPin}
                length={6}
              />

              {selfError && (
                <p className="text-xs text-rose-600 font-medium text-center bg-rose-50 p-2 rounded-lg border border-rose-200">
                  {selfError}
                </p>
              )}

              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowSelfEditModal(false)}
                  disabled={selfSubmitting}
                >
                  취소
                </Button>
                <Button type="submit" variant="secondary" disabled={selfSubmitting}>
                  {selfSubmitting ? "수정 중..." : "수정 완료"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TimePicker 모달 */}
      <TimePickerModal
        isOpen={timePickerTarget !== null}
        title={timePickerTarget === "in" ? "출근 시간 선택" : "퇴근 시간 선택"}
        initialValue={timePickerTarget === "in" ? attClockIn : attClockOut}
        onClose={() => setTimePickerTarget(null)}
        onConfirm={(time) => {
          if (timePickerTarget === "in") setAttClockIn(time);
          if (timePickerTarget === "out") setAttClockOut(time);
        }}
      />
    </div>
  );
}
