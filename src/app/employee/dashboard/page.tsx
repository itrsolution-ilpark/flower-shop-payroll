"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Navbar from "@/components/Navbar";
import Button from "@/components/Button";

interface StaffUser {
  id: string;
  name: string;
  is_admin: boolean;
  hourly_wage: number;
}

interface AttendanceRecord {
  id: string;
  work_date: string;
  clock_in: string;
  clock_out: string | null;
}

export default function EmployeeDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<StaffUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const [workDate, setWorkDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [clockIn, setClockIn] = useState<string>("09:00");
  const [clockOut, setClockOut] = useState<string>("18:00");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [successMsg, setSuccessMsg] = useState<string>("");

  const [attendanceList, setAttendanceList] = useState<AttendanceRecord[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string>(
    new Date().toISOString().slice(0, 7) // YYYY-MM
  );

  useEffect(() => {
    const rawUser = localStorage.getItem("flower_shop_user");
    if (!rawUser) {
      router.push("/");
      return;
    }
    const parsedUser: StaffUser = JSON.parse(rawUser);
    setUser(parsedUser);
    fetchAttendance(parsedUser.id, selectedMonth);
  }, [selectedMonth, router]);

  const fetchAttendance = async (staffId: string, month: string) => {
    setLoading(true);
    try {
      const startDate = `${month}-01`;
      const [year, m] = month.split("-").map(Number);
      const lastDay = new Date(year, m, 0).getDate();
      const endDate = `${month}-${lastDay}`;

      const { data, error } = await supabase
        .from("attendance")
        .select("*")
        .eq("staff_id", staffId)
        .gte("work_date", startDate)
        .lte("work_date", endDate)
        .order("work_date", { ascending: false });

      if (error) {
        console.error("출퇴근 기록 조회 오류:", error);
      } else if (data) {
        setAttendanceList(data);
      }
    } catch (err) {
      console.error("예외 발생:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAttendanceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!user) return;

    if (!workDate || !clockIn) {
      setErrorMsg("근무 일자와 출근 시간은 필수입니다.");
      return;
    }

    if (clockOut && clockIn > clockOut) {
      setErrorMsg("퇴근 시간은 출근 시간보다 빠를 수 없습니다.");
      return;
    }

    try {
      const { data: existing } = await supabase
        .from("attendance")
        .select("id")
        .eq("staff_id", user.id)
        .eq("work_date", workDate)
        .single();

      let error;
      if (existing) {
        const res = await supabase
          .from("attendance")
          .update({
            clock_in: clockIn,
            clock_out: clockOut || null,
          })
          .eq("id", existing.id);
        error = res.error;
      } else {
        const res = await supabase.from("attendance").insert([
          {
            staff_id: user.id,
            work_date: workDate,
            clock_in: clockIn,
            clock_out: clockOut || null,
          },
        ]);
        error = res.error;
      }

      if (error) {
        console.error("출퇴근 저장 오류:", error);
        setErrorMsg("출퇴근 기록 저장 중 오류가 발생했습니다.");
        return;
      }

      setSuccessMsg("출퇴근 기록이 성공적으로 저장되었습니다.");
      fetchAttendance(user.id, selectedMonth);
    } catch (err) {
      console.error("예외 발생:", err);
      setErrorMsg("저장 중 오류가 발생했습니다.");
    }
  };

  const calculateWorkHours = (inTime: string, outTime: string | null) => {
    if (!outTime) return 0;
    const [inH, inM] = inTime.split(":").map(Number);
    const [outH, outM] = outTime.split(":").map(Number);

    const inMinutes = inH * 60 + inM;
    const outMinutes = outH * 60 + outM;

    const diffMinutes = outMinutes - inMinutes;
    if (diffMinutes <= 0) return 0;

    return diffMinutes / 60;
  };

  const totalMonthlyHours = attendanceList.reduce((acc, cur) => {
    return acc + calculateWorkHours(cur.clock_in, cur.clock_out);
  }, 0);

  const estimatedPay = Math.round(
    totalMonthlyHours * (user?.hourly_wage || 0)
  );

  if (!user) return null;

  return (
    <div className="flex flex-col flex-1">
      <Navbar title="직원 마이페이지" />

      <div className="p-4 flex-1 space-y-6">
        <div className="bg-background p-4 rounded-lg border border-secondary flex justify-between items-center">
          <div>
            <p className="text-sm font-semibold text-textColor">
              환영합니다, <span className="text-primary">{user.name}</span>님!
            </p>
            <p className="text-xs text-gray-600 mt-1">
              현재 시급: {user.hourly_wage.toLocaleString()}원
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500">이번 달 예상 급여</p>
            <p className="text-lg font-bold text-primary">
              {estimatedPay.toLocaleString()}원
            </p>
            <p className="text-xs text-gray-500">
              총 근무: {totalMonthlyHours.toFixed(1)}시간
            </p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <h2 className="text-md font-bold text-textColor mb-3">
            출퇴근 시간 등록 / 수정
          </h2>
          <form onSubmit={handleAttendanceSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-textColor mb-1">
                근무 일자
              </label>
              <input
                type="date"
                value={workDate}
                onChange={(e) => setWorkDate(e.target.value)}
                className="w-full h-10 px-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm bg-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-textColor mb-1">
                  출근 시간
                </label>
                <input
                  type="time"
                  value={clockIn}
                  onChange={(e) => setClockIn(e.target.value)}
                  className="w-full h-10 px-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-textColor mb-1">
                  퇴근 시간
                </label>
                <input
                  type="time"
                  value={clockOut}
                  onChange={(e) => setClockOut(e.target.value)}
                  className="w-full h-10 px-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm bg-white"
                />
              </div>
            </div>

            {errorMsg && (
              <p className="text-xs text-errorColor font-medium">{errorMsg}</p>
            )}
            {successMsg && (
              <p className="text-xs text-primary font-medium">{successMsg}</p>
            )}

            <Button type="submit" variant="primary">
              저장하기
            </Button>
          </form>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-md font-bold text-textColor">
              이번 달 근무 내역
            </h2>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="h-8 px-2 border border-gray-300 rounded text-xs bg-white"
            />
          </div>

          {loading ? (
            <p className="text-center py-4 text-xs text-gray-500">로딩 중...</p>
          ) : attendanceList.length === 0 ? (
            <p className="text-center py-4 text-xs text-gray-500">
              기록된 근무 내역이 없습니다.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-gray-200 text-gray-600">
                    <th className="py-2 px-1">날짜</th>
                    <th className="py-2 px-1">출근</th>
                    <th className="py-2 px-1">퇴근</th>
                    <th className="py-2 px-1 text-right">근무시간</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {attendanceList.map((item) => {
                    const hrs = calculateWorkHours(
                      item.clock_in,
                      item.clock_out
                    );
                    return (
                      <tr key={item.id}>
                        <td className="py-2 px-1 font-medium text-textColor">
                          {item.work_date}
                        </td>
                        <td className="py-2 px-1 text-gray-600">
                          {item.clock_in.slice(0, 5)}
                        </td>
                        <td className="py-2 px-1 text-gray-600">
                          {item.clock_out ? item.clock_out.slice(0, 5) : "-"}
                        </td>
                        <td className="py-2 px-1 text-right font-semibold text-primary">
                          {hrs > 0 ? `${hrs.toFixed(1)}시간` : "-"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
