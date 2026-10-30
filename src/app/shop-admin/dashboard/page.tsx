"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Banner from "@/components/Banner";
import StatusBadge from "@/components/StatusBadge";
import MonthPicker from "@/components/MonthPicker";
import TimePicker from "@/components/TimePicker";
import PinInput from "@/components/PinInput";
import Button from "@/components/ui/Button";
import {
  getShopAdminDashboardDataAction,
  approveStaffAction,
  updateCompensationAction,
  resignStaffAction,
  addShopAdminAction,
  updateShopAdminSelfAction,
  PendingStaffItem,
  ApprovedStaffItem,
  ShopAdminInfo,
} from "@/actions/shopAdminActions";
import { getStaffAttendanceMonthAction, saveAttendanceAction, AttendanceItem } from "@/actions/attendanceActions";
import { exportMonthlyPayrollCsvAction } from "@/actions/exportActions";
import { logoutAction } from "@/actions/logoutAction";
import { Users, UserCheck, ShieldPlus, FileSpreadsheet, LogOut, KeyRound, Clock, Edit3, Download, Plus } from "lucide-react";

export default function ShopAdminDashboardPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"staff" | "admins" | "payroll">("staff");
  
  const [monthStr, setMonthStr] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });

  const [loading, setLoading] = useState<boolean>(true);
  const [shopName, setShopName] = useState<string>("");
  const [adminName, setAdminName] = useState<string>("");
  const [pendingStaff, setPendingStaff] = useState<PendingStaffItem[]>([]);
  const [approvedStaff, setApprovedStaff] = useState<ApprovedStaffItem[]>([]);
  const [otherAdmins, setOtherAdmins] = useState<ShopAdminInfo[]>([]);

  // 직원 승인 모달 상태
  const [selectedPendingStaff, setSelectedPendingStaff] = useState<PendingStaffItem | null>(null);
  const [approvePayType, setApprovePayType] = useState<"hourly" | "monthly">("hourly");
  const [approveTimeUnit, setApproveTimeUnit] = useState<"minute" | "hour">("minute");
  const [approveAmount, setApproveAmount] = useState<string>("10000");
  const [approveEffectiveFrom, setApproveEffectiveFrom] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
  });
  const [approveError, setApproveError] = useState<string>("");

  // 급여 조건 수정 모달 상태
  const [selectedApprovedStaff, setSelectedApprovedStaff] = useState<ApprovedStaffItem | null>(null);
  const [editPayType, setEditPayType] = useState<"hourly" | "monthly">("hourly");
  const [editTimeUnit, setEditTimeUnit] = useState<"minute" | "hour">("minute");
  const [editAmount, setEditAmount] = useState<string>("10000");
  const [editEffectiveFrom, setEditEffectiveFrom] = useState<string>("");
  const [editCompError, setEditCompError] = useState<string>("");

  // 추가 관리자 등록 폼
  const [newAdminName, setNewAdminName] = useState<string>("");
  const [newAdminPin, setNewAdminPin] = useState<string>("");
  const [addAdminError, setAddAdminError] = useState<string>("");
  const [addAdminSuccess, setAddAdminSuccess] = useState<string>("");

  // 본인 정보 비밀번호 변경 모달
  const [showSelfEditModal, setShowSelfEditModal] = useState<boolean>(false);
  const [selfName, setSelfName] = useState<string>("");
  const [selfPin, setSelfPin] = useState<string>("");
  const [selfConfirmPin, setSelfConfirmPin] = useState<string>("");
  const [selfEditError, setSelfEditError] = useState<string>("");

  // 특정 직원 선택 근태 수정 모달
  const [selectedPayrollStaff, setSelectedPayrollStaff] = useState<ApprovedStaffItem | null>(null);
  const [staffAttendances, setStaffAttendances] = useState<AttendanceItem[]>([]);
  const [editingAttDate, setEditingAttDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [editingClockIn, setEditingClockIn] = useState<string>("09:00");
  const [editingClockOut, setEditingClockOut] = useState<string>("18:00");
  const [attError, setAttError] = useState<string>("");

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await getShopAdminDashboardDataAction(monthStr);
      if (!res.success || !res.data) {
        router.replace("/login");
        return;
      }
      setShopName(res.data.shopName);
      setAdminName(res.data.adminName);
      setPendingStaff(res.data.pendingStaff);
      setApprovedStaff(res.data.approvedStaff);
      setOtherAdmins(res.data.otherAdmins);
    } catch {
      router.replace("/login");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [monthStr]);

  const handleLogout = async () => {
    await logoutAction();
    router.push("/");
  };

  // 1. 직원 가입 승인 처리
  const handleApproveStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPendingStaff) return;
    setApproveError("");

    const amount = parseInt(approveAmount, 10);
    if (isNaN(amount) || amount <= 0) {
      setApproveError("유효한 급여액을 입력해주세요.");
      return;
    }

    try {
      const res = await approveStaffAction(
        selectedPendingStaff.id,
        approvePayType,
        approveTimeUnit,
        amount,
        approveEffectiveFrom
      );
      if (!res.success) {
        setApproveError(res.error || "승인 처리에 실패했습니다.");
        return;
      }
      setSelectedPendingStaff(null);
      await loadData();
    } catch {
      setApproveError("처리 중 오류가 발생했습니다.");
    }
  };

  // 2. 급여 조건 수정
  const handleUpdateCompensation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedApprovedStaff) return;
    setEditCompError("");

    const amount = parseInt(editAmount, 10);
    if (isNaN(amount) || amount <= 0) {
      setEditCompError("유효한 급여액을 입력해주세요.");
      return;
    }

    try {
      const res = await updateCompensationAction(
        selectedApprovedStaff.id,
        editPayType,
        editTimeUnit,
        amount,
        editEffectiveFrom
      );
      if (!res.success) {
        setEditCompError(res.error || "수정에 실패했습니다.");
        return;
      }
      setSelectedApprovedStaff(null);
      await loadData();
    } catch {
      setEditCompError("처리 중 오류가 발생했습니다.");
    }
  };

  // 3. 퇴사 처리
  const handleResignStaff = async (staff: ApprovedStaffItem) => {
    if (!confirm(`"${staff.name}" 직원을 퇴사 처리하시겠습니까? 퇴사 처리 시 로그인이 즉시 차단됩니다.`)) {
      return;
    }
    try {
      const res = await resignStaffAction(staff.id);
      if (res.success) {
        await loadData();
      } else {
        alert(res.error || "퇴사 처리에 실패했습니다.");
      }
    } catch {
      alert("처리 중 오류가 발생했습니다.");
    }
  };

  // 4. 추가 관리자 등록
  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddAdminError("");
    setAddAdminSuccess("");

    if (!newAdminName.trim()) {
      setAddAdminError("관리자 이름을 입력해주세요.");
      return;
    }
    if (newAdminPin.length !== 6) {
      setAddAdminError("관리자 비밀번호는 숫자 6자리여야 합니다.");
      return;
    }

    try {
      const res = await addShopAdminAction(newAdminName, newAdminPin);
      if (!res.success) {
        setAddAdminError(res.error || "등록에 실패했습니다.");
        return;
      }
      setAddAdminSuccess("추가 관리자가 성공적으로 등록되었습니다.");
      setNewAdminName("");
      setNewAdminPin("");
      await loadData();
    } catch {
      setAddAdminError("처리 중 오류가 발생했습니다.");
    }
  };

  // 5. 본인 정보 수정
  const handleSelfEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSelfEditError("");

    if (!selfName.trim()) {
      setSelfEditError("이름을 입력해주세요.");
      return;
    }
    if (selfPin.length !== 6) {
      setSelfEditError("비밀번호는 숫자 6자리여야 합니다.");
      return;
    }
    if (selfPin !== selfConfirmPin) {
      setSelfEditError("비밀번호 확인이 일치하지 않습니다.");
      return;
    }

    try {
      const res = await updateShopAdminSelfAction(selfName, selfPin, selfConfirmPin);
      if (!res.success) {
        setSelfEditError(res.error || "수정에 실패했습니다.");
        return;
      }
      setShowSelfEditModal(false);
      await loadData();
    } catch {
      setSelfEditError("처리 중 오류가 발생했습니다.");
    }
  };

  // 6. 근태 수정 모달 열기
  const handleOpenAttendanceModal = async (staff: ApprovedStaffItem) => {
    setSelectedPayrollStaff(staff);
    const atts = await getStaffAttendanceMonthAction(staff.id, monthStr);
    setStaffAttendances(atts);
  };

  // 근태 저장
  const handleSaveAttendance = async () => {
    if (!selectedPayrollStaff) return;
    setAttError("");

    const res = await saveAttendanceAction(
      selectedPayrollStaff.id,
      editingAttDate,
      editingClockIn,
      editingClockOut
    );

    if (!res.success) {
      setAttError(res.error || "출퇴근 기록 저장 실패");
      return;
    }

    const updated = await getStaffAttendanceMonthAction(selectedPayrollStaff.id, monthStr);
    setStaffAttendances(updated);
    await loadData();
  };

  // 7. CSV 다운로드
  const handleDownloadCsv = async () => {
    try {
      const res = await exportMonthlyPayrollCsvAction("", monthStr);
      if (!res.success || !res.data) {
        alert(res.error || "CSV 생성 실패");
        return;
      }

      const blob = new Blob([res.data], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", res.filename || `flower_payroll_${monthStr}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch {
      alert("CSV 다운로드 처리 중 오류가 발생했습니다.");
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col flex-1">
        <Banner />
        <div className="flex flex-1 items-center justify-center p-6 text-xs text-slate-500">
          플라워샵 관리 대시보드 데이터를 불러오는 중...
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      {/* 상단 헤더: 소속 플라워샵명, 관리자명, '비밀번호 변경' 버튼, '로그아웃' 버튼 */}
      <Banner
        rightElement={
          <div className="flex items-center gap-2 md:gap-3">
            <span className="text-xs font-semibold text-slate-700 hidden sm:inline">
              [{shopName}] <strong className="text-emerald-700">{adminName} 관리자님</strong>
            </span>
            <button
              onClick={() => {
                setSelfName(adminName);
                setSelfPin("");
                setSelfConfirmPin("");
                setSelfEditError("");
                setShowSelfEditModal(true);
              }}
              className="px-3 min-h-[38px] h-[38px] border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
            >
              <KeyRound className="w-3.5 h-3.5 text-slate-500" />
              비밀번호 변경
            </button>
            <button
              onClick={handleLogout}
              className="px-3 min-h-[38px] h-[38px] bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
            >
              <LogOut className="w-3.5 h-3.5" />
              로그아웃
            </button>
          </div>
        }
      />

      <main className="max-w-[1120px] mx-auto w-full p-4 md:p-6 space-y-6">
        {/* 탭 구분 */}
        <div className="flex border-b border-slate-200 gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab("staff")}
            className={`pb-3 px-4 text-sm font-bold border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === "staff"
                ? "border-emerald-600 text-emerald-700"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Users className="w-4 h-4" />
            직원 관리 ({pendingStaff.length > 0 && <span className="text-amber-600 font-extrabold">{pendingStaff.length}대기</span>})
          </button>
          <button
            onClick={() => setActiveTab("admins")}
            className={`pb-3 px-4 text-sm font-bold border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === "admins"
                ? "border-emerald-600 text-emerald-700"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <ShieldPlus className="w-4 h-4" />
            추가 관리자 등록
          </button>
          <button
            onClick={() => setActiveTab("payroll")}
            className={`pb-3 px-4 text-sm font-bold border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === "payroll"
                ? "border-emerald-600 text-emerald-700"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            근무 및 급여 정산
          </button>
        </div>

        {activeTab === "staff" && (
          <div className="space-y-6">
            {/* 승인 대기자 목록 */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-amber-600" />
                  <h3 className="text-base font-bold text-slate-900">가입 승인 대기자 목록</h3>
                </div>
                <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full">
                  {pendingStaff.length}명 대기 중
                </span>
              </div>

              {pendingStaff.length === 0 ? (
                <p className="text-xs text-slate-500 py-4 text-center">승인 대기 중인 직원이 없습니다.</p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {pendingStaff.map((st) => (
                    <div key={st.id} className="py-3 flex items-center justify-between text-xs">
                      <div className="space-y-0.5">
                        <span className="font-bold text-slate-900 text-sm block">{st.name}</span>
                        <span className="text-slate-400">신청일: {st.created_at}</span>
                      </div>
                      <button
                        onClick={() => {
                          setSelectedPendingStaff(st);
                          setApprovePayType("hourly");
                          setApproveTimeUnit("minute");
                          setApproveAmount("10000");
                          setApproveError("");
                        }}
                        className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold text-xs transition"
                      >
                        급여 조건 설정 및 승인
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 재직 직원 목록 */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-900">재직/퇴사 직원 급여 설정 관리</h3>
                <span className="text-xs text-slate-500">총 {approvedStaff.length}명</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold">
                      <th className="p-3.5 pl-6">직원명</th>
                      <th className="p-3.5">상태</th>
                      <th className="p-3.5">급여 형태</th>
                      <th className="p-3.5">계산 단위</th>
                      <th className="p-3.5">금액(원)</th>
                      <th className="p-3.5">적용 시작일</th>
                      <th className="p-3.5 pr-6 text-right">관리</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {approvedStaff.map((st) => (
                      <tr key={st.id} className="hover:bg-slate-50 transition">
                        <td className="p-3.5 pl-6 font-bold text-slate-900">{st.name}</td>
                        <td className="p-3.5"><StatusBadge status={st.status} /></td>
                        <td className="p-3.5 font-semibold text-slate-800">
                          {st.pay_type === "hourly" ? "시급" : st.pay_type === "monthly" ? "월급" : "미설정"}
                        </td>
                        <td className="p-3.5 text-slate-600">
                          {st.time_unit === "hour" ? "시간 단위" : "분 단위"}
                        </td>
                        <td className="p-3.5 font-bold text-emerald-700">
                          {st.amount_krw ? `${st.amount_krw.toLocaleString()}원` : "-"}
                        </td>
                        <td className="p-3.5 text-slate-500">{st.effective_from || "-"}</td>
                        <td className="p-3.5 pr-6 text-right space-x-2">
                          <button
                            onClick={() => {
                              setSelectedApprovedStaff(st);
                              setEditPayType(st.pay_type || "hourly");
                              setEditTimeUnit(st.time_unit || "minute");
                              setEditAmount(st.amount_krw ? String(st.amount_krw) : "10000");
                              setEditEffectiveFrom(st.effective_from || `${monthStr}-01`);
                              setEditCompError("");
                            }}
                            className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg font-semibold text-xs transition"
                          >
                            조건 변경
                          </button>
                          {st.status === "approved" && (
                            <button
                              onClick={() => handleResignStaff(st)}
                              className="px-2.5 py-1.5 bg-rose-100 hover:bg-rose-200 text-rose-800 rounded-lg font-semibold text-xs transition"
                            >
                              퇴사 처리
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === "admins" && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 max-w-lg">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <ShieldPlus className="w-5 h-5 text-slate-800" />
                <h3 className="text-base font-bold text-slate-900">소속 플라워샵 추가 관리자 등록</h3>
              </div>

              <form onSubmit={handleAddAdmin} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-800 mb-1">
                    추가 관리자 이름
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

                {addAdminError && (
                  <p className="text-xs text-rose-600 font-medium bg-rose-50 p-2.5 rounded-lg border border-rose-200">
                    {addAdminError}
                  </p>
                )}
                {addAdminSuccess && (
                  <p className="text-xs text-emerald-700 font-medium bg-emerald-50 p-2.5 rounded-lg border border-emerald-200">
                    {addAdminSuccess}
                  </p>
                )}

                <Button type="submit" variant="primary">
                  추가 관리자 등록
                </Button>
              </form>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 max-w-2xl space-y-3">
              <h4 className="text-sm font-bold text-slate-900">소속 등록 관리자 목록</h4>
              <div className="divide-y divide-slate-100">
                {otherAdmins.map((adm) => (
                  <div key={adm.id} className="py-2.5 flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800">{adm.name}</span>
                    <span className="text-slate-400">등록일: {adm.created_at}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === "payroll" && (
          <div className="space-y-6">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-slate-800">정산 연월 선택:</span>
                <MonthPicker value={monthStr} onChange={setMonthStr} />
              </div>
              <button
                onClick={handleDownloadCsv}
                className="px-4 min-h-[42px] h-[42px] bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition shadow-sm w-full sm:w-auto justify-center"
              >
                <Download className="w-4 h-4" />
                월별 정산 내역 CSV 다운로드
              </button>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-5 border-b border-slate-100">
                <h3 className="text-base font-bold text-slate-900">{monthStr} 직원별 총 근무시간 및 지급액</h3>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold">
                      <th className="p-3.5 pl-6">직원명</th>
                      <th className="p-3.5">상태</th>
                      <th className="p-3.5">급여 형태</th>
                      <th className="p-3.5">적용 단가/월급</th>
                      <th className="p-3.5">해당월 총 근무분</th>
                      <th className="p-3.5">지급 예정액</th>
                      <th className="p-3.5 pr-6 text-right">출퇴근 내역 보완</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {approvedStaff.map((st) => (
                      <tr key={st.id} className="hover:bg-slate-50 transition">
                        <td className="p-3.5 pl-6 font-bold text-slate-900">{st.name}</td>
                        <td className="p-3.5"><StatusBadge status={st.status} /></td>
                        <td className="p-3.5 font-semibold text-slate-800">
                          {st.pay_type === "hourly"
                            ? `시급 (${st.time_unit === "hour" ? "시간단위" : "분단위"})`
                            : "월급"}
                        </td>
                        <td className="p-3.5 text-slate-700">
                          {st.amount_krw ? `${st.amount_krw.toLocaleString()}원` : "0원"}
                        </td>
                        <td className="p-3.5 font-bold text-slate-800">
                          {st.totalMinutes || 0}분 (
                          {Math.floor((st.totalMinutes || 0) / 60)}시간{" "}
                          {(st.totalMinutes || 0) % 60}분)
                        </td>
                        <td className="p-3.5 font-extrabold text-emerald-700 text-sm">
                          {(st.monthlyAmount || 0).toLocaleString()}원
                        </td>
                        <td className="p-3.5 pr-6 text-right">
                          <button
                            onClick={() => handleOpenAttendanceModal(st)}
                            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold transition"
                          >
                            근무기록 관리
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* 승인 모달 */}
      {selectedPendingStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-xl border border-slate-200 space-y-4">
            <h3 className="text-base font-bold text-slate-900 border-b pb-2">
              직원 가입 승인: {selectedPendingStaff.name}
            </h3>

            <form onSubmit={handleApproveStaff} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-800 mb-1">급여 형태</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setApprovePayType("hourly")}
                    className={`py-2 rounded-xl font-bold border transition ${
                      approvePayType === "hourly"
                        ? "bg-emerald-600 text-white border-emerald-600"
                        : "bg-white text-slate-700 border-slate-200"
                    }`}
                  >
                    시급
                  </button>
                  <button
                    type="button"
                    onClick={() => setApprovePayType("monthly")}
                    className={`py-2 rounded-xl font-bold border transition ${
                      approvePayType === "monthly"
                        ? "bg-emerald-600 text-white border-emerald-600"
                        : "bg-white text-slate-700 border-slate-200"
                    }`}
                  >
                    월급
                  </button>
                </div>
              </div>

              {approvePayType === "hourly" && (
                <div>
                  <label className="block font-semibold text-slate-800 mb-1">계산 단위</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setApproveTimeUnit("minute")}
                      className={`py-2 rounded-xl font-bold border transition ${
                        approveTimeUnit === "minute"
                          ? "bg-slate-800 text-white border-slate-800"
                          : "bg-white text-slate-700 border-slate-200"
                      }`}
                    >
                      분 단위 정산 (반올림)
                    </button>
                    <button
                      type="button"
                      onClick={() => setApproveTimeUnit("hour")}
                      className={`py-2 rounded-xl font-bold border transition ${
                        approveTimeUnit === "hour"
                          ? "bg-slate-800 text-white border-slate-800"
                          : "bg-white text-slate-700 border-slate-200"
                      }`}
                    >
                      시간 단위 정산 (절사)
                    </button>
                  </div>
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-800 mb-1">
                  {approvePayType === "hourly" ? "시급 금액 (원)" : "월급 금액 (원)"}
                </label>
                <input
                  type="number"
                  value={approveAmount}
                  onChange={(e) => setApproveAmount(e.target.value)}
                  placeholder="예: 10000"
                  className="w-full min-h-[42px] px-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-800 mb-1">적용 시작일</label>
                <input
                  type="date"
                  value={approveEffectiveFrom}
                  onChange={(e) => setApproveEffectiveFrom(e.target.value)}
                  className="w-full min-h-[42px] px-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              {approveError && (
                <p className="text-xs text-rose-600 font-medium bg-rose-50 p-2 rounded-lg border border-rose-200">
                  {approveError}
                </p>
              )}

              <div className="flex gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setSelectedPendingStaff(null)}>
                  취소
                </Button>
                <Button type="submit" variant="primary">
                  승인 완료
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 조건 변경 모달 */}
      {selectedApprovedStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-xl border border-slate-200 space-y-4">
            <h3 className="text-base font-bold text-slate-900 border-b pb-2">
              급여 조건 변경: {selectedApprovedStaff.name}
            </h3>

            <form onSubmit={handleUpdateCompensation} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-800 mb-1">급여 형태</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditPayType("hourly")}
                    className={`py-2 rounded-xl font-bold border transition ${
                      editPayType === "hourly"
                        ? "bg-emerald-600 text-white border-emerald-600"
                        : "bg-white text-slate-700 border-slate-200"
                    }`}
                  >
                    시급
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditPayType("monthly")}
                    className={`py-2 rounded-xl font-bold border transition ${
                      editPayType === "monthly"
                        ? "bg-emerald-600 text-white border-emerald-600"
                        : "bg-white text-slate-700 border-slate-200"
                    }`}
                  >
                    월급
                  </button>
                </div>
              </div>

              {editPayType === "hourly" && (
                <div>
                  <label className="block font-semibold text-slate-800 mb-1">계산 단위</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setEditTimeUnit("minute")}
                      className={`py-2 rounded-xl font-bold border transition ${
                        editTimeUnit === "minute"
                          ? "bg-slate-800 text-white border-slate-800"
                          : "bg-white text-slate-700 border-slate-200"
                      }`}
                    >
                      분 단위 정산 (반올림)
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditTimeUnit("hour")}
                      className={`py-2 rounded-xl font-bold border transition ${
                        editTimeUnit === "hour"
                          ? "bg-slate-800 text-white border-slate-800"
                          : "bg-white text-slate-700 border-slate-200"
                      }`}
                    >
                      시간 단위 정산 (절사)
                    </button>
                  </div>
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-800 mb-1">금액 (원)</label>
                <input
                  type="number"
                  value={editAmount}
                  onChange={(e) => setEditAmount(e.target.value)}
                  className="w-full min-h-[42px] px-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-800 mb-1">적용 시작일</label>
                <input
                  type="date"
                  value={editEffectiveFrom}
                  onChange={(e) => setEditEffectiveFrom(e.target.value)}
                  className="w-full min-h-[42px] px-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              {editCompError && (
                <p className="text-xs text-rose-600 font-medium bg-rose-50 p-2 rounded-lg border border-rose-200">
                  {editCompError}
                </p>
              )}

              <div className="flex gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setSelectedApprovedStaff(null)}>
                  취소
                </Button>
                <Button type="submit" variant="primary">
                  변경사항 저장
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 본인 정보 수정 모달 */}
      {showSelfEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm bg-white rounded-2xl p-6 shadow-xl border border-slate-200 space-y-4">
            <h3 className="text-base font-bold text-slate-900 border-b pb-2">본인 정보 및 비밀번호 변경</h3>

            <form onSubmit={handleSelfEdit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-800 mb-1">관리자 이름</label>
                <input
                  type="text"
                  value={selfName}
                  onChange={(e) => setSelfName(e.target.value)}
                  className="w-full min-h-[42px] px-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              <PinInput
                label="새 6자리 비밀번호"
                value={selfPin}
                onChange={setSelfPin}
                length={6}
              />

              <PinInput
                label="새 비밀번호 확인"
                value={selfConfirmPin}
                onChange={setSelfConfirmPin}
                length={6}
              />

              {selfEditError && (
                <p className="text-xs text-rose-600 font-medium bg-rose-50 p-2 rounded-lg border border-rose-200">
                  {selfEditError}
                </p>
              )}

              <div className="flex gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setShowSelfEditModal(false)}>
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

      {/* 근태 기록 관리 모달 */}
      {selectedPayrollStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg bg-white rounded-2xl p-6 shadow-xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="text-base font-bold text-slate-900">
                [{selectedPayrollStaff.name}] 직원의 근무 기록 관리 ({monthStr})
              </h3>
              <button
                onClick={() => setSelectedPayrollStaff(null)}
                className="text-slate-400 hover:text-slate-700 font-bold text-sm"
              >
                ✕
              </button>
            </div>

            {/* 근태 직접 추가/수정 폼 */}
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-3 text-xs">
              <span className="font-bold text-slate-800 block">일별 출퇴근 기록 등록/수정</span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div>
                  <label className="block text-slate-600 mb-1">날짜</label>
                  <input
                    type="date"
                    value={editingAttDate}
                    onChange={(e) => setEditingAttDate(e.target.value)}
                    className="w-full h-[38px] px-2 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 mb-1">출근 시간</label>
                  <TimePicker value={editingClockIn} onChange={setEditingClockIn} />
                </div>
                <div>
                  <label className="block text-slate-600 mb-1">퇴근 시간</label>
                  <TimePicker value={editingClockOut} onChange={setEditingClockOut} />
                </div>
              </div>
              {attError && <p className="text-rose-600">{attError}</p>}
              <Button type="button" variant="primary" onClick={handleSaveAttendance} className="min-h-[38px] h-[38px]">
                기록 저장
              </Button>
            </div>

            {/* 해당 월 출퇴근 내역 테이블 */}
            <div className="space-y-2">
              <span className="font-bold text-xs text-slate-800 block">
                {monthStr} 등록된 출퇴근 내역 ({staffAttendances.length}건)
              </span>
              {staffAttendances.length === 0 ? (
                <p className="text-xs text-slate-500 py-3 text-center">등록된 출퇴근 기록이 없습니다.</p>
              ) : (
                <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 text-xs">
                  {staffAttendances.map((att) => (
                    <div key={att.id || att.work_date} className="p-2.5 flex items-center justify-between hover:bg-slate-50">
                      <span className="font-semibold text-slate-900">{att.work_date}</span>
                      <span className="text-slate-700">
                        {att.clock_in} ~ {att.clock_out} ({att.total_minutes}분)
                      </span>
                      <button
                        onClick={() => {
                          setEditingAttDate(att.work_date);
                          setEditingClockIn(att.clock_in);
                          setEditingClockOut(att.clock_out);
                        }}
                        className="text-emerald-700 hover:underline font-semibold"
                      >
                        수정
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
