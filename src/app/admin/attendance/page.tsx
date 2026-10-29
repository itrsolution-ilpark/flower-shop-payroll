"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import StatusBadge from "@/components/StatusBadge";
import { ArrowLeft, Calendar, Save, Check } from "lucide-react";
import { format, parseISO, getDaysInMonth } from "date-fns";

interface StaffUser {
  id: string;
  shop_id: string;
  name: string;
  is_admin: boolean;
}

interface StaffMember {
  id: string;
  name: string;
  status: string;
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

export default function AdminAttendancePage() {
  const router = useRouter();
  const [user, setUser] = useState<StaffUser | null>(null);
  const [shopName, setShopName] = useState<string>("");
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string>(format(new Date(), "yyyy-MM"));
  const [selectedStaffId, setSelectedStaffId] = useState<string>("");

  const [compensations, setCompensations] = useState<Record<string, CompensationItem[]>>({});
  const [attendanceMap, setAttendanceMap] = useState<Record<string, AttendanceRecord>>({}); // date -> record

  // 수정 중인 시급 근무 기록 상태 (date -> {clockIn, clockOut})
  const [editAttendance, setEditAttendance] = useState<Record<string, { clockIn: string; clockOut: string }>>({});
  const [successMsg, setSuccessMsg] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);

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

  useEffect(() => {
    if (user && selectedStaffId) {
      fetchStaffDetails(selectedStaffId);
    }
  }, [selectedMonth, selectedStaffId]);

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
        .select("id, name, status")
        .eq("shop_id", shopId)
        .order("name", { ascending: true });

      if (staffData && staffData.length > 0) {
        setStaffList(staffData);
        setSelectedStaffId(staffData[0].id);
      }
    } catch (err) {
      console.error("예외 발생:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStaffDetails = async (staffId: string) => {
    try {
      // 1. 급여 조건 이력 조회
      const { data: compData } = await supabase
        .from("compensation")
        .select("*")
        .eq("staff_id", staffId)
        .order("effective_from", { ascending: true });

      const compList = compData || [];
      setCompensations((prev) => ({ ...prev, [staffId]: compList }));

      // 2. 해당 월 출퇴근 기록 조회 (시급 직원용)
      const [year, month] = selectedMonth.split("-").map(Number);
      const startDate = `${selectedMonth}-01`;
      const lastDay = getDaysInMonth(new Date(year, month - 1));
      const endDate = `${selectedMonth}-${String(lastDay).padStart(2, "0")}`;

      const { data: attData } = await supabase
        .from("attendance")
        .select("*")
        .eq("staff_id", staffId)
        .gte("work_date", startDate)
        .lte("work_date", endDate);

      const map: Record<string, AttendanceRecord> = {};
      const editMap: Record<string, { clockIn: string; clockOut: string }> = {};

      (attData || []).forEach((att) => {
        map[att.work_date] = att;
        editMap[att.work_date] = {
          clockIn: att.clock_in.slice(0, 5),
          clockOut: att.clock_out.slice(0, 5),
        };
      });

      setAttendanceMap(map);
      setEditAttendance(editMap);
    } catch (err) {
      console.error("예외 발생:", err);
    }
  };

  // 특정 일자에 유효한 급여 조건 반환
  const getEffectiveCompForDate = (staffId: string, dateStr: string) => {
    const list = compensations[staffId] || [];
    let valid = null;
    for (const c of list) {
      if (c.effective_from <= dateStr) {
        valid = c;
      }
    }
    return valid;
  };

  // 급여 계산 함수 (SPEC 정확히 반영)
  const calculateStaffMonthlyEarnings = (staffId: string, targetMonth: string) => {
    const list = compensations[staffId] || [];
    if (list.length === 0) return { error: "급여 적용 조건이 없어 계산할 수 없습니다.", amount: 0, totalMinutes: 0 };

    const [year, month] = targetMonth.split("-").map(Number);
    const totalDaysInMonth = getDaysInMonth(new Date(year, month - 1));

    // 최신 급여 조건 확인 (시급인지 월급인지)
    const latestComp = list[list.length - 1];

    if (latestComp.pay_type === "hourly") {
      let totalMins = 0;
      let totalPay = 0;

      Object.values(attendanceMap).forEach((att) => {
        const comp = getEffectiveCompForDate(staffId, att.work_date);
        if (comp && comp.pay_type === "hourly") {
          const mins = att.total_minutes || 0;
          totalMins += mins;
          totalPay += Math.round((mins / 60) * comp.amount_krw);
        }
      });

      return { error: null, amount: totalPay, totalMinutes: totalMins, payType: "hourly" };
    } else {
      // 월급 직원 일할 계산
      let weightedMonthlyPay = 0;

      for (let day = 1; day <= totalDaysInMonth; day++) {
        const dateStr = `${targetMonth}-${String(day).padStart(2, "0")}`;
        const comp = getEffectiveCompForDate(staffId, dateStr);
        if (comp && comp.pay_type === "monthly") {
          weightedMonthlyPay += comp.amount_krw / totalDaysInMonth;
        }
      }

      return { error: null, amount: Math.round(weightedMonthlyPay), totalMinutes: 0, payType: "monthly" };
    }
  };

  const handleSaveAttendance = async (workDate: string) => {
    setErrorMsg("");
    setSuccessMsg("");

    const item = editAttendance[workDate];
    if (!item || !item.clockIn || !item.clockOut) {
      setErrorMsg("출근 및 퇴근 시각을 모두 입력해주세요.");
      return;
    }

    if (item.clockOut <= item.clockIn) {
      setErrorMsg("퇴근 시간은 출근 시간보다 늦어야 합니다.");
      return;
    }

    const [inH, inM] = item.clockIn.split(":").map(Number);
    const [outH, outM] = item.clockOut.split(":").map(Number);
    const totalMinutes = (outH * 60 + outM) - (inH * 60 + inM);

    if (totalMinutes <= 0) {
      setErrorMsg("퇴근 시간은 출근 시간보다 늦어야 합니다.");
      return;
    }

    try {
      const { error } = await supabase.from("attendance").upsert(
        [
          {
            staff_id: selectedStaffId,
            work_date: workDate,
            clock_in: item.clockIn + ":00",
            clock_out: item.clockOut + ":00",
            total_minutes: totalMinutes,
            updated_at: new Date().toISOString(),
          },
        ],
        { onConflict: "staff_id,work_date" }
      );

      if (error) {
        setErrorMsg("근무 기록 저장 중 오류가 발생했습니다.");
        return;
      }

      setSuccessMsg(`${workDate} 근무 기록이 저장되었습니다.`);
      fetchStaffDetails(selectedStaffId);
    } catch (err) {
      console.error("예외 발생:", err);
      setErrorMsg("저장 중 오류가 발생했습니다.");
    }
  };

  if (!user) return null;

  const selectedStaff = staffList.find((s) => s.id === selectedStaffId);
  const earnings = selectedStaffId ? calculateStaffMonthlyEarnings(selectedStaffId, selectedMonth) : { error: "급여 적용 조건이 없어 계산할 수 없습니다.", amount: 0, totalMinutes: 0 };

  const [year, month] = selectedMonth.split("-").map(Number);
  const totalDaysInMonth = getDaysInMonth(new Date(year, month - 1));
  const monthDays = Array.from({ length: totalDaysInMonth }, (_, i) => {
    const day = i + 1;
    return `${selectedMonth}-${String(day).padStart(2, "0")}`;
  });

  const activeCompList = compensations[selectedStaffId] || [];
  const latestComp = activeCompList[activeCompList.length - 1];
  const isMonthly = latestComp?.pay_type === "monthly";

  return (
    <div className="flex flex-col flex-1">
      {/* 공통 배너 */}
      <header className="bg-white border-b border-[#E2E8F0] px-4 md:px-6 h-[56px] md:h-[64px] flex items-center justify-between sticky top-0 z-40">
        <h1 className="text-lg md:text-xl font-bold text-[#0F172A] tracking-tight">
          플라워샵 근무 관리
        </h1>
        <div className="flex items-center gap-2">
          <Link
            href="/admin"
            className="px-3 min-h-[40px] h-[40px] border border-[#E2E8F0] rounded-xl text-xs text-[#0F172A] font-semibold hover:bg-slate-50 flex items-center gap-1.5 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            직원 관리
          </Link>
        </div>
      </header>

      <div className="max-w-[1120px] mx-auto w-full p-4 md:p-6 space-y-6">
        {/* ‘근무 기록 및 급여 정산’ 카드 */}
        <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E2E8F0] pb-4">
            <div>
              <h2 className="text-base font-bold text-[#0F172A]">근무 기록 및 급여 정산</h2>
              <p className="text-xs text-[#64748B] mt-0.5">{shopName} 소속 직원별 월별 정산 및 근무 기록 보완</p>
            </div>

            {/* 월 선택 (YYYY-MM) */}
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

          {/* 직원 선택 탭 */}
          {staffList.length === 0 ? (
            <p className="text-xs text-[#64748B] text-center py-6">등록된 직원이 없습니다.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {staffList.map((st) => (
                <button
                  key={st.id}
                  onClick={() => setSelectedStaffId(st.id)}
                  className={`px-4 min-h-[42px] h-[42px] rounded-xl text-xs font-semibold transition flex items-center gap-2 ${
                    selectedStaffId === st.id
                      ? "bg-[#059669] text-white shadow-sm"
                      : "bg-[#F8FAFC] text-[#0F172A] border border-[#E2E8F0] hover:bg-slate-100"
                  }`}
                >
                  <span>{st.name}</span>
                  <StatusBadge status={st.status} />
                </button>
              ))}
            </div>
          )}
        </div>

        {selectedStaff && (
          <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl">
              <div>
                <h3 className="font-bold text-base text-[#0F172A]">{selectedStaff.name} 님의 {selectedMonth} 정산 요약</h3>
                <p className="text-xs text-[#64748B] mt-0.5">
                  급여 유형: <span className="font-semibold text-[#0F172A]">{isMonthly ? "월급" : "시급"}</span>
                  {!isMonthly && ` · 총 근무 시간: ${Math.floor(earnings.totalMinutes / 60)}시간 ${earnings.totalMinutes % 60}분`}
                </p>
              </div>
              <div className="text-right">
                <span className="text-xs text-[#64748B] block">지급 예정액 (원 단위 반올림)</span>
                <span className="text-lg font-bold text-[#059669]">
                  {earnings.error ? earnings.error : earnings.amount.toLocaleString() + "원"}
                </span>
              </div>
            </div>

            {errorMsg && (
              <p className="text-xs text-rose-500 font-medium text-center">{errorMsg}</p>
            )}
            {successMsg && (
              <p className="text-xs text-[#059669] font-medium text-center">{successMsg}</p>
            )}

            {/* 상세 내역 영역 */}
            {isMonthly ? (
              <div className="p-8 text-center bg-slate-50 border border-[#E2E8F0] rounded-xl space-y-2">
                <p className="text-sm font-bold text-[#0F172A]">월급 직원은 출퇴근 기록을 입력하지 않습니다.</p>
                <p className="text-xs text-[#64748B]">해당 월 고정액을 기준으로 일할 계산된 급여가 지급됩니다.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-[#0F172A] border-b border-[#E2E8F0] pb-2">
                  일자별 출퇴근 기록 및 보완 (시급 직원)
                </h4>

                <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
                  {monthDays.map((dateStr) => {
                    const att = attendanceMap[dateStr];
                    const editItem = editAttendance[dateStr] || { clockIn: "09:00", clockOut: "18:00" };

                    return (
                      <div
                        key={dateStr}
                        className="p-3.5 bg-slate-50 border border-[#E2E8F0] rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="w-32">
                          <span className="font-semibold text-xs text-[#0F172A] block">{dateStr}</span>
                          <span className="text-[11px] text-[#64748B]">
                            {att ? `${att.total_minutes}분 근무` : "기록 없음"}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-[#64748B]">출근</span>
                            <input
                              type="time"
                              value={editItem.clockIn}
                              onChange={(e) =>
                                setEditAttendance({
                                  ...editAttendance,
                                  [dateStr]: { ...editItem, clockIn: e.target.value },
                                })
                              }
                              className="min-h-[38px] h-[38px] px-2.5 border border-[#E2E8F0] rounded-lg text-xs bg-white"
                            />
                          </div>

                          <div className="flex items-center gap-1">
                            <span className="text-xs text-[#64748B]">퇴근</span>
                            <input
                              type="time"
                              value={editItem.clockOut}
                              onChange={(e) =>
                                setEditAttendance({
                                  ...editAttendance,
                                  [dateStr]: { ...editItem, clockOut: e.target.value },
                                })
                              }
                              className="min-h-[38px] h-[38px] px-2.5 border border-[#E2E8F0] rounded-lg text-xs bg-white"
                            />
                          </div>

                          <button
                            onClick={() => handleSaveAttendance(dateStr)}
                            className="min-h-[38px] h-[38px] px-3.5 bg-[#059669] text-white text-xs font-semibold rounded-lg hover:bg-[#047857] transition flex items-center gap-1"
                          >
                            <Save className="w-3.5 h-3.5" />
                            저장
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
