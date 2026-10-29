"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import Navbar from "@/components/Navbar";
import Button from "@/components/ui/Button";
import TimePickerModal from "@/components/TimePickerModal";
import { calculateMinutes, formatMinutesToHoursAndMinutes, calculateSalary, formatCurrency } from "@/lib/utils";
import { Calendar, Clock, Lock, LogOut, CheckCircle2, AlertCircle, Edit2 } from "lucide-react";

interface StaffUser {
  id: string;
  name: string;
  shop_id: string;
  is_admin: boolean;
  hourly_wage: number;
}

interface AttendanceRecord {
  id: string;
  staff_id: string;
  work_date: string;
  clock_in: string;
  clock_out: string | null;
  total_minutes: number;
}

export default function EmployeeDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<StaffUser | null>(null);
  const [shopName, setShopName] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);

  // 날짜 선택기 (기본값 오늘)
  const todayStr = new Date().toISOString().split("T")[0];
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  // 세련된 휠/타임피커 연동 입력값
  const [clockInInput, setClockInInput] = useState<string>("09:00");
  const [clockOutInput, setClockOutInput] = useState<string>("");
  const [timePickerTarget, setTimePickerTarget] = useState<"in" | "out" | null>(null);

  // 현재 선택된 날짜의 근태 기록
  const [currentDateRecord, setCurrentDateRecord] = useState<AttendanceRecord | null>(null);

  // 전체 근무 이력 (최근 기록)
  const [allRecords, setAllRecords] = useState<AttendanceRecord[]>([]);

  // 알림 메시지
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // PIN 번호 변경 모달
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
    fetchShopAndEmployeeData(parsed.id, parsed.shop_id);
  }, [router]);

  // 선택된 날짜가 변경되거나 이력 목록이 갱신될 때 해당 날짜의 인풋 세팅
  useEffect(() => {
    const found = allRecords.find((r) => r.work_date === selectedDate);
    setCurrentDateRecord(found || null);
    if (found) {
      setClockInInput(found.clock_in ? found.clock_in.slice(0, 5) : "09:00");
      setClockOutInput(found.clock_out ? found.clock_out.slice(0, 5) : "");
    } else {
      if (selectedDate === todayStr) {
        setClockInInput("09:00");
        setClockOutInput("");
      } else {
        setClockInInput("09:00");
        setClockOutInput("");
      }
    }
  }, [selectedDate, allRecords, todayStr]);

  const fetchShopAndEmployeeData = async (staffId: string, shopId: string) => {
    setLoading(true);
    try {
      const { data: sData } = await supabase
        .from("shops")
        .select("name")
        .eq("id", shopId)
        .single();
      if (sData) {
        setShopName(sData.name);
      }

      // 최신 시급 및 재직 상태 재확인
      const { data: currentStaff } = await supabase
        .from("staff")
        .select("hourly_wage, status")
        .eq("id", staffId)
        .single();

      if (currentStaff) {
        if (currentStaff.status === "resigned") {
          alert("퇴사 처리된 계정입니다. 로그인 화면으로 이동합니다.");
          localStorage.removeItem("flower_shop_user");
          router.push(`/shop/${shopId}`);
          return;
        }
        setUser((prev) => (prev ? { ...prev, hourly_wage: currentStaff.hourly_wage } : prev));
      }

      // 근무 기록 전체 조회
      const { data: records, error } = await supabase
        .from("attendance")
        .select("*")
        .eq("staff_id", staffId)
        .order("work_date", { ascending: false });

      if (error) {
        console.error("근태 기록 조회 오류:", error);
      } else if (records) {
        setAllRecords(records as AttendanceRecord[]);
      }
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

  // '출근 기록' 버튼 클릭 (선택된 날짜에 현재 시간으로 출근 기록)
  const handleQuickClockIn = async () => {
    if (!user) return;
    setFeedbackMsg(null);
    const nowTime = getNowHHmm();
    setClockInInput(nowTime);

    try {
      if (currentDateRecord) {
        // 기존 레코드에 출근 시간 갱신
        const minutes = currentDateRecord.clock_out
          ? calculateMinutes(nowTime, currentDateRecord.clock_out.slice(0, 5))
          : 0;

        const { error } = await supabase
          .from("attendance")
          .update({
            clock_in: nowTime,
            total_minutes: minutes,
          })
          .eq("id", currentDateRecord.id);

        if (error) {
          setFeedbackMsg({ text: "출근 기록 갱신 중 오류가 발생했습니다.", type: "error" });
          return;
        }
      } else {
        const { error } = await supabase.from("attendance").insert([
          {
            staff_id: user.id,
            work_date: selectedDate,
            clock_in: nowTime,
            clock_out: null,
            total_minutes: 0,
          },
        ]);

        if (error) {
          setFeedbackMsg({ text: "출근 기록 저장 중 오류가 발생했습니다.", type: "error" });
          return;
        }
      }

      setFeedbackMsg({ text: `${selectedDate} 출근 시간이 ${nowTime}으로 기록되었습니다.`, type: "success" });
      fetchShopAndEmployeeData(user.id, user.shop_id);
    } catch (err) {
      console.error("출근 처리 예외:", err);
      setFeedbackMsg({ text: "출근 처리 중 오류가 발생했습니다.", type: "error" });
    }
  };

  // '퇴근 기록' 버튼 클릭 (선택된 날짜에 현재 시간으로 퇴근 기록)
  const handleQuickClockOut = async () => {
    if (!user) return;
    setFeedbackMsg(null);
    const nowTime = getNowHHmm();
    setClockOutInput(nowTime);

    const inTime = currentDateRecord ? currentDateRecord.clock_in.slice(0, 5) : clockInInput;
    if (!inTime) {
      setFeedbackMsg({ text: "출근 기록이 먼저 등록되어야 합니다.", type: "error" });
      return;
    }

    if (inTime > nowTime) {
      setFeedbackMsg({ text: "퇴근 시간은 출근 시간보다 빨라질 수 없습니다.", type: "error" });
      return;
    }

    const minutes = calculateMinutes(inTime, nowTime);

    try {
      if (currentDateRecord) {
        const { error } = await supabase
          .from("attendance")
          .update({
            clock_out: nowTime,
            total_minutes: minutes,
          })
          .eq("id", currentDateRecord.id);

        if (error) {
          setFeedbackMsg({ text: "퇴근 기록 저장 중 오류가 발생했습니다.", type: "error" });
          return;
        }
      } else {
        const { error } = await supabase.from("attendance").insert([
          {
            staff_id: user.id,
            work_date: selectedDate,
            clock_in: inTime,
            clock_out: nowTime,
            total_minutes: minutes,
          },
        ]);

        if (error) {
          setFeedbackMsg({ text: "퇴근 기록 저장 중 오류가 발생했습니다.", type: "error" });
          return;
        }
      }

      setFeedbackMsg({ text: `${selectedDate} 퇴근 시간이 ${nowTime}으로 기록되었습니다.`, type: "success" });
      fetchShopAndEmployeeData(user.id, user.shop_id);
    } catch (err) {
      console.error("퇴근 처리 예외:", err);
      setFeedbackMsg({ text: "퇴근 처리 중 오류가 발생했습니다.", type: "error" });
    }
  };

  // '선택 시간으로 저장' 버튼 클릭 (날짜 + 출근시간 + 퇴근시간 일괄 저장/수정)
  const handleSaveSelectedTimes = async () => {
    if (!user) return;
    setFeedbackMsg(null);

    if (!selectedDate) {
      setFeedbackMsg({ text: "근무 날짜를 선택해주세요.", type: "error" });
      return;
    }

    if (!clockInInput) {
      setFeedbackMsg({ text: "출근 시간을 선택해주세요.", type: "error" });
      return;
    }

    let minutes = 0;
    if (clockOutInput) {
      if (clockInInput > clockOutInput) {
        setFeedbackMsg({ text: "퇴근 시간은 출근 시간보다 빨라질 수 없습니다.", type: "error" });
        return;
      }
      minutes = calculateMinutes(clockInInput, clockOutInput);
    }

    try {
      if (currentDateRecord) {
        const { error } = await supabase
          .from("attendance")
          .update({
            work_date: selectedDate,
            clock_in: clockInInput,
            clock_out: clockOutInput || null,
            total_minutes: minutes,
          })
          .eq("id", currentDateRecord.id);

        if (error) {
          setFeedbackMsg({ text: "근태 기록 수정 저장 중 오류가 발생했습니다.", type: "error" });
          return;
        }
      } else {
        const { error } = await supabase.from("attendance").insert([
          {
            staff_id: user.id,
            work_date: selectedDate,
            clock_in: clockInInput,
            clock_out: clockOutInput || null,
            total_minutes: minutes,
          },
        ]);

        if (error) {
          setFeedbackMsg({ text: "근태 기록 등록 저장 중 오류가 발생했습니다.", type: "error" });
          return;
        }
      }

      setFeedbackMsg({
        text: `${selectedDate} 근무 기록이 성공적으로 저장되었습니다.`,
        type: "success",
      });
      fetchShopAndEmployeeData(user.id, user.shop_id);
    } catch (err) {
      console.error("저장 예외:", err);
      setFeedbackMsg({ text: "근태 기록 저장 처리 중 오류가 발생했습니다.", type: "error" });
    }
  };

  // PIN 변경 핸들러
  const handleUpdatePin = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinError("");

    if (!/^[0-9]{4}$/.test(newPin)) {
      setPinError("새 PIN 번호는 4자리 숫자여야 합니다.");
      return;
    }

    if (newPin !== confirmNewPin) {
      setPinError("새 PIN 번호 확인이 일치하지 않습니다.");
      return;
    }

    if (!user) return;

    try {
      const { error } = await supabase
        .from("staff")
        .update({ pin_code: newPin })
        .eq("id", user.id);

      if (error) {
        setPinError("PIN 번호 변경 중 오류가 발생했습니다.");
        return;
      }

      alert("PIN 번호가 성공적으로 변경되었습니다.");
      setIsPinModalOpen(false);
      setNewPin("");
      setConfirmNewPin("");
    } catch (err) {
      console.error("PIN 변경 예외:", err);
      setPinError("처리 중 오류가 발생했습니다.");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("flower_shop_user");
    if (user) {
      router.push(`/shop/${user.shop_id}`);
    } else {
      router.push("/");
    }
  };

  // 이번 달 근무 요약 계산
  const currentMonthPrefix = new Date().toISOString().slice(0, 7);
  const thisMonthRecords = allRecords.filter((r) => r.work_date.startsWith(currentMonthPrefix));
  const thisMonthTotalMinutes = thisMonthRecords.reduce((acc, cur) => acc + (cur.total_minutes || 0), 0);
  const thisMonthEstimatedSalary = calculateSalary(thisMonthTotalMinutes, user?.hourly_wage || 0);

  if (loading || !user) {
    return (
      <div className="flex flex-col flex-1">
        <Navbar title="플라워샵 직원 근무 관리" />
        <div className="flex-1 flex items-center justify-center p-8 text-xs text-subText">
          직원 정보를 불러오는 중입니다...
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1">
      <Navbar title="직원 근무 관리" />

      <div className="pt-6 px-4 pb-8 flex-1 space-y-6">
        {/* 1. 상단 헤더: 직원 이름, 매장명, 책정 시급 안내 태그, PIN 번호 변경 버튼, 로그아웃 버튼 */}
        <div className="bg-white p-5 rounded-xl border border-borderLine shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-base font-bold text-textColor">{user.name}</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-subText font-medium">
                {shopName}
              </span>
            </div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-[#059669] rounded-lg text-xs font-semibold">
              책정 시급: {formatCurrency(user.hourly_wage)}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setPinError("");
                setNewPin("");
                setConfirmNewPin("");
                setIsPinModalOpen(true);
              }}
              className="min-h-[46px] h-[46px] px-3.5 bg-white border border-borderLine text-textColor hover:bg-slate-50 text-xs font-semibold rounded-xl transition flex items-center gap-1.5 active:scale-95"
            >
              <Lock className="w-4 h-4 text-subText" />
              PIN 번호 변경
            </button>
            <button
              onClick={handleLogout}
              className="min-h-[46px] h-[46px] px-3.5 bg-slate-100 hover:bg-slate-200 text-textColor text-xs font-semibold rounded-xl transition flex items-center gap-1.5 active:scale-95"
            >
              <LogOut className="w-4 h-4 text-subText" />
              로그아웃
            </button>
          </div>
        </div>

        {feedbackMsg && (
          <div
            className={`p-3 rounded-xl border text-xs font-medium flex items-center gap-2 ${
              feedbackMsg.type === "success"
                ? "bg-emerald-50 border-emerald-200 text-[#059669]"
                : "bg-rose-50 border-rose-200 text-rose-600"
            }`}
          >
            {feedbackMsg.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
            )}
            <span>{feedbackMsg.text}</span>
          </div>
        )}

        {/* 2. 출퇴근 등록/수정 상단 카드 (세련된 타임피커) */}
        <section className="bg-white border border-borderLine rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-borderLine">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-[#059669]" />
              <h2 className="text-sm font-bold text-textColor">출퇴근 등록 및 수정</h2>
            </div>
            {currentDateRecord && (
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 font-medium">
                {currentDateRecord.clock_out ? "근무 완료" : "근무 중"}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* 날짜 선택기 (Date Picker, 기본값 오늘) */}
            <div>
              <label className="block text-xs font-semibold text-textColor mb-1.5">
                근무 날짜 선택
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full min-h-[46px] h-[46px] px-3 bg-white border border-borderLine rounded-xl text-xs font-medium text-textColor focus:outline-none focus:border-[#059669]"
                />
              </div>
            </div>

            {/* 출근 시간 선택 인풋 */}
            <div>
              <label className="block text-xs font-semibold text-textColor mb-1.5">
                출근 시간
              </label>
              <button
                type="button"
                onClick={() => setTimePickerTarget("in")}
                className="w-full min-h-[46px] h-[46px] px-3 bg-white border border-borderLine rounded-xl text-xs font-semibold text-textColor flex items-center justify-between hover:border-[#059669] transition"
              >
                <span>{clockInInput || "출근 시간 선택"}</span>
                <Clock className="w-4 h-4 text-subText" />
              </button>
            </div>

            {/* 퇴근 시간 선택 인풋 */}
            <div>
              <label className="block text-xs font-semibold text-textColor mb-1.5">
                퇴근 시간
              </label>
              <button
                type="button"
                onClick={() => setTimePickerTarget("out")}
                className="w-full min-h-[46px] h-[46px] px-3 bg-white border border-borderLine rounded-xl text-xs font-semibold text-textColor flex items-center justify-between hover:border-[#059669] transition"
              >
                <span>{clockOutInput || "퇴근 시간 미입력"}</span>
                <Clock className="w-4 h-4 text-subText" />
              </button>
            </div>
          </div>

          {/* 원클릭 기록 및 선택 시간 저장 액션 버튼 */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2">
            <button
              type="button"
              onClick={handleQuickClockIn}
              className="min-h-[46px] h-[46px] px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition shadow-sm active:scale-95 flex items-center justify-center gap-1.5"
            >
              출근 기록
            </button>
            <button
              type="button"
              onClick={handleQuickClockOut}
              className="min-h-[46px] h-[46px] px-4 bg-slate-700 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition shadow-sm active:scale-95 flex items-center justify-center gap-1.5"
            >
              퇴근 기록
            </button>
            <button
              type="button"
              onClick={handleSaveSelectedTimes}
              className="min-h-[46px] h-[46px] px-4 bg-[#1E293B] hover:bg-[#0f172a] text-white text-xs font-bold rounded-xl transition shadow-sm active:scale-95 flex items-center justify-center gap-1.5"
            >
              선택 시간으로 저장
            </button>
          </div>
        </section>

        {/* 3. 이번 달 근무 요약 카드: 총 근무 시간 (00시간 00분), 총 예상 급여 (원 단위 서식) */}
        <section className="bg-white border border-borderLine rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-borderLine">
            <h2 className="text-sm font-bold text-textColor flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#059669]" />
              이번 달 ({currentMonthPrefix}) 근무 요약
            </h2>
            <span className="text-xs text-subText">기록 완료 건 대상 집계</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            <div className="bg-slate-50 border border-borderLine rounded-xl p-4">
              <div className="text-xs text-subText font-medium">총 근무 시간</div>
              <div className="text-xl font-bold text-textColor mt-1">
                {formatMinutesToHoursAndMinutes(thisMonthTotalMinutes)}
              </div>
            </div>
            <div className="bg-emerald-50/60 border border-emerald-100 rounded-xl p-4">
              <div className="text-xs text-[#059669] font-medium">총 예상 급여</div>
              <div className="text-xl font-bold text-[#059669] mt-1">
                {formatCurrency(thisMonthEstimatedSalary)}
              </div>
            </div>
          </div>
        </section>

        {/* 4. 근무 이력 테이블: 날짜, 출근 시간, 퇴근 시간, 근무 분, 수정 버튼 */}
        <section className="bg-white border border-borderLine rounded-xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between pb-3 border-b border-borderLine">
            <h2 className="text-sm font-bold text-textColor">근무 이력</h2>
            <span className="text-xs text-subText">최근 기록 순</span>
          </div>

          {allRecords.length === 0 ? (
            <p className="text-xs text-subText text-center py-8">등록된 근무 이력이 없습니다.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-borderLine text-subText">
                    <th className="py-2.5 px-3 font-semibold">날짜</th>
                    <th className="py-2.5 px-3 font-semibold">출근 시간</th>
                    <th className="py-2.5 px-3 font-semibold">퇴근 시간</th>
                    <th className="py-2.5 px-3 font-semibold">근무 분</th>
                    <th className="py-2.5 px-3 font-semibold text-right">수정</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-borderLine">
                  {allRecords.map((r) => {
                    const inTime = r.clock_in ? r.clock_in.slice(0, 5) : "-";
                    const outTime = r.clock_out ? r.clock_out.slice(0, 5) : "근무 중";
                    return (
                      <tr key={r.id} className="hover:bg-slate-50">
                        <td className="py-3 px-3 font-medium text-textColor whitespace-nowrap">
                          {r.work_date}
                        </td>
                        <td className="py-3 px-3 text-textColor whitespace-nowrap">{inTime}</td>
                        <td className="py-3 px-3 text-textColor whitespace-nowrap">
                          <span
                            className={
                              !r.clock_out ? "text-amber-600 font-semibold" : ""
                            }
                          >
                            {outTime}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-textColor whitespace-nowrap font-medium">
                          {r.total_minutes ? `${r.total_minutes}분` : r.clock_out ? "0분" : "-"}
                        </td>
                        <td className="py-3 px-3 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedDate(r.work_date);
                              setClockInInput(r.clock_in ? r.clock_in.slice(0, 5) : "09:00");
                              setClockOutInput(r.clock_out ? r.clock_out.slice(0, 5) : "");
                              window.scrollTo({ top: 0, behavior: "smooth" });
                            }}
                            className="min-h-[32px] px-3 bg-slate-100 hover:bg-slate-200 text-textColor text-[11px] font-semibold rounded-lg transition inline-flex items-center gap-1 active:scale-95"
                          >
                            <Edit2 className="w-3 h-3 text-subText" />
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

      {/* 시간 피커 모달 (시 00~23 / 분 00~55, 5분 단위 스텝) */}
      {timePickerTarget && (
        <TimePickerModal
          isOpen={true}
          title={timePickerTarget === "in" ? "출근 시간 선택" : "퇴근 시간 선택"}
          initialTime={timePickerTarget === "in" ? clockInInput || "09:00" : clockOutInput || "18:00"}
          onClose={() => setTimePickerTarget(null)}
          onConfirm={(selectedTime) => {
            if (timePickerTarget === "in") {
              setClockInInput(selectedTime);
            } else {
              setClockOutInput(selectedTime);
            }
            setTimePickerTarget(null);
          }}
        />
      )}

      {/* PIN 번호 변경 모달 */}
      {isPinModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl border border-borderLine space-y-4">
            <div>
              <h3 className="text-base font-bold text-textColor">PIN 번호 변경</h3>
              <p className="text-xs text-subText mt-0.5">
                로그인 시 사용할 4자리 숫자를 입력해주세요.
              </p>
            </div>

            {pinError && (
              <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-xs">
                {pinError}
              </div>
            )}

            <form onSubmit={handleUpdatePin} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-textColor mb-1">
                  새 4자리 PIN
                </label>
                <input
                  type="password"
                  maxLength={4}
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value.replace(/[^0-9]/g, ""))}
                  placeholder="0000"
                  className="w-full min-h-[46px] h-[46px] px-3 border border-borderLine rounded-xl text-center text-base tracking-widest bg-white focus:outline-none focus:border-[#059669]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-textColor mb-1">
                  새 PIN 확인
                </label>
                <input
                  type="password"
                  maxLength={4}
                  value={confirmNewPin}
                  onChange={(e) => setConfirmNewPin(e.target.value.replace(/[^0-9]/g, ""))}
                  placeholder="0000"
                  className="w-full min-h-[46px] h-[46px] px-3 border border-borderLine rounded-xl text-center text-base tracking-widest bg-white focus:outline-none focus:border-[#059669]"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsPinModalOpen(false)}
                  className="flex-1 min-h-[46px] h-[46px] px-3 bg-slate-100 hover:bg-slate-200 text-textColor text-xs font-bold rounded-xl transition"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={newPin.length !== 4 || newPin !== confirmNewPin}
                  className="flex-1 min-h-[46px] h-[46px] px-3 bg-[#059669] hover:bg-[#047857] disabled:opacity-50 text-white text-xs font-bold rounded-xl transition"
                >
                  변경 저장
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
