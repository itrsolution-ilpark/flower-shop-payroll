"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import Navbar from "@/components/Navbar";
import Button from "@/components/ui/Button";
import { calculateMinutes, formatMinutesToHoursAndMinutes, calculateSalary } from "@/lib/utils";

interface StaffUser {
  id: string;
  name: string;
  shop_id: string;
  is_admin: boolean;
  hourly_wage: number;
}

interface AttendanceRecord {
  id: string;
  work_date: string;
  clock_in: string;
  clock_out: string | null;
  total_minutes: number;
}

export default function EmployeeDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<StaffUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // 당일 출퇴근 상태
  const todayStr = new Date().toISOString().split("T")[0];
  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<string>("");

  // 최근 30일 내역
  const [recentRecords, setRecentRecords] = useState<AttendanceRecord[]>([]);

  // PIN 변경 모달
  const [isPinModalOpen, setIsPinModalOpen] = useState<boolean>(false);
  const [newPin, setNewPin] = useState<string>("");
  const [confirmNewPin, setConfirmNewPin] = useState<string>("");
  const [pinError, setPinError] = useState<string>("");

  useEffect(() => {
    const raw = localStorage.getItem("flower_shop_user");
    if (!raw) {
      router.push("/");
      return;
    }
    const parsed: StaffUser = JSON.parse(raw);
    setUser(parsed);
    fetchEmployeeData(parsed.id);
  }, [router]);

  const fetchEmployeeData = async (staffId: string) => {
    setLoading(true);
    try {
      // 최신 시급 재확인
      const { data: currentStaff } = await supabase
        .from("staff")
        .select("hourly_wage")
        .eq("id", staffId)
        .single();

      if (currentStaff) {
        setUser((prev) => (prev ? { ...prev, hourly_wage: currentStaff.hourly_wage } : prev));
      }

      // 최근 30일 기록
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const startDate = thirtyDaysAgo.toISOString().split("T")[0];

      const { data: records } = await supabase
        .from("attendance")
        .select("*")
        .eq("staff_id", staffId)
        .gte("work_date", startDate)
        .order("work_date", { ascending: false });

      const list = (records || []) as AttendanceRecord[];
      setRecentRecords(list);

      // 당일 기록
      const today = list.find((r) => r.work_date === todayStr);
      setTodayRecord(today || null);
    } catch (err) {
      console.error("예외 발생:", err);
    } finally {
      setLoading(false);
    }
  };

  const getNowHHmm = (): string => {
    const now = new Date();
    const h = now.getHours().toString().padStart(2, "0");
    const m = now.getMinutes().toString().padStart(2, "0");
    return `${h}:${m}`;
  };

  const handleClockIn = async () => {
    if (!user) return;
    setActionLoading(true);
    setMessage("");

    const nowTime = getNowHHmm();
    try {
      const { data, error } = await supabase
        .from("attendance")
        .insert([
          {
            staff_id: user.id,
            work_date: todayStr,
            clock_in: nowTime,
            clock_out: null,
            total_minutes: 0,
          },
        ])
        .select()
        .single();

      if (error) {
        setMessage("출근 등록 중 오류가 발생했습니다.");
      } else if (data) {
        setTodayRecord(data as AttendanceRecord);
        setMessage(`출근 등록 완료 (${nowTime})`);
        fetchEmployeeData(user.id);
      }
    } catch (err) {
      console.error("예외 발생:", err);
      setMessage("출근 처리 중 오류가 발생했습니다.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleClockOut = async () => {
    if (!user || !todayRecord) return;
    setActionLoading(true);
    setMessage("");

    const nowTime = getNowHHmm();
    const minutes = calculateMinutes(todayRecord.clock_in, nowTime);

    try {
      const { data, error } = await supabase
        .from("attendance")
        .update({
          clock_out: nowTime,
          total_minutes: minutes,
        })
        .eq("id", todayRecord.id)
        .select()
        .single();

      if (error) {
        setMessage("퇴근 등록 중 오류가 발생했습니다.");
      } else if (data) {
        setTodayRecord(data as AttendanceRecord);
        setMessage(`퇴근 등록 완료 (${nowTime})`);
        fetchEmployeeData(user.id);
      }
    } catch (err) {
      console.error("예외 발생:", err);
      setMessage("퇴근 처리 중 오류가 발생했습니다.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleChangePin = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinError("");

    if (!user) return;

    if (!/^[0-9]{4}$/.test(newPin)) {
      setPinError("새 PIN 번호는 4자리 숫자여야 합니다.");
      return;
    }

    if (newPin !== confirmNewPin) {
      setPinError("비밀번호 확인이 일치하지 않습니다.");
      return;
    }

    try {
      const { error } = await supabase
        .from("staff")
        .update({ pin_code: newPin })
        .eq("id", user.id);

      if (error) {
        setPinError("PIN 변경 중 오류가 발생했습니다.");
        return;
      }

      alert("PIN 번호가 성공적으로 변경되었습니다.");
      setIsPinModalOpen(false);
      setNewPin("");
      setConfirmNewPin("");
    } catch (err) {
      console.error("예외 발생:", err);
      setPinError("처리 중 오류가 발생했습니다.");
    }
  };

  if (!user) return null;

  // 이번 달 (YYYY-MM) 근무 요약
  const currentMonthPrefix = todayStr.slice(0, 7);
  const thisMonthRecords = recentRecords.filter(
    (r) => r.work_date.startsWith(currentMonthPrefix) && r.clock_out
  );
  const totalMonthlyMinutes = thisMonthRecords.reduce((acc, cur) => {
    return acc + (cur.total_minutes || calculateMinutes(cur.clock_in, cur.clock_out));
  }, 0);
  const estimatedPay = calculateSalary(totalMonthlyMinutes, user.hourly_wage);

  return (
    <div className="flex flex-col flex-1">
      <Navbar title="직원 마이페이지" />

      <div className="p-4 flex-1 space-y-5">
        {/* 상단: 직원 이름, 시급 안내 */}
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-textColor">
              {user.name} 님
            </h2>
            <p className="text-xs text-gray-600 mt-0.5">
              시급: {user.hourly_wage.toLocaleString()}원
            </p>
          </div>
          <button
            onClick={() => setIsPinModalOpen(true)}
            className="px-2.5 py-1.5 border border-gray-300 rounded text-xs text-gray-700 hover:bg-gray-50"
          >
            [PIN 번호 변경]
          </button>
        </div>

        {/* 당일 출퇴근 카드: [출근하기] / [퇴근하기] 원클릭 버튼 및 실시간 상태 표시 */}
        <section className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-textColor">당일 출퇴근 카드</h3>
            <span className="text-xs text-gray-500">{todayStr}</span>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg text-center space-y-1">
            <p className="text-xs text-gray-500">현재 상태</p>
            {!todayRecord ? (
              <p className="text-sm font-bold text-gray-600">출근 전</p>
            ) : !todayRecord.clock_out ? (
              <p className="text-sm font-bold text-emerald">
                근무 중 (출근 {todayRecord.clock_in.slice(0, 5)})
              </p>
            ) : (
              <p className="text-sm font-bold text-primary">
                퇴근 완료 ({todayRecord.clock_in.slice(0, 5)} ~ {todayRecord.clock_out.slice(0, 5)})
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="secondary"
              onClick={handleClockIn}
              disabled={actionLoading || !!todayRecord}
            >
              [출근하기]
            </Button>
            <Button
              variant="primary"
              onClick={handleClockOut}
              disabled={actionLoading || !todayRecord || !!todayRecord.clock_out}
            >
              [퇴근하기]
            </Button>
          </div>

          {message && (
            <p className="text-xs text-center font-medium text-emerald">{message}</p>
          )}
        </section>

        {/* 이번 달 근무 요약: 총 근무 시간 (00시간 00분), 총 예상 급여 (원 단위 포맷팅) */}
        <section className="bg-gradient-to-br from-blue-900 to-indigo-900 text-white p-5 rounded-lg shadow-sm space-y-3">
          <h3 className="text-xs font-semibold text-blue-200">이번 달 근무 요약</h3>
          <div className="flex justify-between items-end">
            <div>
              <p className="text-xs text-blue-200">총 근무 시간</p>
              <p className="text-lg font-bold">
                {formatMinutesToHoursAndMinutes(totalMonthlyMinutes)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-blue-200">총 예상 급여</p>
              <p className="text-xl font-extrabold text-amber-300">
                {estimatedPay.toLocaleString()}원
              </p>
            </div>
          </div>
        </section>

        {/* 하단: 최근 30일 출퇴근 일자/시간 테이블 */}
        <section className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-3 border-b bg-slate-50 font-bold text-xs text-textColor">
            최근 30일 출퇴근 일자/시간 테이블
          </div>
          {loading ? (
            <p className="text-xs text-center py-6 text-gray-500">로딩 중...</p>
          ) : recentRecords.length === 0 ? (
            <p className="text-xs text-center py-6 text-gray-400">기록된 출퇴근 내역이 없습니다.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-gray-700">
                    <th className="p-2.5 font-semibold">일자</th>
                    <th className="p-2.5 font-semibold">출근</th>
                    <th className="p-2.5 font-semibold">퇴근</th>
                    <th className="p-2.5 font-semibold text-right">근무시간</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {recentRecords.map((r) => {
                    const mins = r.clock_out
                      ? r.total_minutes || calculateMinutes(r.clock_in, r.clock_out)
                      : 0;
                    return (
                      <tr key={r.id} className="hover:bg-slate-50">
                        <td className="p-2.5 font-medium">{r.work_date}</td>
                        <td className="p-2.5">{r.clock_in ? r.clock_in.slice(0, 5) : "-"}</td>
                        <td className="p-2.5">
                          {r.clock_out ? r.clock_out.slice(0, 5) : (
                            <span className="text-emerald font-semibold">근무 중</span>
                          )}
                        </td>
                        <td className="p-2.5 text-right font-medium">
                          {r.clock_out ? formatMinutesToHoursAndMinutes(mins) : "-"}
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

      {/* [PIN 번호 변경] 모달 */}
      {isPinModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm bg-white rounded-lg p-5 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-textColor">PIN 번호 변경</h3>
            <form onSubmit={handleChangePin} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-textColor mb-1">
                  새 4자리 PIN
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value.replace(/[^0-9]/g, ""))}
                  placeholder="••••"
                  className="w-full h-10 px-3 border border-gray-300 rounded text-center tracking-widest text-base font-bold bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-textColor mb-1">
                  새 PIN 확인
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  value={confirmNewPin}
                  onChange={(e) => setConfirmNewPin(e.target.value.replace(/[^0-9]/g, ""))}
                  placeholder="••••"
                  className="w-full h-10 px-3 border border-gray-300 rounded text-center tracking-widest text-base font-bold bg-white"
                />
              </div>

              {pinError && (
                <p className="text-xs text-errorColor text-center font-medium">
                  {pinError}
                </p>
              )}

              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsPinModalOpen(false)}
                >
                  취소
                </Button>
                <Button type="submit" variant="primary">
                  변경 저장
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
