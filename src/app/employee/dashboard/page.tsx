"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Banner from "@/components/Banner";
import MonthPicker from "@/components/MonthPicker";
import TimePickerModal from "@/components/TimePickerModal";
import PinInput from "@/components/PinInput";
import Button from "@/components/ui/Button";
import { getCurrentSessionAction, logoutAction } from "@/actions/authActions";
import {
  getStaffCompensationsAction,
  changeStaffPinAction,
  CompensationData,
} from "@/actions/staffActions";
import {
  getStaffAttendanceMonthAction,
  saveAttendanceAction,
  AttendanceItem,
} from "@/actions/attendanceActions";
import {
  calculateStaffMonthlyEarnings,
  MonthlyEarningsResult,
} from "@/lib/payroll";
import { formatCurrency, formatMinutesToHoursAndMinutes } from "@/lib/utils";
import { format } from "date-fns";
import { Clock, Calendar, Lock, LogOut, CheckCircle2, UserCheck } from "lucide-react";

export default function EmployeeDashboardPage() {
  const router = useRouter();

  const [staffId, setStaffId] = useState<string>("");
  const [staffName, setStaffName] = useState<string>("");
  const [currentMonth, setCurrentMonth] = useState<string>(format(new Date(), "yyyy-MM"));

  // 급여 조건 및 출퇴근 기록
  const [compensations, setCompensations] = useState<CompensationData[]>([]);
  const [attendances, setAttendances] = useState<AttendanceItem[]>([]);
  const [earnings, setEarnings] = useState<MonthlyEarningsResult>({
    amount: 0,
    totalMinutes: 0,
    payType: null,
    timeUnit: "minute",
  });

  // 오늘 일별 출퇴근 입력용
  const [workDate, setWorkDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  const [clockIn, setClockIn] = useState<string>("09:00");
  const [clockOut, setClockOut] = useState<string>("18:00");
  const [timePickerTarget, setTimePickerTarget] = useState<"in" | "out" | null>(null);

  // 비밀번호 변경 모달
  const [showPinModal, setShowPinModal] = useState<boolean>(false);
  const [newPin, setNewPin] = useState<string>("");
  const [confirmPin, setConfirmPin] = useState<string>("");
  const [pinError, setPinError] = useState<string>("");
  const [pinSubmitting, setPinSubmitting] = useState<boolean>(false);

  const [loading, setLoading] = useState<boolean>(true);
  const [msg, setMsg] = useState<string>("");

  const loadData = async (mStr: string) => {
    setLoading(true);
    const session = await getCurrentSessionAction();
    if (!session || session.role !== "staff") {
      router.replace("/login");
      return;
    }

    setStaffId(session.userId);
    setStaffName(session.name);

    // 급여조건 및 근무기록 로드
    const [comps, atts] = await Promise.all([
      getStaffCompensationsAction(session.userId),
      getStaffAttendanceMonthAction(session.userId, mStr),
    ]);

    setCompensations(comps);
    setAttendances(atts);

    // 정산 계산
    const calc = calculateStaffMonthlyEarnings(comps, atts, mStr);
    setEarnings(calc);

    setLoading(false);
  };

  useEffect(() => {
    loadData(currentMonth);
  }, [currentMonth]);

  // 출퇴근 기록 저장
  const handleSaveAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg("");

    if (!staffId) return;

    const res = await saveAttendanceAction(staffId, workDate, clockIn, clockOut);
    if (!res.success) {
      setMsg(res.error || "저장 실패");
      return;
    }

    setMsg("출퇴근 기록이 정상 등록되었습니다.");
    await loadData(currentMonth);
  };

  // 비밀번호 변경
  const handleChangePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinError("");

    if (newPin.length !== 4) {
      setPinError("비밀번호는 숫자 4자리여야 합니다.");
      return;
    }
    if (newPin !== confirmPin) {
      setPinError("비밀번호 확인이 일치하지 않습니다.");
      return;
    }

    setPinSubmitting(true);
    try {
      const res = await changeStaffPinAction(staffId, newPin, confirmPin);
      if (!res.success) {
        setPinError(res.error || "비밀번호 변경에 실패했습니다.");
        setPinSubmitting(false);
        return;
      }

      alert("비밀번호가 성공적으로 변경되었습니다.");
      setShowPinModal(false);
      setNewPin("");
      setConfirmPin("");
    } catch {
      setPinError("처리 중 오류가 발생했습니다.");
    } finally {
      setPinSubmitting(false);
    }
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
          직원 정보를 불러오는 중...
        </div>
      </div>
    );
  }

  const latestComp = compensations[compensations.length - 1];

  return (
    <div className="flex flex-col min-h-screen bg-[#F8FAFC]">
      {/* 상단 헤더 배너 */}
      <Banner
        rightElement={
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-700 hidden sm:inline">
              {staffName} 님
            </span>
            <button
              onClick={() => setShowPinModal(true)}
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

      <main className="flex-1 max-w-4xl mx-auto w-full p-4 md:p-6 space-y-6 pb-20">
        {/* 직원 프로필 및 내 급여 조건 요약 카드 */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
              <UserCheck className="w-3.5 h-3.5" />
              승인된 직원 계정
            </div>
            <h2 className="text-xl font-extrabold text-slate-900">{staffName} 님, 환영합니다!</h2>
            <p className="text-xs text-slate-500">
              일별 출퇴근 기록을 입력하고 월별 급여 정산 결과를 조회하세요.
            </p>
          </div>

          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1 shrink-0">
            <div className="font-bold text-slate-800">현재 적용 급여 조건:</div>
            {latestComp ? (
              <div className="text-slate-600">
                <span className="font-semibold text-emerald-700">
                  {latestComp.pay_type === "monthly" ? "월급" : "시급"} {formatCurrency(latestComp.amount_krw)}
                </span>
                {latestComp.pay_type === "hourly" && (
                  <span> ({latestComp.time_unit === "hour" ? "시간 절사" : "분 단위 정밀"})</span>
                )}
              </div>
            ) : (
              <div className="text-amber-600 font-medium">관리자 급여 조건 설정 대기 중</div>
            )}
          </div>
        </div>

        {/* 일별 출퇴근 등록 카드 (모바일 터치 친화적 UI) */}
        {latestComp?.pay_type === "hourly" ? (
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <Clock className="w-5 h-5 text-emerald-600" />
              <h3 className="text-base font-bold text-slate-900">일별 출퇴근 기록 등록</h3>
            </div>

            <form onSubmit={handleSaveAttendance} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-800 mb-1">
                    근무 날짜
                  </label>
                  <input
                    type="date"
                    value={workDate}
                    onChange={(e) => setWorkDate(e.target.value)}
                    className="w-full min-h-[46px] h-[46px] px-3.5 border border-slate-200 rounded-xl text-sm bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-800 mb-1">
                    출근 시각
                  </label>
                  <button
                    type="button"
                    onClick={() => setTimePickerTarget("in")}
                    className="w-full min-h-[46px] h-[46px] px-3.5 border border-slate-200 rounded-xl text-sm bg-white text-slate-900 font-bold text-left hover:bg-slate-50 transition flex items-center justify-between"
                  >
                    <span>{clockIn}</span>
                    <span className="text-xs text-emerald-600 font-semibold">시간 선택</span>
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-800 mb-1">
                    퇴근 시각
                  </label>
                  <button
                    type="button"
                    onClick={() => setTimePickerTarget("out")}
                    className="w-full min-h-[46px] h-[46px] px-3.5 border border-slate-200 rounded-xl text-sm bg-white text-slate-900 font-bold text-left hover:bg-slate-50 transition flex items-center justify-between"
                  >
                    <span>{clockOut}</span>
                    <span className="text-xs text-emerald-600 font-semibold">시간 선택</span>
                  </button>
                </div>
              </div>

              {msg && (
                <p className="text-xs font-semibold text-emerald-700 bg-emerald-50 p-2.5 rounded-lg text-center border border-emerald-200">
                  {msg}
                </p>
              )}

              <Button type="submit" variant="primary">
                기록 저장
              </Button>
            </form>
          </div>
        ) : (
          <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl text-center text-xs text-slate-600 font-medium">
            월급제 적용 직원은 일별 출퇴근 입력을 하지 않으며 고정 월급여로 자동 산정됩니다.
          </div>
        )}

        {/* 월별 근무 및 급여 정산 조회 카드 */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-3 gap-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-emerald-600" />
              <h3 className="text-base font-bold text-slate-900">월별 근무 및 급여 내역</h3>
            </div>
            <MonthPicker value={currentMonth} onChange={setCurrentMonth} />
          </div>

          {/* 급여 집계 요약 카드 */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <span className="block text-xs text-slate-500 mb-0.5">해당 월 총 근무시간</span>
              <span className="text-lg font-extrabold text-slate-900">
                {earnings.payType === "monthly"
                  ? "월급 고정 적용"
                  : formatMinutesToHoursAndMinutes(earnings.totalMinutes)}
              </span>
            </div>
            <div>
              <span className="block text-xs text-slate-500 mb-0.5">예상 월 급여 총액</span>
              <span className="text-xl font-extrabold text-emerald-700">
                {formatCurrency(earnings.amount)}
              </span>
            </div>
          </div>

          {/* 일별 출퇴근 내역 테이블 (수평 스크롤 모바일 대응) */}
          <div className="w-full overflow-x-auto whitespace-nowrap -mx-4 px-4 sm:mx-0 sm:px-0">
            <table className="w-full text-xs text-left border-collapse min-w-[500px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <th className="py-2.5 px-3">근무 날짜</th>
                  <th className="py-2.5 px-3">출근 시각</th>
                  <th className="py-2.5 px-3">퇴근 시각</th>
                  <th className="py-2.5 px-3 text-right">근무 시간</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {attendances.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-6 text-slate-400">
                      해당 월에 등록된 출퇴근 내역이 없습니다.
                    </td>
                  </tr>
                ) : (
                  attendances.map((att) => (
                    <tr key={att.id || att.work_date} className="hover:bg-slate-50 transition">
                      <td className="py-3 px-3 font-bold text-slate-900">{att.work_date}</td>
                      <td className="py-3 px-3 text-slate-700">{att.clock_in}</td>
                      <td className="py-3 px-3 text-slate-700">{att.clock_out}</td>
                      <td className="py-3 px-3 text-right font-extrabold text-emerald-700">
                        {formatMinutesToHoursAndMinutes(att.total_minutes)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* 비밀번호 변경 모달 */}
      {showPinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl border border-slate-200 space-y-4">
            <h3 className="text-base font-bold text-slate-900">직원 비밀번호 변경</h3>
            <p className="text-xs text-slate-500">새로운 4자리 숫자 비밀번호를 입력해주세요.</p>

            <form onSubmit={handleChangePinSubmit} className="space-y-3">
              <PinInput
                label="새 비밀번호 (숫자 4자리)"
                value={newPin}
                onChange={setNewPin}
                length={4}
              />

              <PinInput
                label="새 비밀번호 확인"
                value={confirmPin}
                onChange={setConfirmPin}
                length={4}
              />

              {pinError && (
                <p className="text-xs text-rose-600 font-medium text-center bg-rose-50 p-2 rounded-lg border border-rose-200">
                  {pinError}
                </p>
              )}

              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowPinModal(false)}
                  disabled={pinSubmitting}
                >
                  취소
                </Button>
                <Button type="submit" variant="primary" disabled={pinSubmitting}>
                  {pinSubmitting ? "변경 중..." : "변경 완료"}
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
        initialValue={timePickerTarget === "in" ? clockIn : clockOut}
        onClose={() => setTimePickerTarget(null)}
        onConfirm={(time) => {
          if (timePickerTarget === "in") setClockIn(time);
          if (timePickerTarget === "out") setClockOut(time);
        }}
      />
    </div>
  );
}
