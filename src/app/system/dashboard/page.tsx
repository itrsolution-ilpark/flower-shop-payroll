"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Banner from "@/components/Banner";
import StatusBadge from "@/components/StatusBadge";
import PinInput from "@/components/PinInput";
import Button from "@/components/ui/Button";
import {
  getSystemDashboardDataAction,
  createShopBySystemAdminAction,
  updateShopNameBySystemAdminAction,
  toggleShopStatusAction,
  addSystemAdminAction,
  SystemShopItem,
  SystemAdminItem,
} from "@/actions/systemActions";
import { logoutAction } from "@/actions/authActions";
import { ShieldAlert, Store, UserPlus, LogOut, Edit2, Check, X, Building2, ShieldCheck } from "lucide-react";

export default function SystemDashboardPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"shops" | "admins">("shops");
  const [adminName, setAdminName] = useState<string>("");
  const [shops, setShops] = useState<SystemShopItem[]>([]);
  const [admins, setAdmins] = useState<SystemAdminItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // 플라워샵 등록 폼
  const [newShopName, setNewShopName] = useState<string>("");
  const [createShopError, setCreateShopError] = useState<string>("");
  const [createShopSuccess, setCreateShopSuccess] = useState<string>("");
  const [submittingShop, setSubmittingShop] = useState<boolean>(false);

  // 플라워샵 이름 수정 상태
  const [editingShopId, setEditingShopId] = useState<string | null>(null);
  const [editingShopName, setEditingShopName] = useState<string>("");

  // 추가 시스템 관리자 등록 폼 (6자리)
  const [newAdminName, setNewAdminName] = useState<string>("");
  const [newAdminPin, setNewAdminPin] = useState<string>("");
  const [addAdminError, setAddAdminError] = useState<string>("");
  const [addAdminSuccess, setAddAdminSuccess] = useState<string>("");
  const [submittingAdmin, setSubmittingAdmin] = useState<boolean>(false);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const data = await getSystemDashboardDataAction();
      if (!data) {
        router.replace("/system/login");
        return;
      }
      setAdminName(data.currentAdminName);
      setShops(data.shops);
      setAdmins(data.admins);
    } catch {
      router.replace("/system/login");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const handleLogout = async () => {
    await logoutAction();
    router.push("/");
  };

  // 플라워샵 등록
  const handleCreateShop = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateShopError("");
    setCreateShopSuccess("");

    if (!newShopName.trim()) {
      setCreateShopError("플라워샵 이름을 입력해주세요.");
      return;
    }

    setSubmittingShop(true);
    try {
      const res = await createShopBySystemAdminAction(newShopName);
      if (!res.success) {
        setCreateShopError(res.error || "플라워샵 개설에 실패했습니다.");
        setSubmittingShop(false);
        return;
      }
      setCreateShopSuccess("신규 플라워샵이 성공적으로 개설되었습니다.");
      setNewShopName("");
      await loadDashboardData();
    } catch {
      setCreateShopError("처리 중 오류가 발생했습니다.");
    } finally {
      setSubmittingShop(false);
    }
  };

  // 플라워샵 이름 수정
  const handleStartEditShop = (shop: SystemShopItem) => {
    setEditingShopId(shop.id);
    setEditingShopName(shop.name);
  };

  const handleSaveShopName = async (shopId: string) => {
    if (!editingShopName.trim()) return;
    try {
      const res = await updateShopNameBySystemAdminAction(shopId, editingShopName);
      if (res.success) {
        setEditingShopId(null);
        await loadDashboardData();
      } else {
        alert(res.error || "이름 수정에 실패했습니다.");
      }
    } catch {
      alert("수정 처리 중 오류가 발생했습니다.");
    }
  };

  // 플라워샵 상태 토글
  const handleToggleShopStatus = async (shop: SystemShopItem) => {
    const nextStatus = shop.status === "active" ? "inactive" : "active";
    const confirmText =
      nextStatus === "inactive"
        ? `"${shop.name}"을(를) 비활성화하시겠습니까? 해당 매장 소속 관리자 및 직원의 접속이 즉시 차단됩니다.`
        : `"${shop.name}"을(를) 활성화하시겠습니까?`;

    if (!confirm(confirmText)) return;

    try {
      const res = await toggleShopStatusAction(shop.id, nextStatus);
      if (res.success) {
        await loadDashboardData();
      } else {
        alert(res.error || "상태 변경에 실패했습니다.");
      }
    } catch {
      alert("상태 변경 중 오류가 발생했습니다.");
    }
  };

  // 추가 시스템 관리자 등록 (6자리)
  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddAdminError("");
    setAddAdminSuccess("");

    if (!newAdminName.trim()) {
      setAddAdminError("관리자 이름을 입력해주세요.");
      return;
    }
    if (newAdminPin.length !== 6) {
      setAddAdminError("비밀번호는 숫자 6자리여야 합니다.");
      return;
    }

    setSubmittingAdmin(true);
    try {
      const res = await addSystemAdminAction(newAdminName, newAdminPin);
      if (!res.success) {
        setAddAdminError(res.error || "추가 시스템 관리자 등록에 실패했습니다.");
        setSubmittingAdmin(false);
        return;
      }
      setAddAdminSuccess("추가 시스템 관리자가 안전하게 생성되었습니다.");
      setNewAdminName("");
      setNewAdminPin("");
      await loadDashboardData();
    } catch {
      setAddAdminError("처리 중 오류가 발생했습니다.");
    } finally {
      setSubmittingAdmin(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col flex-1">
        <Banner />
        <div className="flex flex-1 items-center justify-center p-6 text-xs text-slate-500">
          대시보드 데이터를 로드하는 중...
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      {/* 상단 헤더: 관리자 이름 및 로그아웃 버튼 */}
      <Banner
        rightElement={
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-slate-700 hidden sm:inline">
              시스템 관리자: <strong className="text-slate-900">{adminName}님</strong>
            </span>
            <button
              onClick={handleLogout}
              className="px-3 min-h-[38px] h-[38px] bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
            >
              <LogOut className="w-3.5 h-3.5" />
              로그아웃
            </button>
          </div>
        }
      />

      <main className="max-w-[1120px] mx-auto w-full p-4 md:p-6 space-y-6">
        {/* 상단 탭 navigation */}
        <div className="flex border-b border-slate-200 gap-2">
          <button
            onClick={() => setActiveTab("shops")}
            className={`pb-3 px-4 text-sm font-bold border-b-2 transition flex items-center gap-2 ${
              activeTab === "shops"
                ? "border-slate-900 text-slate-900"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Building2 className="w-4 h-4" />
            탭 1 [플라워샵 등록/관리]
          </button>
          <button
            onClick={() => setActiveTab("admins")}
            className={`pb-3 px-4 text-sm font-bold border-b-2 transition flex items-center gap-2 ${
              activeTab === "admins"
                ? "border-slate-900 text-slate-900"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            탭 2 [시스템 관리자 관리]
          </button>
        </div>

        {activeTab === "shops" ? (
          <div className="space-y-6">
            {/* 신규 플라워샵 개설 폼 */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <Store className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-bold text-slate-900">신규 플라워샵 개설</h3>
              </div>

              <form onSubmit={handleCreateShop} className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  value={newShopName}
                  onChange={(e) => setNewShopName(e.target.value)}
                  placeholder="새 플라워샵 이름 입력 (예: 강남 본점)"
                  className="flex-1 min-h-[46px] h-[46px] px-3.5 border border-slate-200 rounded-xl text-sm bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
                <Button
                  type="submit"
                  variant="primary"
                  className="sm:w-36 shrink-0"
                  disabled={submittingShop}
                >
                  {submittingShop ? "개설 중..." : "플라워샵 개설"}
                </Button>
              </form>

              {createShopError && (
                <p className="text-xs text-rose-600 font-medium bg-rose-50 p-2.5 rounded-lg border border-rose-200">
                  {createShopError}
                </p>
              )}
              {createShopSuccess && (
                <p className="text-xs text-emerald-700 font-medium bg-emerald-50 p-2.5 rounded-lg border border-emerald-200">
                  {createShopSuccess}
                </p>
              )}
            </div>

            {/* 플라워샵 목록 */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 md:p-6 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-900">전체 플라워샵 목록 및 상태 관리</h3>
                <span className="text-xs text-slate-500">총 {shops.length}개 개설됨</span>
              </div>

              {shops.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500">
                  등록된 플라워샵이 없습니다. 위 폼에서 신규 플라워샵을 개설하세요.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold">
                        <th className="p-3.5 pl-6">플라워샵명</th>
                        <th className="p-3.5">운영 상태</th>
                        <th className="p-3.5">소속 관리자 수</th>
                        <th className="p-3.5">재직 직원 / 총 직원</th>
                        <th className="p-3.5">개설일</th>
                        <th className="p-3.5 pr-6 text-right">상태 토글 및 관리</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {shops.map((shop) => (
                        <tr key={shop.id} className="hover:bg-slate-50 transition">
                          <td className="p-3.5 pl-6 font-bold text-slate-900">
                            {editingShopId === shop.id ? (
                              <div className="flex items-center gap-1.5 max-w-xs">
                                <input
                                  type="text"
                                  value={editingShopName}
                                  onChange={(e) => setEditingShopName(e.target.value)}
                                  className="px-2 py-1 border border-slate-300 rounded text-xs font-normal"
                                />
                                <button
                                  onClick={() => handleSaveShopName(shop.id)}
                                  className="p-1 bg-emerald-600 text-white rounded hover:bg-emerald-700"
                                  title="저장"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => setEditingShopId(null)}
                                  className="p-1 bg-slate-300 text-slate-700 rounded hover:bg-slate-400"
                                  title="취소"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <span>{shop.name}</span>
                                <button
                                  onClick={() => handleStartEditShop(shop)}
                                  className="text-slate-400 hover:text-slate-700"
                                  title="이름 수정"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </td>
                          <td className="p-3.5">
                            <StatusBadge status={shop.status} />
                          </td>
                          <td className="p-3.5 font-semibold text-slate-800">
                            {shop.admin_count}명
                          </td>
                          <td className="p-3.5 text-slate-600">
                            <span className="font-semibold text-emerald-700">
                              {shop.approved_staff_count}명
                            </span>{" "}
                            / {shop.total_staff_count}명
                          </td>
                          <td className="p-3.5 text-slate-500">{shop.created_at}</td>
                          <td className="p-3.5 pr-6 text-right">
                            <button
                              onClick={() => handleToggleShopStatus(shop)}
                              className={`px-3 py-1.5 rounded-xl font-semibold text-xs transition ${
                                shop.status === "active"
                                  ? "bg-rose-100 text-rose-800 hover:bg-rose-200"
                                  : "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                              }`}
                            >
                              {shop.status === "active" ? "비활성화 처리" : "활성화 처리"}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* 추가 시스템 관리자 등록 폼 */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 max-w-lg">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <UserPlus className="w-5 h-5 text-slate-800" />
                <h3 className="text-base font-bold text-slate-900">추가 시스템 관리자 등록</h3>
              </div>

              <form onSubmit={handleAddAdmin} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-800 mb-1">
                    새 관리자 이름
                  </label>
                  <input
                    type="text"
                    value={newAdminName}
                    onChange={(e) => setNewAdminName(e.target.value)}
                    placeholder="이름 입력"
                    className="w-full min-h-[46px] h-[46px] px-3.5 border border-slate-200 rounded-xl text-sm bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-800"
                  />
                </div>

                <PinInput
                  label="6자리 비밀번호"
                  value={newAdminPin}
                  onChange={setNewAdminPin}
                  length={6}
                />

                {addAdminError && (
                  <p className="text-xs text-rose-600 font-medium bg-rose-50 p-2.5 rounded-lg border border-rose-200">
                    {addAdminError}
                  </p>
                )}
                {addAdminSuccess && (
                  <p className="text-xs text-emerald-700 font-medium bg-emerald-50 p-2.5 rounded-lg border border-emerald-200">
                    {addAdminSuccess}
                  </p>
                )}

                <Button type="submit" variant="secondary" disabled={submittingAdmin}>
                  {submittingAdmin ? "등록 중..." : "시스템 관리자 추가"}
                </Button>
              </form>
            </div>

            {/* 등록된 시스템 관리자 목록 */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden max-w-2xl">
              <div className="p-4 md:p-6 border-b border-slate-100">
                <h3 className="text-base font-bold text-slate-900">등록된 시스템 관리자 목록</h3>
              </div>

              <div className="divide-y divide-slate-100">
                {admins.map((admin) => (
                  <div key={admin.id} className="p-4 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold">
                        {admin.name.slice(0, 1)}
                      </div>
                      <div>
                        <span className="font-bold text-slate-900 text-sm block">
                          {admin.name}
                        </span>
                        <span className="text-slate-500">등록일: {admin.created_at}</span>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 bg-slate-100 text-slate-800 rounded-full text-xs font-semibold">
                      최고 관리자
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
