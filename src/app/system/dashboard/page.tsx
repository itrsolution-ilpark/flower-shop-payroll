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
} from "@/actions/systemAdminActions";
import { logoutAction } from "@/actions/authActions";
import {
  Store,
  ShieldCheck,
  Plus,
  Edit2,
  Check,
  X,
  LogOut,
  Users,
  ShieldAlert,
  Power,
} from "lucide-react";

export default function SystemDashboardPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"shops" | "admins">("shops");
  const [loading, setLoading] = useState(true);
  const [adminName, setAdminName] = useState("");
  const [shops, setShops] = useState<SystemShopItem[]>([]);
  const [admins, setAdmins] = useState<SystemAdminItem[]>([]);

  // 신규 플라워샵 등록
  const [newShopName, setNewShopName] = useState("");
  const [shopCreateError, setShopCreateError] = useState("");
  const [shopCreateSuccess, setShopCreateSuccess] = useState("");

  // 플라워샵 이름 수정 상태
  const [editingShopId, setEditingShopId] = useState<string | null>(null);
  const [editingShopName, setEditingShopName] = useState("");
  const [shopUpdateError, setShopUpdateError] = useState("");

  // 추가 시스템 관리자 등록 (6자리)
  const [newAdminName, setNewAdminName] = useState("");
  const [newAdminPin, setNewAdminPin] = useState("");
  const [newAdminConfirmPin, setNewAdminConfirmPin] = useState("");
  const [adminAddError, setAdminAddError] = useState("");
  const [adminAddSuccess, setAdminAddSuccess] = useState("");

  const loadData = async () => {
    try {
      const data = await getSystemDashboardDataAction();
      if (!data) {
        router.push("/system/login");
        return;
      }
      setAdminName(data.currentAdminName || "");
      setShops(data.shops || []);
      setAdmins(data.admins || []);
    } catch {
      router.push("/system/login");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleLogout = async () => {
    await logoutAction();
    router.push("/system/login");
  };

  // 플라워샵 신규 등록
  const handleCreateShop = async (e: React.FormEvent) => {
    e.preventDefault();
    setShopCreateError("");
    setShopCreateSuccess("");

    if (!newShopName.trim()) {
      setShopCreateError("플라워샵 이름을 입력해주세요.");
      return;
    }

    const res = await createShopBySystemAdminAction(newShopName.trim());
    if (!res.success) {
      setShopCreateError(res.error || "플라워샵 등록에 실패했습니다.");
      return;
    }

    setShopCreateSuccess("새 플라워샵이 등록되었습니다.");
    setNewShopName("");
    await loadData();
  };

  // 플라워샵 이름 수정
  const handleStartEdit = (shop: SystemShopItem) => {
    setEditingShopId(shop.id);
    setEditingShopName(shop.name);
    setShopUpdateError("");
  };

  const handleSaveEdit = async (shopId: string) => {
    setShopUpdateError("");
    if (!editingShopName.trim()) {
      setShopUpdateError("플라워샵 이름을 입력해주세요.");
      return;
    }

    const res = await updateShopNameBySystemAdminAction(shopId, editingShopName.trim());
    if (!res.success) {
      setShopUpdateError(res.error || "이름 수정에 실패했습니다.");
      return;
    }

    setEditingShopId(null);
    await loadData();
  };

  // 플라워샵 활성/비활성 토글
  const handleToggleStatus = async (shop: SystemShopItem) => {
    const nextStatus = shop.status === "active" ? "inactive" : "active";
    const confirmMsg =
      nextStatus === "inactive"
        ? `'${shop.name}'을(를) 비활성화하시겠습니까? 비활성화 시 소속 관리자 및 직원의 모든 로그인이 즉시 차단됩니다.`
        : `'${shop.name}'을(를) 활성화하시겠습니까?`;

    if (!window.confirm(confirmMsg)) return;

    const res = await toggleShopStatusAction(shop.id, nextStatus);
    if (!res.success) {
      alert(res.error || "상태 변경에 실패했습니다.");
      return;
    }
    await loadData();
  };

  // 추가 시스템 관리자 등록 (숫자 6자리)
  const handleAddSystemAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminAddError("");
    setAdminAddSuccess("");

    if (!newAdminName.trim()) {
      setAdminAddError("관리자 이름을 입력해주세요.");
      return;
    }

    if (newAdminPin.length !== 6) {
      setAdminAddError("비밀번호는 숫자 6자리여야 합니다.");
      return;
    }

    if (newAdminPin !== newAdminConfirmPin) {
      setAdminAddError("비밀번호 확인이 일치하지 않습니다.");
      return;
    }

    const res = await addSystemAdminAction(newAdminName.trim(), newAdminPin);
    if (!res.success) {
      setAdminAddError(res.error || "시스템 관리자 추가에 실패했습니다.");
      return;
    }

    setAdminAddSuccess("새로운 시스템 관리자가 등록되었습니다.");
    setNewAdminName("");
    setNewAdminPin("");
    setNewAdminConfirmPin("");
    await loadData();
  };

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen">
        <Banner />
        <div className="flex-1 flex items-center justify-center text-xs text-slate-500">
          시스템 관리자 데이터를 불러오는 중...
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* 상단 배너 및 로그아웃 버튼 */}
      <Banner
        rightElement={
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-slate-700 hidden sm:inline">
              시스템 관리자 <span className="text-emerald-700 font-bold">{adminName}</span>
            </span>
            <button
              onClick={handleLogout}
              className="px-3 min-h-[38px] h-[38px] border border-slate-200 rounded-xl text-xs text-slate-700 font-semibold hover:bg-slate-100 flex items-center gap-1.5 transition"
            >
              <LogOut className="w-3.5 h-3.5 text-slate-500" />
              로그아웃
            </button>
          </div>
        }
      />

      <main className="flex-1 max-w-[1120px] mx-auto w-full p-4 md:p-6 space-y-6">
        {/* 상단 요약 및 탭 메뉴 */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div>
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-emerald-600" />
              시스템 관리자 통합 대시보드
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              플라워샵 등록·상태 제어 및 복수 시스템 관리자를 총괄 관리합니다.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl self-start md:self-auto">
            <button
              onClick={() => setActiveTab("shops")}
              className={`min-h-[40px] px-4 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                activeTab === "shops"
                  ? "bg-white text-emerald-700 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Store className="w-3.5 h-3.5" />
              플라워샵 등록/관리 ({shops.length})
            </button>
            <button
              onClick={() => setActiveTab("admins")}
              className={`min-h-[40px] px-4 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                activeTab === "admins"
                  ? "bg-white text-emerald-700 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              시스템 관리자 관리 ({admins.length})
            </button>
          </div>
        </div>

        {/* 탭 1: '플라워샵 등록/관리' */}
        {activeTab === "shops" && (
          <div className="space-y-6">
            {/* 신규 플라워샵 등록 폼 */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <Store className="w-4 h-4 text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-900">신규 플라워샵 등록</h3>
              </div>

              <form onSubmit={handleCreateShop} className="space-y-3">
                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="text"
                    value={newShopName}
                    onChange={(e) => setNewShopName(e.target.value)}
                    placeholder="신규 플라워샵 이름 (예: 로즈가든 강남점)"
                    className="flex-1 min-h-[46px] h-[46px] px-3.5 border border-slate-200 rounded-xl text-sm bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                  <Button type="submit" variant="primary" className="sm:w-auto px-6 whitespace-nowrap">
                    <Plus className="w-4 h-4 mr-1 inline" />
                    플라워샵 개설
                  </Button>
                </div>
                {shopCreateError && (
                  <p className="text-xs text-rose-600 font-medium">{shopCreateError}</p>
                )}
                {shopCreateSuccess && (
                  <p className="text-xs text-emerald-600 font-medium">{shopCreateSuccess}</p>
                )}
              </form>
            </div>

            {/* 플라워샵 목록(이름 수정 인풋, 활성/비활성 토글 스위치, 소속 관리자/직원 수 표시) */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">전체 플라워샵 현황</h3>
                  <p className="text-xs text-slate-500">
                    상태를 `inactive`로 변경하면 소속 관리자 및 직원의 로그인이 즉시 차단됩니다.
                  </p>
                </div>
                {shopUpdateError && (
                  <span className="text-xs text-rose-600 font-medium">{shopUpdateError}</span>
                )}
              </div>

              {shops.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500">
                  등록된 플라워샵이 없습니다. 상단에서 첫 번째 플라워샵을 개설하세요.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-4">플라워샵 이름</th>
                        <th className="py-3 px-4 text-center">상태</th>
                        <th className="py-3 px-4 text-center">소속 관리자</th>
                        <th className="py-3 px-4 text-center">소속 직원 (재직/전체)</th>
                        <th className="py-3 px-4">등록일</th>
                        <th className="py-3 px-4 text-right">상태 관리 / 제어</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-800">
                      {shops.map((shop) => {
                        const isEditing = editingShopId === shop.id;
                        return (
                          <tr key={shop.id} className="hover:bg-slate-50/60 transition">
                            {/* 이름 수정 인풋 */}
                            <td className="py-3 px-4 font-semibold text-slate-900">
                              {isEditing ? (
                                <div className="flex items-center gap-2">
                                  <input
                                    type="text"
                                    value={editingShopName}
                                    onChange={(e) => setEditingShopName(e.target.value)}
                                    className="min-h-[36px] h-[36px] px-2.5 border border-emerald-500 rounded-lg text-xs bg-white text-slate-900 focus:outline-none"
                                    autoFocus
                                  />
                                  <button
                                    onClick={() => handleSaveEdit(shop.id)}
                                    className="p-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition"
                                    title="저장"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => setEditingShopId(null)}
                                    className="p-1.5 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition"
                                    title="취소"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <span>{shop.name}</span>
                                  <button
                                    onClick={() => handleStartEdit(shop)}
                                    className="p-1 text-slate-400 hover:text-slate-700 rounded transition"
                                    title="이름 수정"
                                  >
                                    <Edit2 className="w-3 h-3" />
                                  </button>
                                </div>
                              )}
                            </td>

                            <td className="py-3 px-4 text-center">
                              <StatusBadge status={shop.status} />
                            </td>

                            <td className="py-3 px-4 text-center font-medium">
                              <span
                                className={
                                  shop.admin_count === 0 ? "text-amber-600 font-bold" : "text-slate-800"
                                }
                              >
                                {shop.admin_count}명
                              </span>
                            </td>

                            <td className="py-3 px-4 text-center font-medium">
                              <span>
                                {shop.approved_staff_count}명
                                <span className="text-slate-400 font-normal"> / {shop.total_staff_count}명</span>
                              </span>
                            </td>

                            <td className="py-3 px-4 text-slate-500">{shop.created_at}</td>

                            {/* 활성/비활성 토글 스위치 */}
                            <td className="py-3 px-4 text-right">
                              <button
                                onClick={() => handleToggleStatus(shop)}
                                className={`min-h-[34px] px-3 rounded-lg text-xs font-semibold transition inline-flex items-center gap-1.5 ${
                                  shop.status === "active"
                                    ? "bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100"
                                    : "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                                }`}
                              >
                                <Power className="w-3 h-3" />
                                {shop.status === "active" ? "비활성화 처리" : "활성화로 전환"}
                              </button>
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
        )}

        {/* 탭 2: '시스템 관리자 관리' */}
        {activeTab === "admins" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 추가 시스템 관리자 등록 폼 */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <ShieldAlert className="w-4 h-4 text-slate-800" />
                <h3 className="text-sm font-bold text-slate-900">추가 시스템 관리자 등록</h3>
              </div>
              <p className="text-xs text-slate-500">
                새로운 시스템 관리자를 <strong>숫자 6자리 비밀번호</strong>로 등록할 수 있습니다.
              </p>

              <form onSubmit={handleAddSystemAdmin} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-800 mb-1">
                    관리자 이름
                  </label>
                  <input
                    type="text"
                    value={newAdminName}
                    onChange={(e) => setNewAdminName(e.target.value)}
                    placeholder="이름 입력"
                    className="w-full min-h-[46px] h-[46px] px-3.5 border border-slate-200 rounded-xl text-sm bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>

                <PinInput
                  label="6자리 비밀번호"
                  value={newAdminPin}
                  onChange={setNewAdminPin}
                  length={6}
                />

                <PinInput
                  label="6자리 비밀번호 확인"
                  value={newAdminConfirmPin}
                  onChange={setNewAdminConfirmPin}
                  length={6}
                />

                {adminAddError && (
                  <p className="text-xs text-rose-600 font-medium">{adminAddError}</p>
                )}
                {adminAddSuccess && (
                  <p className="text-xs text-emerald-600 font-medium">{adminAddSuccess}</p>
                )}

                <Button type="submit" variant="secondary" className="w-full">
                  시스템 관리자 추가
                </Button>
              </form>
            </div>

            {/* 등록된 시스템 관리자 목록 */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <h3 className="text-sm font-bold text-slate-900">등록된 시스템 관리자 목록</h3>
                </div>
                <span className="text-xs text-slate-500">총 {admins.length}명</span>
              </div>

              <div className="divide-y divide-slate-100">
                {admins.map((admin) => (
                  <div key={admin.id} className="py-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                        {admin.name}
                        {admin.name === adminName && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md">
                            현재 로그인
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">등록일: {admin.created_at}</p>
                    </div>
                    <span className="text-xs text-slate-500 font-medium">숫자 6자리 인증</span>
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
