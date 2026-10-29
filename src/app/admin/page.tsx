"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import StatusBadge from "@/components/StatusBadge";
import Button from "@/components/ui/Button";
import { ArrowLeft, Check, UserX, Settings, Calendar, Shield } from "lucide-react";

interface StaffUser {
  id: string;
  shop_id: string;
  name: string;
  is_admin: boolean;
}

interface StaffMember {
  id: string;
  shop_id: string;
  name: string;
  status: "pending" | "active" | "resigned";
  is_admin: boolean;
  created_at: string;
}

interface CompensationItem {
  staff_id: string;
  pay_type: "hourly" | "monthly";
  amount_krw: number;
  effective_from: string;
}

export default function AdminPage() {
  const router = useRouter();
  const [user, setUser] = useState<StaffUser | null>(null);
  const [shopName, setShopName] = useState<string>("");
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [compensations, setCompensations] = useState<Record<string, CompensationItem>>({});

  // 승인 대기 직원의 급여 설정 상태 (staffId -> {payType, amount, effectiveFrom})
  const [approvalForms, setApprovalForms] = useState<
    Record<string, { payType: "hourly" | "monthly"; amount: string; effectiveFrom: string }>
  >({});

  // 재직 직원의 급여 조건 수정 모드 상태 (staffId -> boolean)
  const [editModeStaffId, setEditModeStaffId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{ payType: "hourly" | "monthly"; amount: string; effectiveFrom: string }>({
    payType: "hourly",
    amount: "",
    effectiveFrom: new Date().toISOString().split("T")[0],
  });

  const [errorMsg, setErrorMsg] = useState<string>("");
  const [successMsg, setSuccessMsg] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);

  // 관리자 본인 정보 수정 상태
  const [isEditAdminOpen, setIsEditAdminOpen] = useState<boolean>(false);
  const [adminNameInput, setAdminNameInput] = useState<string>("");
  const [adminPinInput, setAdminPinInput] = useState<string>("");
  const [adminConfirmPinInput, setAdminConfirmPinInput] = useState<string>("");
  const [adminErrorMsg, setAdminErrorMsg] = useState<string>("");

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
    setAdminNameInput(parsed.name);
    fetchShopAndStaff(parsed.shop_id);
  }, [router]);

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
        .select("*")
        .eq("shop_id", shopId)
        .order("created_at", { ascending: false });

      const list = (staffData || []).filter((st) => !st.is_admin);
      setStaffList(list);

      const defaultApprovalForms: Record<string, { payType: "hourly" | "monthly"; amount: string; effectiveFrom: string }> = {};
      list.forEach((st) => {
        defaultApprovalForms[st.id] = {
          payType: "hourly",
          amount: "10000",
          effectiveFrom: new Date().toISOString().split("T")[0],
        };
      });
      setApprovalForms(defaultApprovalForms);

      // 최신 급여 조건 조회
      const staffIds = list.map((st) => st.id);
      if (staffIds.length > 0) {
        const { data: compData } = await supabase
          .from("compensation")
          .select("*")
          .in("staff_id", staffIds)
          .order("effective_from", { ascending: false });

        const compMap: Record<string, CompensationItem> = {};
        (compData || []).forEach((comp) => {
          if (!compMap[comp.staff_id]) {
            compMap[comp.staff_id] = comp;
          }
        });
        setCompensations(compMap);
      }
    } catch (err) {
      console.error("예외 발생:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveStaff = async (staffId: string) => {
    setErrorMsg("");
    setSuccessMsg("");

    const form = approvalForms[staffId];
    if (!form || !form.amount || isNaN(Number(form.amount)) || Number(form.amount) <= 0) {
      setErrorMsg("유효한 급여 금액을 입력해주세요.");
      return;
    }

    if (!form.effectiveFrom) {
      setErrorMsg("적용 시작일을 선택해주세요.");
      return;
    }

    try {
      // 1. 직원 상태 active로 변경
      const { error: updateError } = await supabase
        .from("staff")
        .update({ status: "active" })
        .eq("id", staffId);

      if (updateError) {
        setErrorMsg("직원 승인 중 오류가 발생했습니다.");
        return;
      }

      // 2. 급여 조건 저장
      const { error: compError } = await supabase.from("compensation").insert([
        {
          staff_id: staffId,
          pay_type: form.payType,
          amount_krw: Number(form.amount),
          effective_from: form.effectiveFrom,
        },
      ]);

      if (compError) {
        console.error("급여 조건 저장 오류:", compError);
      }

      setSuccessMsg("직원이 승인되고 급여 조건이 저장되었습니다.");
      if (user) fetchShopAndStaff(user.shop_id);
    } catch (err) {
      console.error("예외 발생:", err);
      setErrorMsg("처리 중 오류가 발생했습니다.");
    }
  };

  const handleUpdateStatus = async (staffId: string, newStatus: "active" | "resigned") => {
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const updateData: any = { status: newStatus };
      if (newStatus === "resigned") {
        updateData.resigned_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from("staff")
        .update(updateData)
        .eq("id", staffId);

      if (error) {
        setErrorMsg("상태 변경 중 오류가 발생했습니다.");
        return;
      }

      setSuccessMsg(`직원 상태가 ${newStatus === "resigned" ? "퇴사" : "재직"} 처리되었습니다.`);
      if (user) fetchShopAndStaff(user.shop_id);
    } catch (err) {
      console.error("예외 발생:", err);
      setErrorMsg("처리 중 오류가 발생했습니다.");
    }
  };

  const handleSaveCompensationEdit = async (staffId: string) => {
    setErrorMsg("");
    setSuccessMsg("");

    if (!editForm.amount || isNaN(Number(editForm.amount)) || Number(editForm.amount) <= 0) {
      setErrorMsg("유효한 금액을 입력해주세요.");
      return;
    }

    try {
      const { error } = await supabase.from("compensation").insert([
        {
          staff_id: staffId,
          pay_type: editForm.payType,
          amount_krw: Number(editForm.amount),
          effective_from: editForm.effectiveFrom,
        },
      ]);

      if (error) {
        setErrorMsg("급여 조건 변경 중 오류가 발생했습니다.");
        return;
      }

      setSuccessMsg("새 급여 조건이 적용 시작일 기준으로 저장되었습니다.");
      setEditModeStaffId(null);
      if (user) fetchShopAndStaff(user.shop_id);
    } catch (err) {
      console.error("예외 발생:", err);
      setErrorMsg("저장 중 오류가 발생했습니다.");
    }
  };

  const handleUpdateAdminInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminErrorMsg("");

    if (!adminNameInput.trim()) {
      setAdminErrorMsg("관리자 이름을 입력해주세요.");
      return;
    }

    if (!/^[0-9]{4}$/.test(adminPinInput)) {
      setAdminErrorMsg("비밀은 숫자 4자리여야 합니다.");
      return;
    }

    if (adminPinInput !== adminConfirmPinInput) {
      setAdminErrorMsg("비밀 확인이 일치하지 않습니다.");
      return;
    }

    if (!user) return;

    try {
      // shop_admins 테이블 업데이트 시도
      const { error: shopAdminErr } = await supabase
        .from("shop_admins")
        .update({
          name: adminNameInput.trim(),
          pin_hash: adminPinInput,
        })
        .eq("shop_id", user.shop_id);

      if (shopAdminErr) {
        // staff 테이블의 관리자 레코드 업데이트 시도
        await supabase
          .from("staff")
          .update({
            name: adminNameInput.trim(),
            pin_code: adminPinInput,
          })
          .eq("id", user.id);
      }

      const updatedUser = { ...user, name: adminNameInput.trim() };
      localStorage.setItem("flower_shop_user", JSON.stringify(updatedUser));
      setUser(updatedUser);

      alert("관리자 정보가 성공적으로 수정되었습니다.");
      setIsEditAdminOpen(false);
    } catch (err) {
      console.error("예외 발생:", err);
      setAdminErrorMsg("관리자 정보 수정 중 오류가 발생했습니다.");
    }
  };

  if (!user || loading) {
    return <div className="flex flex-col flex-1 p-6 justify-center text-center text-xs text-[#64748B]">로딩 중...</div>;
  }

  const pendingList = staffList.filter((s) => s.status === "pending");
  const activeList = staffList.filter((s) => s.status === "active");
  const resignedList = staffList.filter((s) => s.status === "resigned");

  return (
    <div className="flex flex-col flex-1">
      {/* 공통 배너 */}
      <header className="bg-white border-b border-[#E2E8F0] px-4 md:px-6 h-[56px] md:h-[64px] flex items-center justify-between sticky top-0 z-40">
        <h1 className="text-lg md:text-xl font-bold text-[#0F172A] tracking-tight">
          플라워샵 근무 관리
        </h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsEditAdminOpen(true)}
            className="px-3 min-h-[40px] h-[40px] border border-[#E2E8F0] rounded-xl text-xs text-[#0F172A] font-semibold hover:bg-slate-50 flex items-center gap-1.5 transition"
          >
            <Settings className="w-3.5 h-3.5 text-[#059669]" />
            관리자 정보 수정
          </button>
          <Link
            href="/admin/attendance"
            className="px-3 min-h-[40px] h-[40px] bg-[#059669] text-white text-xs font-semibold rounded-xl hover:bg-[#047857] flex items-center gap-1.5 transition"
          >
            근무 기록/정산
          </Link>
        </div>
      </header>

      <div className="max-w-[1120px] mx-auto w-full p-4 md:p-6 space-y-6">
        <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-sm flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-[#0F172A]">{shopName} 직원 관리 대시보드</h2>
            <p className="text-xs text-[#64748B] mt-0.5">승인 대기, 재직, 퇴사 직원 관리 및 급여 조건 설정</p>
          </div>
          <Link
            href={`/shop/${user.shop_id}`}
            className="px-3 min-h-[40px] h-[40px] border border-[#E2E8F0] rounded-xl text-xs text-[#0F172A] font-semibold hover:bg-slate-50 flex items-center gap-1.5 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            매장 홈으로
          </Link>
        </div>

        {errorMsg && <p className="text-xs text-rose-500 font-medium text-center">{errorMsg}</p>}
        {successMsg && <p className="text-xs text-[#059669] font-medium text-center">{successMsg}</p>}

        {/* 1. 승인 대기 직원 목록 */}
        <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
            <h3 className="text-sm font-bold text-[#0F172A]">승인 대기 직원 ({pendingList.length}명)</h3>
            <span className="text-xs text-[#64748B]">급여 유형, 금액, 적용 시작일 지정 후 승인</span>
          </div>

          {pendingList.length === 0 ? (
            <p className="text-xs text-[#64748B] text-center py-6">승인 대기 중인 직원이 없습니다.</p>
          ) : (
            <div className="space-y-4">
              {pendingList.map((st) => {
                const form = approvalForms[st.id] || { payType: "hourly", amount: "10000", effectiveFrom: new Date().toISOString().split("T")[0] };

                return (
                  <div key={st.id} className="p-4 bg-slate-50 border border-[#E2E8F0] rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-[#0F172A]">{st.name}</span>
                        <StatusBadge status={st.status} />
                      </div>
                      <span className="text-xs text-[#64748B]">신청일: {st.created_at.slice(0, 10)}</span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <select
                        value={form.payType}
                        onChange={(e) =>
                          setApprovalForms({
                            ...approvalForms,
                            [st.id]: { ...form, payType: e.target.value as "hourly" | "monthly" },
                          })
                        }
                        className="min-h-[40px] h-[40px] px-3 border border-[#E2E8F0] rounded-xl text-xs bg-white font-semibold"
                      >
                        <option value="hourly">시급</option>
                        <option value="monthly">월급</option>
                      </select>

                      <input
                        type="number"
                        value={form.amount}
                        onChange={(e) =>
                          setApprovalForms({
                            ...approvalForms,
                            [st.id]: { ...form, amount: e.target.value },
                          })
                        }
                        placeholder="금액 (원)"
                        className="w-28 min-h-[40px] h-[40px] px-3 border border-[#E2E8F0] rounded-xl text-xs bg-white"
                      />

                      <input
                        type="date"
                        value={form.effectiveFrom}
                        onChange={(e) =>
                          setApprovalForms({
                            ...approvalForms,
                            [st.id]: { ...form, effectiveFrom: e.target.value },
                          })
                        }
                        className="min-h-[40px] h-[40px] px-3 border border-[#E2E8F0] rounded-xl text-xs bg-white"
                      />

                      <button
                        onClick={() => handleApproveStaff(st.id)}
                        className="px-4 min-h-[40px] h-[40px] bg-[#059669] text-white text-xs font-semibold rounded-xl hover:bg-[#047857] transition flex items-center gap-1"
                      >
                        <Check className="w-3.5 h-3.5" />
                        승인
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 2. 재직 직원 목록 */}
        <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
            <h3 className="text-sm font-bold text-[#0F172A]">재직 직원 ({activeList.length}명)</h3>
            <span className="text-xs text-[#64748B]">급여 조건 변경 및 퇴사 처리</span>
          </div>

          {activeList.length === 0 ? (
            <p className="text-xs text-[#64748B] text-center py-6">재직 중인 직원이 없습니다.</p>
          ) : (
            <div className="space-y-4">
              {activeList.map((st) => {
                const comp = compensations[st.id];
                const isEditing = editModeStaffId === st.id;

                return (
                  <div key={st.id} className="p-4 bg-slate-50 border border-[#E2E8F0] rounded-xl space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-[#0F172A]">{st.name}</span>
                          <StatusBadge status={st.status} />
                        </div>
                        <p className="text-xs text-[#64748B] mt-0.5">
                          현재 급여:{" "}
                          <span className="font-semibold text-[#0F172A]">
                            {comp ? `${comp.pay_type === "hourly" ? "시급" : "월급"} ${comp.amount_krw.toLocaleString()}원 (적용일: ${comp.effective_from})` : "설정된 급여 조건 없음"}
                          </span>
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            if (isEditing) {
                              setEditModeStaffId(null);
                            } else {
                              setEditModeStaffId(st.id);
                              setEditForm({
                                payType: comp?.pay_type || "hourly",
                                amount: comp ? String(comp.amount_krw) : "10000",
                                effectiveFrom: new Date().toISOString().split("T")[0],
                              });
                            }
                          }}
                          className="px-3 min-h-[38px] h-[38px] border border-[#E2E8F0] text-[#0F172A] text-xs font-semibold rounded-xl hover:bg-white transition"
                        >
                          {isEditing ? "취소" : "급여 조건 변경"}
                        </button>
                        <button
                          onClick={() => handleUpdateStatus(st.id, "resigned")}
                          className="px-3 min-h-[38px] h-[38px] bg-rose-50 text-rose-600 text-xs font-semibold rounded-xl hover:bg-rose-100 transition flex items-center gap-1"
                        >
                          <UserX className="w-3.5 h-3.5" />
                          퇴사 처리
                        </button>
                      </div>
                    </div>

                    {isEditing && (
                      <div className="p-3 bg-white border border-[#E2E8F0] rounded-xl flex flex-col sm:flex-row items-center gap-2 pt-3">
                        <select
                          value={editForm.payType}
                          onChange={(e) => setEditForm({ ...editForm, payType: e.target.value as "hourly" | "monthly" })}
                          className="min-h-[38px] h-[38px] px-3 border border-[#E2E8F0] rounded-xl text-xs bg-white font-semibold"
                        >
                          <option value="hourly">시급</option>
                          <option value="monthly">월급</option>
                        </select>
                        <input
                          type="number"
                          value={editForm.amount}
                          onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })}
                          placeholder="새 금액 (원)"
                          className="flex-1 min-h-[38px] h-[38px] px-3 border border-[#E2E8F0] rounded-xl text-xs bg-white"
                        />
                        <input
                          type="date"
                          value={editForm.effectiveFrom}
                          onChange={(e) => setEditForm({ ...editForm, effectiveFrom: e.target.value })}
                          className="min-h-[38px] h-[38px] px-3 border border-[#E2E8F0] rounded-xl text-xs bg-white"
                        />
                        <button
                          onClick={() => handleSaveCompensationEdit(st.id)}
                          className="px-4 min-h-[38px] h-[38px] bg-[#059669] text-white text-xs font-semibold rounded-xl hover:bg-[#047857] transition"
                        >
                          이력 저장
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 3. 퇴사 직원 목록 */}
        <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-[#0F172A]">퇴사 직원 ({resignedList.length}명)</h3>
          {resignedList.length === 0 ? (
            <p className="text-xs text-[#64748B] text-center py-6">퇴사한 직원이 없습니다.</p>
          ) : (
            <div className="space-y-3">
              {resignedList.map((st) => (
                <div key={st.id} className="p-3.5 bg-slate-50 border border-[#E2E8F0] rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-xs text-[#0F172A]">{st.name}</span>
                    <StatusBadge status={st.status} />
                  </div>
                  <span className="text-[11px] text-[#64748B]">과거 근무 기록 및 정산 유지됨</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 관리자 정보 수정 모달 */}
      {isEditAdminOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl border border-[#E2E8F0] space-y-4">
            <h3 className="text-base font-bold text-[#0F172A]">관리자 정보 수정</h3>
            <p className="text-xs text-[#64748B]">관리자 본인의 이름과 비밀을 직접 수정합니다.</p>

            <form onSubmit={handleUpdateAdminInfo} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#0F172A] mb-1">관리자 이름</label>
                <input
                  type="text"
                  value={adminNameInput}
                  onChange={(e) => setAdminNameInput(e.target.value)}
                  placeholder="관리자 이름"
                  className="w-full min-h-[46px] h-[46px] px-3.5 border border-[#E2E8F0] rounded-xl text-sm bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0F172A] mb-1">비밀</label>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  value={adminPinInput}
                  onChange={(e) => setAdminPinInput(e.target.value.replace(/[^0-9]/g, ""))}
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
                  value={adminConfirmPinInput}
                  onChange={(e) => setAdminConfirmPinInput(e.target.value.replace(/[^0-9]/g, ""))}
                  placeholder="••••"
                  className="w-full min-h-[46px] h-[46px] text-center tracking-widest text-lg font-bold border border-[#E2E8F0] rounded-xl bg-white"
                />
              </div>

              {adminErrorMsg && <p className="text-xs text-rose-500 text-center font-medium">{adminErrorMsg}</p>}

              <div className="flex gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setIsEditAdminOpen(false)}>
                  취소
                </Button>
                <Button type="submit" variant="primary">
                  정보 수정 저장
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
