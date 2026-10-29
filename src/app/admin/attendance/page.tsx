"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import Navbar from "@/components/Navbar";
import Button from "@/components/ui/Button";
import { calculateMinutes, formatMinutesToHoursAndMinutes, calculateSalary } from "@/lib/utils";

interface StaffUser {
  id: string;
  shop_id: string;
  name: string;
  is_admin: boolean;
  hourly_wage: number;
}

interface Staff {
  id: string;
  name: string;
  hourly_wage: number;
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
  };
}

interface StaffSummary {
  id: string;
  name: string;
  hourly_wage: number;
  totalMinutes: number;
  totalPay: number;
}

export default function AdminAttendancePage() {
  const router = useRouter();
  const [user, setUser] = useState<StaffUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [attendanceList, setAttendanceList] = useState<AttendanceRecord[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string>(
    new Date().toISOString().slice(0, 7)
  );

  // 수동 수정 모달
  const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(null);
  const [editWorkDate, setEditWorkDate] = useState<string>("");
  const [editClockIn, setEditClockIn] = useState<string>("");
  const [editClockOut, setEditClockOut] = useState<string>("");
  const [modalError, setModalError] = useState<string>("");

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
      const { data: staffData } = await supabase
        .from("staff")
        .select("id, name, hourly_wage")
        .eq("shop_id", shopId)
        .eq("is_admin", false)
        .order("name", { ascending: true });

      const staff = staffData || [];
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
      const endDate = `${month}-${lastDay}`;

      const { data: attData } = await supabase
        .from("attendance")
        .select("*, staff:staff_id(name, hourly_wage)")
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
    setEditClockIn(rec.clock_in ? rec.clock_in.slice(0, 5) : "");
    setEditClockOut(rec.clock_out ? rec.clock_out.slice(0, 5) : "");
    setModalError("");
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError("");

    if (!editingRecord) return;
    if (!editWorkDate || !editClockIn) {
      setModalError("근무 일자와 출근 시간은 필수입니다.");
      return;
    }

    if (editClockOut && editClockIn > editClockOut) {
      setModalError("퇴근 시간은 출근 시간보다 빠를 수 없습니다.");
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
      hourly_wage: st.hourly_wage,
      totalMinutes,
      totalPay,
    };
  });

  const grandTotalPay = summaries.reduce((acc, cur) => acc + cur.totalPay, 0);

  return (
    <div className="flex flex-col flex-1">
      <Navbar title="대표 전용 근무 및 급여 정산 화면" />

      <div className="p-4 flex-1 space-y-6">
        <div className="flex justify-between items-center bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <div>
            <h2 className="text-sm font-bold text-textColor">월 선택 셀렉트박스</h2>
            <p className="text-xs text-gray-500">조회할 정산 연월을 선택하세요.</p>
          </div>
          <div>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        {/* 직원별 월간 총 근무시간, 총 지급 급여 요약 표 */}
        <section className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-3 border-b bg-slate-50 font-bold text-xs text-textColor">
            직원별 월간 총 근무시간 및 총 지급 급여 요약 표
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 text-gray-700">
                  <th className="p-3 font-semibold">이름</th>
                  <th className="p-3 font-semibold text-right">총 근무시간</th>
                  <th className="p-3 font-semibold text-right">시급</th>
                  <th className="p-3 font-semibold text-right">총 지급 급여</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {summaries.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-4 text-center text-gray-400">
                      등록된 직원이 없습니다.
                    </td>
                  </tr>
                ) : (
                  summaries.map((sm) => (
                    <tr key={sm.id} className="hover:bg-slate-50">
                      <td className="p-3 font-medium text-textColor">{sm.name}</td>
                      <td className="p-3 text-right text-gray-600">
                        {formatMinutesToHoursAndMinutes(sm.totalMinutes)}
                      </td>
                      <td className="p-3 text-right text-gray-600">
                        {sm.hourly_wage.toLocaleString()}원
                      </td>
                      <td className="p-3 text-right font-bold text-emerald">
                        {sm.totalPay.toLocaleString()}원
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {summaries.length > 0 && (
            <div className="p-3 bg-slate-50 border-t flex justify-between items-center text-xs font-bold text-textColor">
              <span>총 급여 지급 합계</span>
              <span className="text-emerald text-sm font-extrabold">
                {grandTotalPay.toLocaleString()}원
              </span>
            </div>
          )}
        </section>

        {/* 직원별 일자별 출퇴근 기록 조회 및 수동 수정 모달 */}
        <section className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-3 border-b bg-slate-50 font-bold text-xs text-textColor">
            일자별 출퇴근 기록 조회 및 수동 수정
          </div>

          {loading ? (
            <p className="text-xs text-center py-6 text-gray-500">조회 중...</p>
          ) : attendanceList.length === 0 ? (
            <p className="text-xs text-center py-6 text-gray-400">이번 달 출퇴근 기록이 없습니다.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-gray-700">
                    <th className="p-2.5 font-semibold">날짜</th>
                    <th className="p-2.5 font-semibold">이름</th>
                    <th className="p-2.5 font-semibold">출근</th>
                    <th className="p-2.5 font-semibold">퇴근</th>
                    <th className="p-2.5 font-semibold text-right">근무시간</th>
                    <th className="p-2.5 font-semibold text-center">수정</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {attendanceList.map((rec) => {
                    const mins = rec.clock_out
                      ? rec.total_minutes || calculateMinutes(rec.clock_in, rec.clock_out)
                      : 0;
                    return (
                      <tr key={rec.id} className="hover:bg-slate-50">
                        <td className="p-2.5 font-medium">{rec.work_date}</td>
                        <td className="p-2.5">{rec.staff?.name || "-"}</td>
                        <td className="p-2.5">{rec.clock_in ? rec.clock_in.slice(0, 5) : "-"}</td>
                        <td className="p-2.5">
                          {rec.clock_out ? rec.clock_out.slice(0, 5) : (
                            <span className="text-emerald font-semibold">근무 중</span>
                          )}
                        </td>
                        <td className="p-2.5 text-right font-medium">
                          {rec.clock_out ? formatMinutesToHoursAndMinutes(mins) : "-"}
                        </td>
                        <td className="p-2.5 text-center">
                          <button
                            onClick={() => handleOpenEdit(rec)}
                            className="px-2 py-1 bg-primary text-white text-[11px] rounded hover:bg-[#172554]"
                          >
                            수정
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

      {/* 수동 수정 모달 */}
      {editingRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm bg-white rounded-lg p-5 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-textColor">
              출퇴근 기록 수동 수정 ({editingRecord.staff?.name})
            </h3>
            <form onSubmit={handleSaveEdit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-textColor mb-1">
                  근무 일자
                </label>
                <input
                  type="date"
                  value={editWorkDate}
                  onChange={(e) => setEditWorkDate(e.target.value)}
                  className="w-full h-10 px-3 border border-gray-300 rounded text-xs bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-textColor mb-1">
                  출근 시간 (HH:mm)
                </label>
                <input
                  type="time"
                  value={editClockIn}
                  onChange={(e) => setEditClockIn(e.target.value)}
                  className="w-full h-10 px-3 border border-gray-300 rounded text-xs bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-textColor mb-1">
                  퇴근 시간 (HH:mm)
                </label>
                <input
                  type="time"
                  value={editClockOut}
                  onChange={(e) => setEditClockOut(e.target.value)}
                  className="w-full h-10 px-3 border border-gray-300 rounded text-xs bg-white"
                />
              </div>

              {modalError && (
                <p className="text-xs text-errorColor text-center font-medium">
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
                  수정 저장
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
