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

interface Staff {
  id: string;
  name: string;
}

interface AttendanceRecord {
  id: string;
  staff_id: string;
  work_date: string;
  clock_in: string;
  clock_out: string | null;
  staff?: {
    name: string;
  };
}

export default function AdminAttendancePage() {
  const router = useRouter();
  const [user, setUser] = useState<StaffUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [attendanceList, setAttendanceList] = useState<AttendanceRecord[]>([]);
  const [selectedStaffId, setSelectedStaffId] = useState<string>("all");
  const [selectedMonth, setSelectedMonth] = useState<string>(
    new Date().toISOString().slice(0, 7)
  );

  const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(null);
  const [editWorkDate, setEditWorkDate] = useState<string>("");
  const [editClockIn, setEditClockIn] = useState<string>("");
  const [editClockOut, setEditClockOut] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [successMsg, setSuccessMsg] = useState<string>("");

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
    fetchInitialData();
  }, [router]);

  useEffect(() => {
    if (user) {
      fetchAttendanceRecords();
    }
  }, [selectedStaffId, selectedMonth]);

  const fetchInitialData = async () => {
    try {
      const { data, error } = await supabase
        .from("staff")
        .select("id, name")
        .order("name", { ascending: true });

      if (error) {
        console.error("직원 목록 조회 오류:", error);
      } else if (data) {
        setStaffList(data);
      }
      await fetchAttendanceRecords();
    } catch (err) {
      console.error("예외 발생:", err);
    }
  };

  const fetchAttendanceRecords = async () => {
    setLoading(true);
    try {
      const startDate = `${selectedMonth}-01`;
      const [year, m] = selectedMonth.split("-").map(Number);
      const lastDay = new Date(year, m, 0).getDate();
      const endDate = `${selectedMonth}-${lastDay}`;

      let query = supabase
        .from("attendance")
        .select("*, staff:staff_id(name)")
        .gte("work_date", startDate)
        .lte("work_date", endDate)
        .order("work_date", { ascending: false });

      if (selectedStaffId !== "all") {
        query = query.eq("staff_id", selectedStaffId);
      }

      const { data, error } = await query;

      if (error) {
        console.error("출퇴근 기록 조회 오류:", error);
      } else if (data) {
        setAttendanceList(data as unknown as AttendanceRecord[]);
      }
    } catch (err) {
      console.error("예외 발생:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenEditModal = (record: AttendanceRecord) => {
    setEditingRecord(record);
    setEditWorkDate(record.work_date);
    setEditClockIn(record.clock_in);
    setEditClockOut(record.clock_out || "");
    setErrorMsg("");
    setSuccessMsg("");
  };

  const handleCloseModal = () => {
    setEditingRecord(null);
    setErrorMsg("");
  };

  const handleUpdateRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!editingRecord) return;

    if (!editWorkDate || !editClockIn) {
      setErrorMsg("근무 일자와 출근 시간은 필수입니다.");
      return;
    }

    if (editClockOut && editClockIn > editClockOut) {
      setErrorMsg("퇴근 시간은 출근 시간보다 빠를 수 없습니다.");
      return;
    }

    try {
      const { error } = await supabase
        .from("attendance")
        .update({
          work_date: editWorkDate,
          clock_in: editClockIn,
          clock_out: editClockOut || null,
        })
        .eq("id", editingRecord.id);

      if (error) {
        console.error("기록 수정 오류:", error);
        setErrorMsg("근무 기록 수정 중 오류가 발생했습니다.");
        return;
      }

      setSuccessMsg("근무 기록이 수정되었습니다.");
      setEditingRecord(null);
      fetchAttendanceRecords();
    } catch (err) {
      console.error("예외 발생:", err);
      setErrorMsg("수정 중 오류가 발생했습니다.");
    }
  };

  const handleDeleteRecord = async (id: string) => {
    if (!confirm("정말 이 근무 기록을 삭제하시겠습니까?")) return;

    try {
      const { error } = await supabase.from("attendance").delete().eq("id", id);

      if (error) {
        console.error("기록 삭제 오류:", error);
        alert("근무 기록 삭제 중 오류가 발생했습니다.");
        return;
      }

      setSuccessMsg("근무 기록이 삭제되었습니다.");
      fetchAttendanceRecords();
    } catch (err) {
      console.error("예외 발생:", err);
      alert("삭제 중 오류가 발생했습니다.");
    }
  };

  if (!user) return null;

  return (
    <div className="flex flex-col flex-1">
      <Navbar title="근무 기록 관리" />

      <div className="p-4 flex-1 space-y-4">
        <div className="bg-background p-4 rounded-lg border border-secondary space-y-3">
          <div className="flex justify-between items-center">
            <h2 className="text-md font-bold text-textColor">필터 옵션</h2>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <select
              value={selectedStaffId}
              onChange={(e) => setSelectedStaffId(e.target.value)}
              className="w-full h-10 px-3 border border-gray-300 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="all">전체 직원 보기</option>
              {staffList.map((staff) => (
                <option key={staff.id} value={staff.id}>
                  {staff.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {successMsg && (
          <p className="text-sm text-primary text-center font-medium bg-green-50 p-2 rounded-lg">
            {successMsg}
          </p>
        )}

        {loading ? (
          <div className="text-center py-12 text-gray-500">로딩 중...</div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-background border-b border-gray-200 text-xs text-textColor">
                    <th className="p-3 font-semibold">날짜</th>
                    <th className="p-3 font-semibold">이름</th>
                    <th className="p-3 font-semibold">출근</th>
                    <th className="p-3 font-semibold">퇴근</th>
                    <th className="p-3 font-semibold text-center">관리</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm">
                  {attendanceList.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-6 text-center text-gray-500">
                        근무 기록이 없습니다.
                      </td>
                    </tr>
                  ) : (
                    attendanceList.map((record) => (
                      <tr key={record.id} className="hover:bg-gray-50">
                        <td className="p-3 text-textColor font-medium">
                          {record.work_date}
                        </td>
                        <td className="p-3 text-textColor">
                          {record.staff?.name || "알 수 없음"}
                        </td>
                        <td className="p-3 text-gray-600">{record.clock_in}</td>
                        <td className="p-3 text-gray-600">
                          {record.clock_out || "근무 중"}
                        </td>
                        <td className="p-3 text-center space-x-2">
                          <button
                            onClick={() => handleOpenEditModal(record)}
                            className="text-xs bg-primary text-white px-2.5 py-1.5 rounded hover:bg-opacity-90 font-medium"
                          >
                            수정
                          </button>
                          <button
                            onClick={() => handleDeleteRecord(record.id)}
                            className="text-xs bg-errorColor text-white px-2.5 py-1.5 rounded hover:bg-opacity-90 font-medium"
                          >
                            삭제
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
      </div>

      {editingRecord && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-sm rounded-lg p-6 shadow-xl space-y-4">
            <h3 className="text-lg font-bold text-textColor">근무 기록 수정</h3>
            <form onSubmit={handleUpdateRecord} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-textColor mb-1">
                  근무 일자
                </label>
                <input
                  type="date"
                  value={editWorkDate}
                  onChange={(e) => setEditWorkDate(e.target.value)}
                  className="w-full h-10 px-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-textColor mb-1">
                  출근 시간
                </label>
                <input
                  type="time"
                  value={editClockIn}
                  onChange={(e) => setEditClockIn(e.target.value)}
                  className="w-full h-10 px-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-textColor mb-1">
                  퇴근 시간
                </label>
                <input
                  type="time"
                  value={editClockOut}
                  onChange={(e) => setEditClockOut(e.target.value)}
                  className="w-full h-10 px-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white"
                />
              </div>

              {errorMsg && (
                <p className="text-xs text-errorColor font-medium text-center">
                  {errorMsg}
                </p>
              )}

              <div className="flex space-x-2 pt-2">
                <Button type="submit" variant="primary">
                  저장
                </Button>
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="w-full h-12 bg-gray-200 text-textColor rounded-lg font-bold hover:bg-gray-300 transition-colors"
                >
                  취소
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
