"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import Button from "@/components/ui/Button";
import { Calendar, Clock, Lock, ArrowLeft, Save } from "lucide-react";
import { format, getDaysInMonth } from "date-fns";

interface StaffUser {
  id: string;
  shop_id: string;
  name: string;
  is_admin: boolean;
}

interface CompensationItem {
  pay_type: "hourly" | "monthly";
  amount_krw: number;
  effective_from: string;
}

interface AttendanceRecord {
  id?: string;
  staff_id: string;
  work_date: string;
  clock_in: string;
  clock_out: string;
  total_minutes: number;
}

export default function EmployeeDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<StaffUser | null>(null);
  const [shopName, setShopName] = useState<string>("");
  const [compensations, setCompensations] = useState<CompensationItem[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string>(format(new Date(), "yyyy-MM"));

  // 시급 직원 출퇴근 입력 상태
  const [workDate, setWorkDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  const [clockIn, setClockIn] = useState<string>("09:30");
  const [clockOut, setClockOut] = useState<string>("18:30");

  const [attendanceMap, setAttendanceMap] = useState<Record<string, AttendanceRecord>>({});
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [successMsg, setSuccessMsg] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);

  // 비밀번호 변경 모달 상태
  const [isPinModalOpen, setIsPinModalOpen] = useState<boolean>(false);
  const [newPin, setNewPin] = useState<string>("");
  const [confirmPin, setConfirmPin] = useState<string>("");
  const [pinError, setPinError] = useState<string>("");

  useEffect(() => {
    const raw = localStorage.getItem("flower_shop_user");
    if (!raw) {
      router.push("/");
      return;
    }
    const parsed: StaffUser = JSON.parse(raw);
    if (parsed.is_admin) {
      router.push("/admin");
      return;
    }
    setUser(parsed);
    fetchData(parsed.shop_id, parsed.id);
  }, [router]);

  useEffect(() => {
    if (user) {
      fetchAttendanceForMonth(user.id, selectedMonth);
    }
  }, [selectedMonth, user]);

  const fetchData = async (shopId: string, staffId: string) => {
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

      const { data: compData } = await supabase
        .from("compensation")
        .select("*")
        .eq("staff_id", staffId)
        .order("effective_from", { ascending: true });

      setCompensations(compData || []);
      fetchAttendanceForMonth(staffId, selectedMonth);
    } catch (err) {
      console.error("예외 발생:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAttendanceForMonth = async (staffId: string, monthStr: string) => {
    try {
      const [year, month] = monthStr.split("-").map(Number);
      const startDate = `${monthStr}-01`;
      const lastDay = getDaysInMonth(new Date(year, month - 1));
      const endDate = `${monthStr}-${String(lastDay).padStart(2, "0")}`;

      const { data } = await supabase
        .from("attendance")
        .select("*")
        .eq("staff_id", staffId)
        .gte("work_date", startDate)
        .lte("work_date", endDate);

      const map: Record<string, AttendanceRecord> = {};
      (data || []).forEach((att) => {
        map[att.work_date] = att;
      });
      setAttendanceMap(map);
    } catch (err) {
      console.error("예외 발생:", err);
    }
  };

  const getEffectiveCompForDate = (dateStr: string) => {
    let valid = null;
    for (const c of compensations) {
      if (c.effective_from <= dateStr) {
        valid = c;
      }
    }
    return valid;
  };

  const handleSaveAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!workDate || !clockIn || !clockOut) {
      setErrorMsg("날짜와 출퇴근 시각을 모두 입력해주세요.");
      return;
    }

    if (clockOut <= clockIn) {
      setErrorMsg("퇴근 시간은 출근 시간보다 늦어야 합니다.");
      return;
    }

    const [inH, inM] = clockIn.split(":").map(Number);
    const [outH, outM] = clockOut.split(":").map(Number);
    const totalMinutes = (outH * 60 + outM) - (inH * 60 + inM);

    if (totalMinutes <= 0) {
      setErrorMsg("퇴근 시간은 출근 시간보다 늦어야 합니다.");
      return;
    }

    if (!user) return;

    try {
      const { error } = await supabase.from("attendance").upsert(
        [
          {
            staff_id: user.id,
            work_date: workDate,
            clock_in: clockIn + ":00",
            clock_out: clockOut + ":00",
            total_minutes: totalMinutes,
            updated_at: new Date().toISOString(),
          },
        ],
        { onConflict: "staff_id,work_date" }
      );

      if (error) {
        setErrorMsg("출퇴근 기록 저장 중 오류가 발생했습니다.");
        return;
      }

      setSuccessMsg("근무 기록이 저장되었습니다.");
      fetchAttendanceForMonth(user.id, selectedMonth);
    } catch (err) {
      console.error("예외 발생:", err);
      setErrorMsg("저장 중 오류가 발생했습니다.");
    }
  };

  const handleChangePin = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinError("");

    if (!/^[0-9]{4}$/.test(newPin)) {
      setPinError("비밀은 숫자 4자리여야 합니다.");
      return;
    }

    if (newPin !== confirmPin) {
      setPinError("비밀 확인이 일치하지 않습니다.");
      return;
    }

    if (!user) return;

    try {
      const { error } = await supabase
        .from("staff")
        .update({ pin_code: newPin })
        .eq("id", user.id);

      if (error) {
        setPinError("비밀 변경 중 오류가 발생했습니다.");
        return;
      }

      alert("비밀이 성공적으로 변경되었습니다.");
      setIsPinModalOpen(false);
      setNewPin("");
      setConfirmPin("");
    } catch (err) {
      console.error("예외 발생:", err);
      setPinError("처리 중 오류가 발생했습니다.");
    }
  };

  // 급여 계산
  const latestComp = compensations[compensations.length - 1];
  const isMonthly = latestComp?.pay_type === "monthly";

  const calculateEarnings = () => {
    if (compensations.length === 0) return { error: "급여 적용 조건이 없어 계산할 수 없습니다.", amount: 0, totalMinutes: 0 };

    const [year, month] = selectedMonth.split("-").map(Number);
    const totalDaysInMonth = getDaysInMonth(new Date(year, month - 1));

    if (latestComp.pay_type === "hourly") {
      let totalMins = 0;
      let totalPay = 0;

      Object.values(attendanceMap).forEach((att) => {
        const comp = getEffectiveCompForDate(att.work_date);
        if (comp && comp.pay_type === "hourly") {
          const mins = att.total_minutes || 0;
          totalMins += mins;
          totalPay += Math.round((mins / 60) * comp.amount_krw);
        }
      });

      return { error: null, amount: totalPay, totalMinutes: totalMins };
    } else {
      let weightedMonthlyPay = 0;
      for (let day = 1; day <= totalDaysInMonth; day++) {
        const dateStr = `${selectedMonth}-${String(day).padStart(2, "0")}`;
        const comp = getEffectiveCompForDate(dateStr);
        if (comp && comp.pay_type === "monthly") {
          weightedMonthlyPay += comp.amount_krw / totalDaysInMonth;
        }
      }
      return { error: null, amount: Math.round(weightedMonthlyPay), totalMinutes: 0 };
    }
  };

  if (!user || loading) {
    return <div className="flex flex-col flex-1 p-6 justify-center text-center text-xs text-[#64748B]">로딩 중...</div>;
  }

  const earnings = calculateEarnings();

  return (
    <div className="flex flex-col flex-1">
      {/* 공통 배너 */}
      <header className="bg-white border-b border-[#E2E8F0] px-4 md:px-6 h-[56px] md:h-[64px] flex items-center justify-between sticky top-0 z-40">
        <h1 className="text-lg md:text-xl font-bold text-[#0F172A] tracking-tight">
          플라워샵 근무 관리
        </h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPinModalOpen(true)}
            className="px-3 min-h-[40px] h-[40px] border border-[#E2E8F0] rounded-xl text-xs text-[#0F172A] font-semibold hover:bg-slate-50 transition"
          >
            비밀번호 변경
          </button>
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
        {/* 상단 프로필 카드 */}
        <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-[#0F172A]">{user.name} 님 대시보드</h2>
            <p className="text-xs text-[#64748B] mt-0.5">
              소속 플라워샵: <span className="font-semibold text-[#059669]">{shopName}</span> · 급여 조건:{" "}
              <span className="font-semibold text-[#0F172A]">
                {latestComp ? `${latestComp.pay_type === "hourly" ? "시급" : "월급"} ${latestComp.amount_krw.toLocaleString()}원` : "미설정"}
              </span>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[#059669]" />
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="min-h-[42px] h-[42px] px-3 border border-[#E2E8F0] rounded-xl text-xs font-semibold bg-white text-[#0F172A]"
            />
          </div>
        </div>

        {/* 이번 달 예상 급여 및 근무 요약 */}
        <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs text-[#64748B] font-semibold block">{selectedMonth} 정산 요약</span>
            <h3 className="text-lg font-bold text-[#0F172A] mt-0.5">
              {!isMonthly && `총 근무 시간: ${Math.floor(earnings.totalMinutes / 60)}시간 ${earnings.totalMinutes % 60}분`}
              {isMonthly && "월급 고정액 일할 계산 적용"}
            </h3>
          </div>
          <div className="text-right">
            <span className="text-xs text-[#64748B] block">예상 급여 (원 단위 반올림)</span>
            <span className="text-xl font-bold text-[#059669]">
              {earnings.error ? earnings.error : earnings.amount.toLocaleString() + "원"}
            </span>
          </div>
        </div>

        {/* 시급 직원에게만 날짜·출근·퇴근 선택과 저장 기능 제공 */}
        {!isMonthly ? (
          <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-sm space-y-4">
            <h3 className="text-base font-bold text-[#0F172A] border-b border-[#E2E8F0] pb-3">
              출퇴근 기록 입력 및 수정
            </h3>

            <form onSubmit={handleSaveAttendance} className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
              <div>
                <label className="block text-xs font-semibold text-[#0F172A] mb-1">근무 날짜</label>
                <input
                  type="date"
                  value={workDate}
                  onChange={(e) => setWorkDate(e.target.value)}
                  className="w-full min-h-[46px] h-[46px] px-3 border border-[#E2E8F0] rounded-xl text-xs bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0F172A] mb-1">출근 시각</label>
                <input
                  type="time"
                  value={clockIn}
                  onChange={(e) => setClockIn(e.target.value)}
                  className="w-full min-h-[46px] h-[46px] px-3 border border-[#E2E8F0] rounded-xl text-xs bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0F172A] mb-1">퇴근 시각</label>
                <input
                  type="time"
                  value={clockOut}
                  onChange={(e) => setClockOut(e.target.value)}
                  className="w-full min-h-[46px] h-[46px] px-3 border border-[#E2E8F0] rounded-xl text-xs bg-white"
                />
              </div>

              <div>
                <Button type="submit" variant="primary" className="flex items-center justify-center gap-1">
                  <Save className="w-4 h-4" />
                  근무 기록 저장
                </Button>
              </div>
            </form>

            {errorMsg && <p className="text-xs text-rose-500 font-medium text-center">{errorMsg}</p>}
            {successMsg && <p className="text-xs text-[#059669] font-medium text-center">{successMsg}</p>}

            {/* 근무 이력 목록 */}
            <div className="pt-4 space-y-2">
              <h4 className="text-sm font-bold text-[#0F172A]">이번 달 근무 기록 목록</h4>
              {Object.keys(attendanceMap).length === 0 ? (
                <p className="text-xs text-[#64748B] text-center py-4">등록된 근무 기록이 없습니다.</p>
              ) : (
                <div className="space-y-2">
                  {Object.values(attendanceMap).map((att) => (
                    <div key={att.work_date} className="p-3.5 bg-slate-50 border border-[#E2E8F0] rounded-xl flex items-center justify-between text-xs">
                      <span className="font-semibold text-[#0F172A]">{att.work_date}</span>
                      <span className="text-[#64748B]">
                        출근 {att.clock_in.slice(0, 5)} ~ 퇴근 {att.clock_out.slice(0, 5)}
                      </span>
                      <span className="font-semibold text-[#059669]">
                        {Math.floor(att.total_minutes / 60)}시간 {att.total_minutes % 60}분
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-white p-8 rounded-2xl border border-[#E2E8F0] shadow-sm text-center space-y-2">
            <h3 className="text-base font-bold text-[#0F172A]">월급제 직원 안내</h3>
            <p className="text-xs text-[#64748B]">월급 직원은 출퇴근 기록 입력 기능을 사용하지 않습니다.</p>
          </div>
        )}
      </div>

      {/* 비밀번호 변경 모달 */}
      {isPinModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl border border-[#E2E8F0] space-y-4">
            <h3 className="text-base font-bold text-[#0F172A]">비밀 변경</h3>

            <form onSubmit={handleChangePin} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#0F172A] mb-1">새 비밀</label>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value.replace(/[^0-9]/g, ""))}
                  placeholder="••••"
                  className="w-full min-h-[46px] h-[46px] text-center tracking-widest text-lg font-bold border border-[#E2E8F0] rounded-xl bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0F172A] mb-1">비밀 확인</label>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value.replace(/[^0-9]/g, ""))}
                  placeholder="••••"
                  className="w-full min-h-[46px] h-[46px] text-center tracking-widest text-lg font-bold border border-[#E2E8F0] rounded-xl bg-white"
                />
              </div>

              {pinError && <p className="text-xs text-rose-500 text-center font-medium">{pinError}</p>}

              <div className="flex gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setIsPinModalOpen(false)}>
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
