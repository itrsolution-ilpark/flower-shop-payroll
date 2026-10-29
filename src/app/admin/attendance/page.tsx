"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import Navbar from "@/components/Navbar";
import Button from "@/components/ui/Button";
import StatusBadge from "@/components/StatusBadge";
import TimePickerModal from "@/components/TimePickerModal";
import { calculateMinutes, formatMinutesToHoursAndMinutes, calculateSalary } from "@/lib/utils";
import { Download, Calendar, Clock } from "lucide-react";

interface StaffUser {
  id: string;
  shop_id: string;
  name: string;
  is_admin: boolean;
  hourly_wage: number;
}

interface StaffMember {
  id: string;
  name: string;
  hourly_wage: number;
  status: string;
}

interface AttendanceRecord {
  id: string;
  staff_id: string;
  work_date: string;
  clock_in: string;
  clock_out: string | null;
  total_minutes: number;
  staff?: {
    name: string;
    hourly_wage: number;
    status: string;
  };
}

interface StaffSummary {
  id: string;
  name: string;
  status: string;
  hourly_wage: number;
  totalMinutes: number;
  totalPay: number;
}

export default function AdminAttendancePage() {
  const router = useRouter();
  const [user, setUser] = useState<StaffUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [attendanceList, setAttendanceList] = useState<AttendanceRecord[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string>(
    new Date().toISOString().slice(0, 7)
  );

  // 일자별 근무 기록 수정 모달
  const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(null);
  const [editWorkDate, setEditWorkDate] = useState<string>("");
  const [editClockIn, setEditClockIn] = useState<string>("");
  const [editClockOut, setEditClockOut] = useState<string>("");
  const [modalError, setModalError] = useState<string>("");

  // 시간 피커 모달
  const [timePickerTarget, setTimePickerTarget] = useState<"in" | "out" | null>(null);

  useEffect(() => {
    const rawUser = localStorage.getItem("flower_shop_user");
    if (!rawUser) {
      router.push("/");
      return;
    }
    const parsedUser: StaffUser = JSON.parse(rawUser);
    if (!parsedUser.is_admin) {
      router.push("/employee/dashboard");
      return;
    }
    setUser(parsedUser);
    fetchData(parsedUser.shop_id, selectedMonth);
  }, [selectedMonth, router]);

  const fetchData = async (shopId: string, month: string) => {
    setLoading(true);
    try {
      // 소속 전체 직원 (승인대기, 재직, 퇴사 모두 포함)
      const { data: staffData } = await supabase
        .from("staff")
        .select("id, name, hourly_wage, status")
        .eq("shop_id", shopId)
        .eq("is_admin", false)
        .order("name", { ascending: true });

      const staff = (staffData || []) as StaffMember[];
      setStaffList(staff);

      const staffIds = staff.map((s) => s.id);
      if (staffIds.length === 0) {
        setAttendanceList([]);
        setLoading(false);
        return;
      }

      const startDate = `${month}-01`;
      const [year, m] = month.split("-").map(Number);
      const lastDay = new Date(year, m, 0).getDate();
      const endDate = `${month}-${lastDay.toString().padStart(2, "0")}`;

      const { data: attData } = await supabase
        .from("attendance")
        .select("*, staff:staff_id(name, hourly_wage, status)")
        .in("staff_id", staffIds)
        .gte("work_date", startDate)
        .lte("work_date", endDate)
        .order("work_date", { ascending: false });

      setAttendanceList((attData || []) as unknown as AttendanceRecord[]);
    } catch (err) {
      console.error("예외 발생:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenEdit = (rec: AttendanceRecord) => {
    setEditingRecord(rec);
    setEditWorkDate(rec.work_date);
    setEditClockIn(rec.clock_in ? rec.clock_in.slice(0, 5) : "09:00");
    setEditClockOut(rec.clock_out ? rec.clock_out.slice(0, 5) : "");
    setModalError("");
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError("");

    if (!editingRecord) return;
    if (!editWorkDate || !editClockIn) {
      setModalError("근무 날짜와 출근 시간은 필수입니다.");
      return;
    }

    if (editClockOut && editClockIn > editClockOut) {
      setModalError("퇴근 시간은 출근 시간보다 빨라질 수 없습니다.");
      return;
    }

    const minutes = editClockOut ? calculateMinutes(editClockIn, editClockOut) : 0;

    try {
      const { error } = await supabase
        .from("attendance")
        .update({
          work_date: editWorkDate,
          clock_in: editClockIn,
          clock_out: editClockOut || null,
          total_minutes: minutes,
        })
        .eq("id", editingRecord.id);

      if (error) {
        setModalError("수정 저장 중 오류가 발생했습니다.");
        return;
      }

      setEditingRecord(null);
      if (user) fetchData(user.shop_id, selectedMonth);
    } catch (err) {
      console.error("예외 발생:", err);
      setModalError("처리 중 오류가 발생했습니다.");
    }
  };

  // 엑셀형 요약 다운로드 (CSV 포맷)
  const handleDownloadCsv = () => {
    if (summaries.length === 0) {
      alert("다운로드할 정산 내역이 없습니다.");
      return;
    }

    const headers = ["직원명", "상태", "총 근무 시간", "시급", "총 지급 급여"];
    const rows = summaries.map((s) => [
      s.name,
      s.status === "active" ? "재직" : s.status === "pending" ? "승인대기" : "퇴사",
      formatMinutesToHoursAndMinutes(s.totalMinutes),
      `${s.hourly_wage}원`,
      `${s.totalPay}원`,
    ]);

    const csvContent =
      "\uFEFF" +
      [headers.join(","), ...rows.map((r) => r.map((c) => `"${c}"`).join(","))].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `플라워샵_급여정산_${selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!user) return null;

  // 직원별 월간 요약 표 계산
  const summaries: StaffSummary[] = staffList.map((st) => {
    const records = attendanceList.filter((a) => a.staff_id === st.id && a.clock_out);
    const totalMinutes = records.reduce((acc, cur) => {
      const mins = cur.total_minutes || calculateMinutes(cur.clock_in, cur.clock_out);
      return acc + mins;
    }, 0);
    const totalPay = calculateSalary(totalMinutes, st.hourly_wage);

    return {
      id: st.id,
      name: st.name,
      status: st.status,
      hourly_wage: st.hourly_wage,
      totalMinutes,
      totalPay,
    };
  });

  const grandTotalPay = summaries.reduce((acc, cur) => acc + cur.totalPay, 0);

  return (
    <div className="flex flex-col flex-1">
      <Navbar title="근무 기록 및 급여 정산" />

      <div className="pt-6 px-4 pb-8 flex-1 space-y-6">
        {/* 1. 상단 툴바: 정산 연월 선택 셀렉트박스 (예: 2025년 05월) 및 엑셀형 요약 다운로드 */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-3 bg-white p-5 rounded-xl border border-borderLine shadow-sm">
          <div>
            <h1 className="text-base font-bold text-textColor">근무 기록 및 급여 정산</h1>
            <p className="text-xs text-subText">월별 근무 시간 및 총 지급 급여 자동 산출</p>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="flex-1 sm:flex-none min-h-[46px] h-[46px] px-3 border border-borderLine rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#059669]"
            />
            <button
              onClick={handleDownloadCsv}
              className="min-h-[46px] h-[46px] px-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition whitespace-nowrap"
            >
              <Download className="w-4 h-4" />
              엑셀형 요약 다운로드
            </button>
          </div>
        </div>

        {/* 2. 직원별 정산 테이블: 열 구성: 직원명, 상태 뱃지(승인대기/재직/퇴사), 총 근무 시간, 시급, 총 지급 급여, 상세/수정 액션 */}
        <section className="bg-white rounded-xl border border-borderLine shadow-sm overflow-hidden">
          <div className="p-4 border-b border-borderLine bg-slate-50 flex items-center justify-between">
            <h2 className="font-bold text-xs text-textColor">직원별 월별 급여 정산 집계</h2>
            <span className="text-xs text-subText">{selectedMonth} 기준</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100/70 text-slate-700 border-b border-borderLine">
                  <th className="p-3 font-semibold">직원명</th>
                  <th className="p-3 font-semibold text-center">상태</th>
                  <th className="p-3 font-semibold text-right">총 근무 시간</th>
                  <th className="p-3 font-semibold text-right">시급</th>
                  <th className="p-3 font-semibold text-right">총 지급 급여</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-borderLine">
                {summaries.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-subText">
                      소속 직원이 없습니다.
                    </td>
                  </tr>
                ) : (
                  summaries.map((sm) => (
                    <tr key={sm.id} className="hover:bg-slate-50 transition">
                      <td className="p-3 font-bold text-textColor">{sm.name}</td>
                      <td className="p-3 text-center">
                        <StatusBadge status={sm.status} />
                      </td>
                      <td className="p-3 text-right text-slate-700 font-medium">
                        {formatMinutesToHoursAndMinutes(sm.totalMinutes)}
                      </td>
                      <td className="p-3 text-right text-subText">
                        {sm.hourly_wage.toLocaleString()}원
                      </td>
                      <td className="p-3 text-right font-extrabold text-[#059669]">
                        {sm.totalPay.toLocaleString()}원
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {summaries.length > 0 && (
            <div className="p-4 bg-slate-50 border-t border-borderLine flex justify-between items-center text-xs font-bold text-textColor">
              <span>월 전체 총 지급 급여 합계</span>
              <span className="text-[#059669] text-base font-extrabold">
                {grandTotalPay.toLocaleString()}원
              </span>
            </div>
          )}
        </section>

        {/* 3. 일자별 근무 기록 수정 섹션: 날짜 선택, 출근 시간 피커, 퇴근 시간 피커, 기록 보완 저장 버튼 */}
        <section className="bg-white rounded-xl border border-borderLine shadow-sm overflow-hidden">
          <div className="p-4 border-b border-borderLine bg-slate-50 flex items-center justify-between">
            <h2 className="font-bold text-xs text-textColor">일자별 출퇴근 내역 및 기록 보완</h2>
            <span className="text-xs text-subText">{attendanceList.length}건</span>
          </div>

          {loading ? (
            <p className="text-xs text-center py-8 text-subText">조회 중...</p>
          ) : attendanceList.length === 0 ? (
            <p className="text-xs text-center py-8 text-subText">해당 월에 기록된 출퇴근 내역이 없습니다.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100/70 text-slate-700 border-b border-borderLine">
                    <th className="p-3 font-semibold">날짜</th>
                    <th className="p-3 font-semibold">직원명</th>
                    <th className="p-3 font-semibold text-center">상태</th>
                    <th className="p-3 font-semibold">출근</th>
                    <th className="p-3 font-semibold">퇴근</th>
                    <th className="p-3 font-semibold text-right">근무 시간</th>
                    <th className="p-3 font-semibold text-center">상세/수정</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-borderLine">
                  {attendanceList.map((rec) => {
                    const mins = rec.clock_out
                      ? rec.total_minutes || calculateMinutes(rec.clock_in, rec.clock_out)
                      : 0;
                    const staffStatus = rec.staff?.status || "active";
                    return (
                      <tr key={rec.id} className="hover:bg-slate-50 transition">
                        <td className="p-3 font-medium text-slate-700">{rec.work_date}</td>
                        <td className="p-3 font-bold text-textColor">{rec.staff?.name || "-"}</td>
                        <td className="p-3 text-center">
                          <StatusBadge status={staffStatus} />
                        </td>
                        <td className="p-3 text-slate-700">{rec.clock_in ? rec.clock_in.slice(0, 5) : "-"}</td>
                        <td className="p-3 text-slate-700">
                          {rec.clock_out ? rec.clock_out.slice(0, 5) : (
                            <span className="text-[#059669] font-semibold">근무 중</span>
                          )}
                        </td>
                        <td className="p-3 text-right font-medium text-slate-700">
                          {rec.clock_out ? formatMinutesToHoursAndMinutes(mins) : "-"}
                        </td>
                        <td className="p-3 text-center">
                          <button
                            onClick={() => handleOpenEdit(rec)}
                            className="px-3 min-h-[36px] h-[36px] bg-[#1E293B] hover:bg-[#0f172a] text-white text-xs font-semibold rounded-lg transition"
                          >
                            기록 수정
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {/* 일자별 근무 기록 수정 모달: 날짜 선택, 출근 시간 피커, 퇴근 시간 피커, 기록 보완 저장 버튼 */}
      {editingRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm bg-white rounded-xl p-6 shadow-xl border border-borderLine space-y-4">
            <div className="border-b border-borderLine pb-2">
              <h3 className="text-base font-bold text-textColor">
                일자별 근무 기록 수정
              </h3>
              <p className="text-xs text-subText mt-0.5">
                직원: <span className="font-semibold text-textColor">{editingRecord.staff?.name}</span>
              </p>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-textColor mb-1">
                  날짜 선택
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={editWorkDate}
                    onChange={(e) => setEditWorkDate(e.target.value)}
                    className="w-full min-h-[46px] h-[46px] px-3.5 border border-borderLine rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#059669]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-textColor mb-1">
                  출근 시간 피커
                </label>
                <button
                  type="button"
                  onClick={() => setTimePickerTarget("in")}
                  className="w-full min-h-[46px] h-[46px] px-3.5 border border-borderLine rounded-xl text-xs bg-white text-left flex items-center justify-between hover:bg-slate-50 transition"
                >
                  <span className="font-semibold text-textColor">{editClockIn || "09:00"}</span>
                  <Clock className="w-4 h-4 text-subText" />
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold text-textColor mb-1">
                  퇴근 시간 피커
                </label>
                <button
                  type="button"
                  onClick={() => setTimePickerTarget("out")}
                  className="w-full min-h-[46px] h-[46px] px-3.5 border border-borderLine rounded-xl text-xs bg-white text-left flex items-center justify-between hover:bg-slate-50 transition"
                >
                  <span className={editClockOut ? "font-semibold text-textColor" : "text-subText"}>
                    {editClockOut || "시간 선택 (근무 중이면 비움)"}
                  </span>
                  <Clock className="w-4 h-4 text-subText" />
                </button>
                {editClockOut && (
                  <button
                    type="button"
                    onClick={() => setEditClockOut("")}
                    className="text-[11px] text-rose-500 hover:underline mt-1"
                  >
                    퇴근 미완료(근무 중)로 초기화
                  </button>
                )}
              </div>

              {modalError && (
                <p className="text-xs text-rose-500 text-center font-medium">
                  {modalError}
                </p>
              )}

              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingRecord(null)}
                >
                  취소
                </Button>
                <Button type="submit" variant="primary">
                  기록 보완 저장
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 세련된 휠/타임피커 모달 연동 */}
      <TimePickerModal
        isOpen={timePickerTarget !== null}
        title={timePickerTarget === "in" ? "출근 시간 선택" : "퇴근 시간 선택"}
        initialValue={
          timePickerTarget === "in" ? editClockIn || "09:00" : editClockOut || "18:00"
        }
        onClose={() => setTimePickerTarget(null)}
        onSelect={(time) => {
          if (timePickerTarget === "in") {
            setEditClockIn(time);
          } else if (timePickerTarget === "out") {
            setEditClockOut(time);
          }
        }}
      />
    </div>
  );
}
