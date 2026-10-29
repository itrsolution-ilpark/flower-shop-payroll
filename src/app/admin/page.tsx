"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Navbar from "@/components/Navbar";

interface StaffUser {
  id: string;
  shop_id: string;
  name: string;
  is_admin: boolean;
  hourly_wage: number;
}

interface StaffSummary {
  id: string;
  name: string;
  hourly_wage: number;
  totalHours: number;
  totalPay: number;
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<StaffUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedMonth, setSelectedMonth] = useState<string>(
    new Date().toISOString().slice(0, 7)
  );
  const [summaries, setSummaries] = useState<StaffSummary[]>([]);

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

  const fetchData = async (shopId: string, month: string) => {
    setLoading(true);
    try {
      const { data: staffData, error: staffError } = await supabase
        .from("staff")
        .select("*")
        .eq("shop_id", shopId)
        .order("name", { ascending: true });

      if (staffError || !staffData) {
        console.error("직원 목록 조회 오류:", staffError);
        setLoading(false);
        return;
      }

      const staffIds = staffData.map((s) => s.id);
      if (staffIds.length === 0) {
        setSummaries([]);
        setLoading(false);
        return;
      }

      const startDate = `${month}-01`;
      const [year, m] = month.split("-").map(Number);
      const lastDay = new Date(year, m, 0).getDate();
      const endDate = `${month}-${lastDay}`;

      const { data: attData, error: attError } = await supabase
        .from("attendance")
        .select("*")
        .in("staff_id", staffIds)
        .gte("work_date", startDate)
        .lte("work_date", endDate);

      if (attError) {
        console.error("출퇴근 기록 조회 오류:", attError);
      }

      const attendances = attData || [];

      const result: StaffSummary[] = staffData.map((staff) => {
        const staffAtts = attendances.filter((a) => a.staff_id === staff.id);
        const totalHours = staffAtts.reduce((acc, cur) => {
          return acc + calculateWorkHours(cur.clock_in, cur.clock_out);
        }, 0);
        const totalPay = Math.round(totalHours * staff.hourly_wage);

        return {
          id: staff.id,
          name: staff.name,
          hourly_wage: staff.hourly_wage,
          totalHours,
          totalPay,
        };
      });

      setSummaries(result);
    } catch (err) {
      console.error("예외 발생:", err);
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  const grandTotalPay = summaries.reduce((acc, cur) => acc + cur.totalPay, 0);

  return (
    <div className="flex flex-col flex-1">
      <Navbar title="관리자 대시보드" />

      <div className="p-4 flex-1 space-y-6">
        <div className="flex justify-between items-center bg-background p-4 rounded-lg border border-secondary">
          <div>
            <h2 className="text-md font-bold text-textColor">월별 급여 집계표</h2>
            <p className="text-xs text-gray-600">소속 화원 직원별 월별 근무 및 급여 현황</p>
          </div>
          <div>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-500">집계 중...</div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-background border-b border-gray-200 text-xs text-textColor">
                    <th className="p-3 font-semibold">이름</th>
                    <th className="p-3 font-semibold text-right">총 근무시간</th>
                    <th className="p-3 font-semibold text-right">시급</th>
                    <th className="p-3 font-semibold text-right">총 급여</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm">
                  {summaries.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-6 text-center text-gray-500">
                        등록된 직원이 없습니다.
                      </td>
                    </tr>
                  ) : (
                    summaries.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="p-3 font-medium text-textColor">
                          {item.name}
                        </td>
                        <td className="p-3 text-right text-gray-600">
                          {item.totalHours.toFixed(1)}시간
                        </td>
                        <td className="p-3 text-right text-gray-600">
                          {item.hourly_wage.toLocaleString()}원
                        </td>
                        <td className="p-3 text-right font-bold text-primary">
                          {item.totalPay.toLocaleString()}원
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {summaries.length > 0 && (
              <div className="p-4 bg-background border-t border-gray-200 flex justify-between items-center">
                <span className="text-sm font-bold text-textColor">이번 달 지급 총액 합계</span>
                <span className="text-lg font-bold text-primary">
                  {grandTotalPay.toLocaleString()}원
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
