"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Navbar from "@/components/Navbar";
import Button from "@/components/Button";

interface StaffUser {
  id: string;
  shop_id: string;
  name: string;
  is_admin: boolean;
  hourly_wage: number;
  status: string;
}

interface StaffMember {
  id: string;
  shop_id: string;
  name: string;
  hourly_wage: number;
  is_admin: boolean;
  status: string;
  created_at: string;
}

export default function AdminStaffPage() {
  const router = useRouter();
  const [user, setUser] = useState<StaffUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [staffList, setStaffList] = useState<StaffMember[]>([]);

  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [editHourlyWage, setEditHourlyWage] = useState<string>("");
  const [editStatus, setEditStatus] = useState<string>("active");
  const [newPinCode, setNewPinCode] = useState<string>("");
  const [confirmNewPinCode, setConfirmNewPinCode] = useState<string>("");
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
    fetchStaffList(parsedUser.shop_id);
  }, [router]);

  const fetchStaffList = async (shopId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("staff")
        .select("*")
        .eq("shop_id", shopId)
        .order("name", { ascending: true });

      if (error) {
        console.error("직원 목록 조회 오류:", error);
      } else if (data) {
        setStaffList(data);
      }
    } catch (err) {
      console.error("예외 발생:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenEditModal = (staff: StaffMember) => {
    setEditingStaff(staff);
    setEditHourlyWage(staff.hourly_wage.toString());
    setEditStatus(staff.status || "active");
    setNewPinCode("");
    setConfirmNewPinCode("");
    setErrorMsg("");
    setSuccessMsg("");
  };

  const handleCloseModal = () => {
    setEditingStaff(null);
    setErrorMsg("");
    setSuccessMsg("");
  };

  const handleUpdateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!editingStaff) return;

    const wageNum = parseInt(editHourlyWage, 10);
    if (isNaN(wageNum) || wageNum < 0) {
      setErrorMsg("유효한 시급을 입력해주세요.");
      return;
    }

    const updateData: { hourly_wage: number; status: string; pin_code?: string } = {
      hourly_wage: wageNum,
      status: editStatus,
    };

    if (newPinCode) {
      if (newPinCode.length !== 4 || isNaN(Number(newPinCode))) {
        setErrorMsg("PIN 번호는 4자리 숫자여야 합니다.");
        return;
      }
      if (newPinCode !== confirmNewPinCode) {
        setErrorMsg("PIN 번호가 일치하지 않습니다. (비밀번호 확인 불일치)");
        return;
      }
      updateData.pin_code = newPinCode;
    }

    try {
      const { error } = await supabase
        .from("staff")
        .update(updateData)
        .eq("id", editingStaff.id);

      if (error) {
        console.error("직원 정보 수정 오류:", error);
        setErrorMsg("직원 정보 수정 중 오류가 발생했습니다.");
        return;
      }

      setSuccessMsg("직원 정보가 성공적으로 수정되었습니다.");
      if (user) fetchStaffList(user.shop_id);
      setTimeout(() => {
        setEditingStaff(null);
      }, 1000);
    } catch (err) {
      console.error("예외 발생:", err);
      setErrorMsg("수정 중 오류가 발생했습니다.");
    }
  };

  const handleQuickStatusChange = async (staffId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("staff")
        .update({ status: newStatus })
        .eq("id", staffId);

      if (error) {
        console.error("상태 변경 오류:", error);
        alert("상태 변경 중 오류가 발생했습니다.");
        return;
      }
      if (user) fetchStaffList(user.shop_id);
    } catch (err) {
      console.error("예외 발생:", err);
    }
  };

  if (!user) return null;

  return (
    <div className="flex flex-col flex-1">
      <Navbar title="직원 관리" />

      <div className="p-4 flex-1 space-y-4">
        <div className="bg-background p-4 rounded-lg border border-secondary flex justify-between items-center">
          <div>
            <h2 className="text-md font-bold text-textColor">직원 목록 및 승인 관리</h2>
            <p className="text-xs text-gray-600">신규 가입 승인(재직/퇴사/대기) 및 시급 수정</p>
          </div>
        </div>

        {successMsg && (
          <div className="p-3 bg-green-50 border border-secondary text-primary rounded-lg text-sm text-center font-medium">
            {successMsg}
          </div>
        )}

        {loading ? (
          <div className="text-center py-12 text-gray-500">로딩 중...</div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-background border-b border-gray-200 text-xs text-textColor">
                    <th className="p-3 font-semibold">이름</th>
                    <th className="p-3 font-semibold">시급</th>
                    <th className="p-3 font-semibold text-center">상태</th>
                    <th className="p-3 font-semibold text-right">관리</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm">
                  {staffList.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-6 text-center text-gray-500">
                        등록된 직원이 없습니다.
                      </td>
                    </tr>
                  ) : (
                    staffList.map((staff) => (
                      <tr key={staff.id} className="hover:bg-gray-50">
                        <td className="p-3 font-medium text-textColor">
                          {staff.name} {staff.is_admin ? "(관리자)" : ""}
                        </td>
                        <td className="p-3 text-gray-600">
                          {staff.is_admin ? "-" : `${staff.hourly_wage.toLocaleString()}원`}
                        </td>
                        <td className="p-3 text-center">
                          {staff.is_admin ? (
                            <span className="inline-block px-2 py-1 text-xs font-semibold bg-green-100 text-primary rounded">
                              관리자
                            </span>
                          ) : staff.status === "active" ? (
                            <span className="inline-block px-2 py-1 text-xs font-semibold bg-blue-100 text-blue-700 rounded">
                              재직 (active)
                            </span>
                          ) : staff.status === "pending" ? (
                            <span className="inline-block px-2 py-1 text-xs font-semibold bg-yellow-100 text-yellow-800 rounded">
                              대기 (pending)
                            </span>
                          ) : (
                            <span className="inline-block px-2 py-1 text-xs font-semibold bg-red-100 text-red-700 rounded">
                              퇴사 (resigned)
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-right space-x-1">
                          {!staff.is_admin && staff.status === "pending" && (
                            <button
                              onClick={() => handleQuickStatusChange(staff.id, "active")}
                              className="px-2 py-1 bg-primary text-white text-xs rounded hover:bg-opacity-90 font-medium"
                            >
                              승인
                            </button>
                          )}
                          <button
                            onClick={() => handleOpenEditModal(staff)}
                            className="px-2.5 py-1 bg-gray-700 text-white text-xs rounded hover:bg-gray-800 font-medium"
                          >
                            수정
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

      {editingStaff && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-sm space-y-4 shadow-xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-textColor">
              {editingStaff.name} 직원 정보 수정
            </h3>

            <form onSubmit={handleUpdateStaff} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-textColor mb-1">
                  직원 상태
                </label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="w-full h-10 px-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm bg-white"
                >
                  <option value="pending">대기 (pending)</option>
                  <option value="active">재직 (active)</option>
                  <option value="resigned">퇴사 (resigned)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-textColor mb-1">
                  시급 (원)
                </label>
                <input
                  type="number"
                  value={editHourlyWage}
                  onChange={(e) => setEditHourlyWage(e.target.value)}
                  className="w-full h-10 px-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm bg-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-textColor mb-1">
                  새 4자리 PIN 번호 (변경 시에만 입력)
                </label>
                <input
                  type="password"
                  maxLength={4}
                  value={newPinCode}
                  onChange={(e) => setNewPinCode(e.target.value)}
                  placeholder="••••"
                  className="w-full h-10 px-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-center tracking-widest text-sm bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-textColor mb-1">
                  새 4자리 PIN 번호 확인
                </label>
                <input
                  type="password"
                  maxLength={4}
                  value={confirmNewPinCode}
                  onChange={(e) => setConfirmNewPinCode(e.target.value)}
                  placeholder="••••"
                  className="w-full h-10 px-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-center tracking-widest text-sm bg-white"
                />
              </div>

              {errorMsg && (
                <p className="text-xs text-errorColor text-center font-medium">
                  {errorMsg}
                </p>
              )}

              {successMsg && (
                <p className="text-xs text-primary text-center font-medium">
                  {successMsg}
                </p>
              )}

              <div className="flex space-x-2 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleCloseModal}
                >
                  취소
                </Button>
                <Button type="submit" variant="primary">
                  저장
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
