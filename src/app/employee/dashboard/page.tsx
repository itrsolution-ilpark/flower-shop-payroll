"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Banner from "@/components/Banner";
import MonthPicker from "@/components/MonthPicker";
import TimePicker from "@/components/TimePicker";
import PinInput from "@/components/PinInput";
import Button from "@/components/ui/Button";
import { getStaffCompensationsAction, changeStaffPinAction, CompensationData } from "@/actions/staffActions";
import { getStaffAttendanceMonthAction, saveAttendanceAction, AttendanceItem } from "@/actions/attendanceActions";
import { logoutAction, getCurrentSessionAction } from "@/actions/authActions";
import { calculateStaffMonthlyEarnings } from "@/lib/payroll";
import { Clock, Calendar, KeyRound, LogOut, Award, DollarSign, FileText } from "lucide-react";

export default function EmployeeDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState<boolean>(true);
  const [staffId, setStaffId] = useState<string>("");
  const [staffName, setStaffName] = useState<string>("");

  const [monthStr, setMonthStr] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });

  const [compensations, setCompensations] = useState<CompensationData[]>([]);
  const [attendances, setAttendances] = useState<AttendanceItem[]>([]);

  // 출퇴근 등록
  const [workDate, setWorkDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [clockIn, setClockIn] = useState<string>("09:00");
  const [clockOut, setClockOut] = useState<string>("18:00");
  const [recordError, setRecordError] = useState<string>("");
  const [recordSuccess, setRecordSuccess] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);

  // 비밀번호 변경 모달 (4자리)
  const [showPinModal, setShowPinModal] = useState<boolean>(false);
  const [newPin, setNewPin] = useState<string>("");
  const [confirmPin, setConfirmPin] = useState<string>("");
  const [pinError, setPinError] = useState<string>("");
  const [pinSuccess, setPinSuccess] = useState<string>("");

  const loadData = async () => {
    setLoading(true);
    try {
      const session = await getCurrentSessionAction();
      if (!session || session.role !== "staff") {
        router.replace("/login");
        return;
      }
      setStaffId(session.userId);
      setStaffName(session.name);

      const [comps, atts] = await Promise.all([
        getStaffCompensationsAction(session.userId),
        getStaffAttendanceMonthAction(session.userId, monthStr),
      ]);

      setCompensations(comps);
      setAttendances(atts);
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

  // 출퇴근 기록 저장
  const handleSaveAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    setRecordError("");
    setRecordSuccess("");

    if (!workDate || !clockIn || !clockOut) {
      setRecordError("날짜와 출퇴근 시각을 모두 선택해주세요.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await saveAttendanceAction(staffId, workDate, clockIn, clockOut);
      if (!res.success) {
        setRecordError(res.error || "출퇴근 기록 저장 중 오류가 발생했습니다.");
        setSubmitting(false);
        return;
      }

      setRecordSuccess("출퇴근 기록이 성공적으로 저장되었습니다.");
      const updatedAtts = await getStaffAttendanceMonthAction(staffId, monthStr);
      setAttendances(updatedAtts);
    } catch {
      setRecordError("처리 중 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  // 비밀번호 변경
  const handleChangePin = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinError("");
    setPinSuccess("");

    if (newPin.length !== 4) {
      setPinError("직원 비밀번호는 숫자 4자리여야 합니다.");
      return;
    }
    if (newPin !== confirmPin) {
      setPinError("비밀번호 확인이 일치하지 않습니다.");
      return;
    }

    try {
      const res = await changeStaffPinAction(staffId, newPin, confirmPin);
      if (!res.success) {
        setPinError(res.error || "비밀번호 변경에 실패했습니다.");
        return;
      }
      setPinSuccess("비밀번호가 안전하게 변경되었습니다.");
      setNewPin("");
      setConfirmPin("");
      setTimeout(() => setShowPinModal(false), 1200);
    } catch {
      setPinError("처리 중 오류가 발생했습니다.");
    }
  };

  const latestComp = compensations.length > 0 ? compensations[compensations.length - 1] : null;
  const earningsResult = calculateStaffMonthlyEarnings(compensations, attendances, monthStr);

  if (loading) {
    return (
      <div className="flex flex-col flex-1">
        <Banner />
        <div className="flex flex-1 items-center justify-center p-6 text-xs text-slate-500">
          직원 대시보드를 불러오는 중...
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      {/* 상단 헤더: 직원명, '비밀번호 변경' 버튼, '로그아웃' 버튼 */}
      <Banner
        rightElement={
          <div className="flex items-center gap-2 md:gap-3">
            <span className="text-xs font-semibold text-slate-700 hidden sm:inline">
              직원: <strong className="text-emerald-700">{staffName}님</strong>
            </span>
            <button
              onClick={() => {
                setNewPin("");
                setConfirmPin("");
                setPinError("");
                setPinSuccess("");
                setShowPinModal(true);
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
        {/* 내 급여 조건 카드 */}
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-3">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <DollarSign className="w-5 h-5 text-emerald-600" />
            <h3 className="text-base font-bold text-slate-900">내 급여 조건 정보</h3>
          </div>

          {!latestComp ? (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 font-medium">
              아직 관리자가 급여 조건을 설정하지 않았습니다. 승인 후 담당 관리자에게 문의하세요.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-500 block mb-1">급여 형태</span>
                <span className="font-extrabold text-slate-900 text-sm">
                  {latestComp.pay_type === "hourly" ? "시급" : "월급"}
                </span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-500 block mb-1">
                  {latestComp.pay_type === "hourly" ? "시급 단가" : "월급액"}
                </span>
                <span className="font-extrabold text-emerald-700 text-sm">
                  {latestComp.amount_krw.toLocaleString()}원
                </span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-500 block mb-1">계산 기준 단위</span>
                <span className="font-bold text-slate-800 text-sm">
                  {latestComp.pay_type === "hourly"
                    ? latestComp.time_unit === "hour"
                      ? "시간 단위 절사"
                      : "분 단위 정밀 정산"
                    : "월 고정/일할"}
                </span>
              </div>
            </div>
          )}
        </section>

        {/* 일별 출퇴근 등록 카드 */}
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Clock className="w-5 h-5 text-emerald-600" />
            <h3 className="text-base font-bold text-slate-900">일별 출퇴근 등록</h3>
          </div>

          {latestComp?.pay_type === "monthly" ? (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-medium">
              월급제로 설정된 계정입니다. 일별 출퇴근 등록 없이 고정 월급여액이 정산됩니다.
            </div>
          ) : (
            <form onSubmit={handleSaveAttendance} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-800 mb-1">
                    날짜 선택
                  </label>
                  <input
                    type="date"
                    value={workDate}
                    onChange={(e) => setWorkDate(e.target.value)}
                    className="w-full min-h-[42px] h-[42px] px-3 border border-slate-200 rounded-xl text-xs font-semibold bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>

                <div>
                  <TimePicker label="출근 시간" value={clockIn} onChange={setClockIn} />
                </div>

                <div>
                  <TimePicker label="퇴근 시간" value={clockOut} onChange={setClockOut} />
                </div>
              </div>

              {recordError && (
                <p className="text-xs text-rose-600 font-medium bg-rose-50 p-2.5 rounded-lg border border-rose-200">
                  {recordError}
                </p>
              )}
              {recordSuccess && (
                <p className="text-xs text-emerald-700 font-medium bg-emerald-50 p-2.5 rounded-lg border border-emerald-200">
                  {recordSuccess}
                </p>
              )}

              <Button type="submit" variant="primary" disabled={submitting}>
                {submitting ? "저장 중..." : "출퇴근 기록 저장"}
              </Button>
            </form>
          )}
        </section>

        {/* 월별 근무 및 급여 조회 카드 */}
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-emerald-600" />
              <h3 className="text-base font-bold text-slate-900">월별 근무 기록 및 예상 급여</h3>
            </div>
            <MonthPicker value={monthStr} onChange={setMonthStr} />
          </div>

          {/* 예상 급여 결과 요약 */}
          <div className="bg-slate-900 text-white rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm">
            <div className="space-y-0.5">
              <span className="text-xs text-slate-400">{monthStr} 월 총 산정 근무시간</span>
              <span className="font-bold text-base block">
                {earningsResult.totalMinutes}분 (
                {Math.floor(earningsResult.totalMinutes / 60)}시간 {earningsResult.totalMinutes % 60}분)
              </span>
            </div>
            <div className="text-right space-y-0.5">
              <span className="text-xs text-emerald-400 font-semibold">예상 월 급여 총액</span>
              <span className="font-extrabold text-xl text-emerald-300 block">
                {earningsResult.amount.toLocaleString()}원
              </span>
            </div>
          </div>

          {/* 일별 출퇴근 내역 테이블 */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold">
                  <th className="p-3 pl-4">근무 일자</th>
                  <th className="p-3">출근 시간</th>
                  <th className="p-3">퇴근 시간</th>
                  <th className="p-3 pr-4">총 근무 시간 (분)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {attendances.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-6 text-center text-slate-400">
                      선택한 월({monthStr})의 근무 기록이 없습니다.
                    </td>
                  </tr>
                ) : (
                  attendances.map((att) => (
                    <tr key={att.id || att.work_date} className="hover:bg-slate-50 transition">
                      <td className="p-3 pl-4 font-bold text-slate-900">{att.work_date}</td>
                      <td className="p-3 text-slate-700">{att.clock_in}</td>
                      <td className="p-3 text-slate-700">{att.clock_out}</td>
                      <td className="p-3 pr-4 font-bold text-emerald-700">
                        {att.total_minutes}분 ({Math.floor(att.total_minutes / 60)}시간 {att.total_minutes % 60}분)
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      {/* 비밀번호 변경 모달 (숫자 4자리) */}
      {showPinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm bg-white rounded-2xl p-6 shadow-xl border border-slate-200 space-y-4">
            <h3 className="text-base font-bold text-slate-900 border-b pb-2">직원 비밀번호 변경</h3>

            <form onSubmit={handleChangePin} className="space-y-4 text-xs">
              <PinInput
                label="새 4자리 비밀번호"
                value={newPin}
                onChange={setNewPin}
                length={4}
              />

              <PinInput
                label="비밀번호 확인"
                value={confirmPin}
                onChange={setConfirmPin}
                length={4}
              />

              {pinError && (
                <p className="text-xs text-rose-600 font-medium bg-rose-50 p-2 rounded-lg border border-rose-200">
                  {pinError}
                </p>
              )}
              {pinSuccess && (
                <p className="text-xs text-emerald-700 font-medium bg-emerald-50 p-2 rounded-lg border border-emerald-200">
                  {pinSuccess}
                </p>
              )}

              <div className="flex gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setShowPinModal(false)}>
                  취소
                </Button>
                <Button type="submit" variant="primary">
                  변경 완료
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
