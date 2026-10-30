"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Banner from "@/components/Banner";
import StatusBadge from "@/components/StatusBadge";
import MonthPicker from "@/components/MonthPicker";
import PinInput from "@/components/PinInput";
import Button from "@/components/ui/Button";
import { format } from "date-fns";
import {
  getShopAdminDashboardDataAction,
  approveStaffAction,
  updateCompensationAction,
  resignStaffAction,
  addShopAdminAction,
  updateShopAdminSelfAction,
  ShopAdminDashboardData,
  ApprovedStaffItem,
} from "@/actions/shopAdminActions";
import { logoutAction } from "@/actions/authActions";
import { exportMonthlyPayrollCsvAction } from "@/actions/exportActions";
import { getStaffAttendanceMonthAction, saveAttendanceAction, AttendanceItem } from "@/actions/attendanceActions";
import { Users, UserPlus, Download, Edit, LogOut, Settings, Clock, Save } from "lucide-react";

export default function ShopAdminDashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<ShopAdminDashboardData | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string>(format(new Date(), "yyyy-MM"));
  const [activeTab, setActiveTab] = useState<"staff" | "admins" | "payroll">("staff");
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string>("");

  // 직원 승인/수정 폼 입력 상태
  const [selectedStaffId, setSelectedStaffId] = useState<string>("");
  const [payType, setPayType] = useState<"hourly" | "monthly">("hourly");
  const [timeUnit, setTimeUnit] = useState<"minute" | "hour">("minute");
  const [amountKrw, setAmountKrw] = useState<string>("10000");
  const [effectiveFrom, setEffectiveFrom] = useState<string>(format(new Date(), "yyyy-MM-01"));

  // 추가 관리자 등록 입력 상태
  const [newAdminName, setNewAdminName] = useState<string>("");
  const [newAdminPin, setNewAdminPin] = useState<string>("");
  const [adminSubmitting, setAdminSubmitting] = useState<boolean>(false);

  // 관리자 본인 정보 수정 모달 상태
  const [isSelfModalOpen, setIsSelfModalOpen] = useState<boolean>(false);
  const [selfName, setSelfName] = useState<string>("");
  const [selfPin, setSelfPin] = useState<string>("");
  const [selfConfirmPin, setSelfConfirmPin] = useState<string>("");
  const [selfError, setSelfError] = useState<string>("");

  // 출퇴근 수정 상태 (정산 탭)
  const [editingStaff, setEditingStaff] = useState<ApprovedStaffItem | null>(null);
  const [staffAttendanceList, setStaffAttendanceList] = useState<AttendanceItem[]>([]);
  const [editWorkDate, setEditWorkDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  const [editClockIn, setEditClockIn] = useState<string>("09:00");
  const [editClockOut, setEditClockOut] = useState<string>("18:00");

  useEffect(() => {
    loadDashboardData();
  }, [selectedMonth]);

  const loadDashboardData = async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const res = await getShopAdminDashboardDataAction(selectedMonth);
      if (!res.success || !res.data) {
        setErrorMsg(res.error || "대시보드 데이터를 불러오지 못했습니다.");
        if (res.error?.includes("권한")) {
          router.push("/login");
        }
        return;
      }
      setData(res.data);
      setSelfName(res.data.adminName);
    } catch {
      setErrorMsg("데이터 로딩 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logoutAction();
    router.push("/");
  };

  // 직원 가입 승인 처리
  const handleApproveStaff = async (staffId: string) => {
    setErrorMsg("");
    setActionSuccessMsg("");
    const amount = parseInt(amountKrw, 10);
    if (isNaN(amount) || amount <= 0) {
      setErrorMsg("유효한 급여 금액을 입력해주세요.");
      return;
    }

    const res = await approveStaffAction(staffId, payType, timeUnit, amount, effectiveFrom);
    if (!res.success) {
      setErrorMsg(res.error || "승인 처리 실패");
      return;
    }
    setActionSuccessMsg("직원이 정상적으로 승인되었습니다.");
    setSelectedStaffId("");
    loadDashboardData();
  };

  // 기존 직원 급여 조건 수정
  const handleUpdateComp = async (staffId: string) => {
    setErrorMsg("");
    setActionSuccessMsg("");
    const amount = parseInt(amountKrw, 10);
    if (isNaN(amount) || amount <= 0) {
      setErrorMsg("유효한 급여 금액을 입력해주세요.");
      return;
    }

    const res = await updateCompensationAction(staffId, payType, timeUnit, amount, effectiveFrom);
    if (!res.success) {
      setErrorMsg(res.error || "급여 조건 변경 실패");
      return;
    }
    setActionSuccessMsg("급여 조건이 수정되었습니다.");
    setSelectedStaffId("");
    loadDashboardData();
  };

  // 직원 퇴사 처리
  const handleResignStaff = async (staffId: string, name: string) => {
    if (!confirm(`정말로 '${name}' 직원을 퇴사 처리하시겠습니까?`)) return;
    setErrorMsg("");
    setActionSuccessMsg("");

    const res = await resignStaffAction(staffId);
    if (!res.success) {
      setErrorMsg(res.error || "퇴사 처리 실패");
      return;
    }
    setActionSuccessMsg("퇴사 처리가 완료되었습니다.");
    loadDashboardData();
  };

  // 추가 관리자 등록
  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setActionSuccessMsg("");

    if (!newAdminName.trim()) {
      setErrorMsg("관리자 이름을 입력해주세요.");
      return;
    }
    if (newAdminPin.length !== 6) {
      setErrorMsg("관리자 비밀번호는 숫자 6자리여야 합니다.");
      return;
    }

    setAdminSubmitting(true);
    const res = await addShopAdminAction(newAdminName, newAdminPin);
    setAdminSubmitting(false);

    if (!res.success) {
      setErrorMsg(res.error || "추가 관리자 등록 실패");
      return;
    }

    setActionSuccessMsg("새로운 관리자가 등록되었습니다.");
    setNewAdminName("");
    setNewAdminPin("");
    loadDashboardData();
  };

  // 관리자 본인 정보 수정
  const handleUpdateSelfInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    setSelfError("");

    const res = await updateShopAdminSelfAction(selfName, selfPin, selfConfirmPin);
    if (!res.success) {
      setSelfError(res.error || "정보 수정 실패");
      return;
    }

    setIsSelfModalOpen(false);
    setSelfPin("");
    setSelfConfirmPin("");
    setActionSuccessMsg("본인 정보가 성공적으로 수정되었습니다.");
    loadDashboardData();
  };

  // CSV 다운로드 처리
  const handleDownloadCsv = async () => {
    setErrorMsg("");
    const res = await exportMonthlyPayrollCsvAction("", selectedMonth);
    if (!res.success || !res.data || !res.filename) {
      setErrorMsg(res.error || "CSV 다운로드 실패");
      return;
    }

    const blob = new Blob([res.data], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", res.filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 특정 직원의 출퇴근 상세 조회 (인라인 수정용)
  const handleSelectStaffForAttendance = async (st: ApprovedStaffItem) => {
    setEditingStaff(st);
    try {
      const list = await getStaffAttendanceMonthAction(st.id, selectedMonth);
      setStaffAttendanceList(list);
    } catch {
      setStaffAttendanceList([]);
    }
  };

  // 인라인 출퇴근 기록 저장/수정
  const handleSaveStaffAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaff) return;
    setErrorMsg("");

    const res = await saveAttendanceAction(editingStaff.id, editWorkDate, editClockIn, editClockOut);
    if (!res.success) {
      setErrorMsg(res.error || "출퇴근 기록 저장 실패");
      return;
    }

    setActionSuccessMsg("출퇴근 기록이 수정되었습니다.");
    const list = await getStaffAttendanceMonthAction(editingStaff.id, selectedMonth);
    setStaffAttendanceList(list);
    loadDashboardData();
  };

  if (loading) {
    return (
      <div className="flex flex-col flex-1">
        <Banner />
        <div className="flex flex-1 items-center justify-center p-6 text-xs text-slate-500">
          대시보드 불러오는 중...
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1">
      <Banner
        rightElement={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsSelfModalOpen(true)}
              className="px-3 min-h-[38px] h-[38px] border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 transition"
            >
              <Settings className="w-3.5 h-3.5" />
              관리자 정보 수정
            </button>
            <button
              onClick={handleLogout}
              className="px-3 min-h-[38px] h-[38px] bg-slate-100 text-slate-800 text-xs font-semibold rounded-xl hover:bg-slate-200 transition flex items-center gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" />
              로그아웃
            </button>
          </div>
        }
      />

      <main className="max-w-[1120px] mx-auto w-full p-4 md:p-6 space-y-6">
        {/* 상단 타이틀 카드 */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-slate-900">{data?.shopName}</h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                플라워샵 관리자
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              접속 관리자: <span className="font-semibold text-slate-800">{data?.adminName}</span> · 직원 가입 승인, 급여 조건 설정, 월별 정산을 관리합니다.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <MonthPicker value={selectedMonth} onChange={setSelectedMonth} />
            <button
              onClick={handleDownloadCsv}
              className="min-h-[42px] h-[42px] px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center gap-1.5 shadow-sm transition"
            >
              <Download className="w-4 h-4" />
              CSV 다운로드
            </button>
          </div>
        </div>

        {/* 메인 탭 전환 */}
        <div className="flex border-b border-slate-200 gap-2">
          <button
            onClick={() => setActiveTab("staff")}
            className={`pb-3 px-4 text-sm font-bold border-b-2 transition flex items-center gap-2 ${
              activeTab === "staff"
                ? "border-emerald-600 text-emerald-700"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Users className="w-4 h-4" />
            직원 승인 및 관리
            {data?.pendingStaff.length ? (
              <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-xs font-bold">
                {data.pendingStaff.length}
              </span>
            ) : null}
          </button>
          <button
            onClick={() => setActiveTab("payroll")}
            className={`pb-3 px-4 text-sm font-bold border-b-2 transition flex items-center gap-2 ${
              activeTab === "payroll"
                ? "border-emerald-600 text-emerald-700"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Clock className="w-4 h-4" />
            근무 및 급여 정산
          </button>
          <button
            onClick={() => setActiveTab("admins")}
            className={`pb-3 px-4 text-sm font-bold border-b-2 transition flex items-center gap-2 ${
              activeTab === "admins"
                ? "border-emerald-600 text-emerald-700"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <UserPlus className="w-4 h-4" />
            추가 관리자 등록
          </button>
        </div>

        {/* 상단 상태 메시지 알림 */}
        {errorMsg && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-medium text-center">
            {errorMsg}
          </div>
        )}
        {actionSuccessMsg && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-medium text-center">
            {actionSuccessMsg}
          </div>
        )}

        {/* TAB 1: 직원 승인 및 관리 */}
        {activeTab === "staff" && (
          <div className="space-y-6">
            {/* 승인 대기 목록 */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-amber-600" />
                승인 대기 직원 목록 (pending)
              </h3>

              {data?.pendingStaff.length === 0 ? (
                <p className="text-xs text-slate-400 py-4 text-center">승인 대기 중인 신규 가입 신청자가 없습니다.</p>
              ) : (
                <div className="space-y-3">
                  {data?.pendingStaff.map((st) => (
                    <div
                      key={st.id}
                      className="p-4 bg-amber-50/60 border border-amber-200 rounded-xl space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-slate-900">{st.name}</span>
                          <StatusBadge status="pending" />
                        </div>
                        <span className="text-xs text-slate-500">신청일: {st.created_at}</span>
                      </div>

                      {/* 승인 정보 입력 폼 */}
                      <div className="grid grid-cols-1 md:grid-cols-5 gap-2 items-end pt-2 border-t border-amber-200/60">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-1">급여 형태</label>
                          <select
                            value={selectedStaffId === st.id ? payType : "hourly"}
                            onChange={(e) => {
                              setSelectedStaffId(st.id);
                              setPayType(e.target.value as "hourly" | "monthly");
                            }}
                            className="w-full h-9 px-2.5 border border-slate-200 rounded-lg text-xs bg-white"
                          >
                            <option value="hourly">시급</option>
                            <option value="monthly">월급</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-1">계산 단위</label>
                          <select
                            value={selectedStaffId === st.id ? timeUnit : "minute"}
                            onChange={(e) => {
                              setSelectedStaffId(st.id);
                              setTimeUnit(e.target.value as "minute" | "hour");
                            }}
                            className="w-full h-9 px-2.5 border border-slate-200 rounded-lg text-xs bg-white"
                          >
                            <option value="minute">분 단위 (정밀)</option>
                            <option value="hour">시간 단위 (버림)</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-1">급여액 (원)</label>
                          <input
                            type="number"
                            value={selectedStaffId === st.id ? amountKrw : "10000"}
                            onChange={(e) => {
                              setSelectedStaffId(st.id);
                              setAmountKrw(e.target.value);
                            }}
                            placeholder="예: 10000"
                            className="w-full h-9 px-2.5 border border-slate-200 rounded-lg text-xs bg-white"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-1">적용 시작일</label>
                          <input
                            type="date"
                            value={selectedStaffId === st.id ? effectiveFrom : format(new Date(), "yyyy-MM-01")}
                            onChange={(e) => {
                              setSelectedStaffId(st.id);
                              setEffectiveFrom(e.target.value);
                            }}
                            className="w-full h-9 px-2.5 border border-slate-200 rounded-lg text-xs bg-white"
                          />
                        </div>

                        <button
                          onClick={() => handleApproveStaff(st.id)}
                          className="h-9 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition shadow-sm"
                        >
                          승인 완료
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 재직 및 퇴사 직원 목록 */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-base font-bold text-slate-900">소속 직원 목록 (승인 / 퇴사)</h3>

              {data?.approvedStaff.length === 0 ? (
                <p className="text-xs text-slate-400 py-4 text-center">등록된 직원이 없습니다.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[640px]">
                    <thead>
                      <tr className="border-b border-slate-200 text-xs text-slate-500 bg-slate-50">
                        <th className="py-2.5 px-3">직원명</th>
                        <th className="py-2.5 px-3">상태</th>
                        <th className="py-2.5 px-3">급여 형태</th>
                        <th className="py-2.5 px-3">계산 단위</th>
                        <th className="py-2.5 px-3">적용 금액</th>
                        <th className="py-2.5 px-3">적용 시작일</th>
                        <th className="py-2.5 px-3 text-right">관리</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {data?.approvedStaff.map((st) => (
                        <tr key={st.id} className="hover:bg-slate-50/80">
                          <td className="py-3 px-3 font-bold text-slate-900">{st.name}</td>
                          <td className="py-3 px-3">
                            <StatusBadge status={st.status} />
                          </td>
                          <td className="py-3 px-3">
                            {st.pay_type === "hourly" ? "시급" : st.pay_type === "monthly" ? "월급" : "미설정"}
                          </td>
                          <td className="py-3 px-3">{st.time_unit === "hour" ? "시간" : "분"}</td>
                          <td className="py-3 px-3 font-semibold text-emerald-700">
                            {st.amount_krw ? `${st.amount_krw.toLocaleString()}원` : "미설정"}
                          </td>
                          <td className="py-3 px-3 text-slate-500">{st.effective_from || "-"}</td>
                          <td className="py-3 px-3 text-right space-x-2">
                            {st.status === "approved" && (
                              <>
                                <button
                                  onClick={() => {
                                    setSelectedStaffId(st.id);
                                    setPayType(st.pay_type || "hourly");
                                    setTimeUnit(st.time_unit || "minute");
                                    setAmountKrw(String(st.amount_krw || 10000));
                                    setEffectiveFrom(st.effective_from || format(new Date(), "yyyy-MM-01"));
                                  }}
                                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded text-xs font-semibold transition"
                                >
                                  조건 수정
                                </button>
                                <button
                                  onClick={() => handleResignStaff(st.id, st.name)}
                                  className="px-2.5 py-1 bg-rose-100 hover:bg-rose-200 text-rose-800 rounded text-xs font-semibold transition"
                                >
                                  퇴사 처리
                                </button>
                              </>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* 조건 수정 선택 시 인라인 수정 폼 */}
              {selectedStaffId && (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 mt-4">
                  <h4 className="text-xs font-bold text-slate-900">직원 급여 조건 변경/등록</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 items-end">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">급여 형태</label>
                      <select
                        value={payType}
                        onChange={(e) => setPayType(e.target.value as "hourly" | "monthly")}
                        className="w-full h-9 px-2.5 border border-slate-200 rounded-lg text-xs bg-white"
                      >
                        <option value="hourly">시급</option>
                        <option value="monthly">월급</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">계산 단위</label>
                      <select
                        value={timeUnit}
                        onChange={(e) => setTimeUnit(e.target.value as "minute" | "hour")}
                        className="w-full h-9 px-2.5 border border-slate-200 rounded-lg text-xs bg-white"
                      >
                        <option value="minute">분 단위 (정밀)</option>
                        <option value="hour">시간 단위 (버림)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">급여액 (원)</label>
                      <input
                        type="number"
                        value={amountKrw}
                        onChange={(e) => setAmountKrw(e.target.value)}
                        className="w-full h-9 px-2.5 border border-slate-200 rounded-lg text-xs bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">적용 시작일</label>
                      <input
                        type="date"
                        value={effectiveFrom}
                        onChange={(e) => setEffectiveFrom(e.target.value)}
                        className="w-full h-9 px-2.5 border border-slate-200 rounded-lg text-xs bg-white"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => handleUpdateComp(selectedStaffId)}
                      className="px-4 h-9 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700 transition"
                    >
                      조건 저장
                    </button>
                    <button
                      onClick={() => setSelectedStaffId("")}
                      className="px-4 h-9 bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-300 transition"
                    >
                      취소
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: 근무 및 급여 정산 */}
        {activeTab === "payroll" && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-base font-bold text-slate-900">
                  {selectedMonth} 월별 근무 및 정산 내역
                </h3>
                <button
                  onClick={handleDownloadCsv}
                  className="px-3 h-8 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center gap-1 transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  CSV 다운로드
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[640px]">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs text-slate-500 bg-slate-50">
                      <th className="py-2.5 px-3">직원명</th>
                      <th className="py-2.5 px-3">급여 형태</th>
                      <th className="py-2.5 px-3">적용 금액</th>
                      <th className="py-2.5 px-3">총 근무 시간(분)</th>
                      <th className="py-2.5 px-3">지급 예정액</th>
                      <th className="py-2.5 px-3 text-right">근무기록 관리</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {data?.approvedStaff.map((st) => (
                      <tr key={st.id} className="hover:bg-slate-50/80">
                        <td className="py-3 px-3 font-bold text-slate-900">{st.name}</td>
                        <td className="py-3 px-3">
                          {st.pay_type === "hourly" ? "시급" : st.pay_type === "monthly" ? "월급" : "미설정"}
                        </td>
                        <td className="py-3 px-3">{st.amount_krw ? `${st.amount_krw.toLocaleString()}원` : "0원"}</td>
                        <td className="py-3 px-3 font-medium text-slate-700">
                          {st.pay_type === "hourly"
                            ? `${Math.floor((st.totalMinutes || 0) / 60)}시간 ${(st.totalMinutes || 0) % 60}분 (${st.totalMinutes || 0}분)`
                            : "-"}
                        </td>
                        <td className="py-3 px-3 font-bold text-emerald-600">
                          {st.monthlyAmount ? `${st.monthlyAmount.toLocaleString()}원` : "0원"}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <button
                            onClick={() => handleSelectStaffForAttendance(st)}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded text-xs font-semibold transition"
                          >
                            출퇴근 보완/수정
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 선택한 직원의 일별 출퇴근 인라인 수정 카드 */}
            {editingStaff && (
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h4 className="text-sm font-bold text-slate-900">
                    '{editingStaff.name}' 직원의 {selectedMonth} 일별 근무 기록 보완 및 수정
                  </h4>
                  <button
                    onClick={() => setEditingStaff(null)}
                    className="text-xs text-slate-500 hover:text-slate-800 font-semibold"
                  >
                    닫기
                  </button>
                </div>

                <form onSubmit={handleSaveStaffAttendance} className="grid grid-cols-1 sm:grid-cols-4 gap-2 items-end">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">근무 날짜</label>
                    <input
                      type="date"
                      value={editWorkDate}
                      onChange={(e) => setEditWorkDate(e.target.value)}
                      className="w-full h-9 px-2.5 border border-slate-200 rounded-lg text-xs bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">출근 시각</label>
                    <input
                      type="time"
                      value={editClockIn}
                      onChange={(e) => setEditClockIn(e.target.value)}
                      className="w-full h-9 px-2.5 border border-slate-200 rounded-lg text-xs bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">퇴근 시각</label>
                    <input
                      type="time"
                      value={editClockOut}
                      onChange={(e) => setEditClockOut(e.target.value)}
                      className="w-full h-9 px-2.5 border border-slate-200 rounded-lg text-xs bg-white"
                    />
                  </div>

                  <button
                    type="submit"
                    className="h-9 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1"
                  >
                    <Save className="w-3.5 h-3.5" />
                    저장/수정
                  </button>
                </form>

                <div className="space-y-1.5 pt-2">
                  <h5 className="text-xs font-bold text-slate-800">등록된 출퇴근 내역</h5>
                  {staffAttendanceList.length === 0 ? (
                    <p className="text-xs text-slate-400 py-2">등록된 근무 기록이 없습니다.</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {staffAttendanceList.map((att) => (
                        <div
                          key={att.work_date}
                          className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between text-xs"
                        >
                          <span className="font-semibold text-slate-900">{att.work_date}</span>
                          <span className="text-slate-600">
                            {att.clock_in} ~ {att.clock_out}
                          </span>
                          <span className="font-bold text-emerald-600">
                            {Math.floor(att.total_minutes / 60)}시간 {att.total_minutes % 60}분
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: 추가 관리자 등록 */}
        {activeTab === "admins" && (
          <div className="space-y-6 max-w-md mx-auto">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-emerald-600" />
                추가 관리자 등록 (6자리 비밀번호)
              </h3>
              <p className="text-xs text-slate-500">
                소속 플라워샵에 동등한 권한을 가진 추가 관리자를 2명 이상 등록할 수 있습니다.
              </p>

              <form onSubmit={handleAddAdmin} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-800 mb-1">
                    신규 관리자 이름
                  </label>
                  <input
                    type="text"
                    value={newAdminName}
                    onChange={(e) => setNewAdminName(e.target.value)}
                    placeholder="이름 입력"
                    className="w-full min-h-[46px] h-[46px] px-3.5 border border-slate-200 rounded-xl text-sm bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>

                <PinInput
                  label="6자리 비밀번호"
                  value={newAdminPin}
                  onChange={setNewAdminPin}
                  length={6}
                />

                <Button type="submit" variant="primary" disabled={adminSubmitting}>
                  {adminSubmitting ? "등록 중..." : "추가 관리자 생성"}
                </Button>
              </form>
            </div>

            {/* 현재 등록된 관리자 목록 */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
              <h4 className="text-sm font-bold text-slate-900">등록된 관리자 목록</h4>
              <div className="divide-y divide-slate-100">
                {data?.otherAdmins.map((adm) => (
                  <div key={adm.id} className="py-2.5 flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800">{adm.name}</span>
                    <span className="text-slate-400">등록일: {adm.created_at}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* 관리자 본인 정보 수정 모달 */}
      {isSelfModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl border border-slate-200 space-y-4">
            <h3 className="text-base font-bold text-slate-900">관리자 본인 정보 수정</h3>

            <form onSubmit={handleUpdateSelfInfo} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1">이름</label>
                <input
                  type="text"
                  value={selfName}
                  onChange={(e) => setSelfName(e.target.value)}
                  className="w-full min-h-[46px] h-[46px] px-3.5 border border-slate-200 rounded-xl text-sm bg-white text-slate-900"
                />
              </div>

              <PinInput
                label="새 6자리 비밀번호"
                value={selfPin}
                onChange={setSelfPin}
                length={6}
              />

              <PinInput
                label="비밀번호 확인"
                value={selfConfirmPin}
                onChange={setSelfConfirmPin}
                length={6}
              />

              {selfError && <p className="text-xs text-rose-600 text-center font-medium">{selfError}</p>}

              <div className="flex gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setIsSelfModalOpen(false)}>
                  취소
                </Button>
                <Button type="submit" variant="primary">
                  수정 완료
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
