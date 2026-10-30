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
import { Shield, Store, UserPlus, LogOut, Edit2, Check, RefreshCw } from "lucide-react";

export default function SystemDashboardPage() {
  const router = useRouter();

  const [adminName, setAdminName] = useState<string>("");
  const [shops, setShops] = useState<SystemShopItem[]>([]);
  const [admins, setAdmins] = useState<SystemAdminItem[]>([]);

  const [activeTab, setActiveTab] = useState<"shops" | "admins">("shops");
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string>("");

  // 플라워샵 개설
  const [newShopName, setNewShopName] = useState<string>("");
  const [creatingShop, setCreatingShop] = useState<boolean>(false);

  // 플라워샵 이름 수정
  const [editingShopId, setEditingShopId] = useState<string | null>(null);
  const [editingShopName, setEditingShopName] = useState<string>("");

  // 추가 시스템 관리자 등록
  const [newAdminName, setNewAdminName] = useState<string>("");
  const [newAdminPin, setNewAdminPin] = useState<string>("");
  const [addingAdmin, setAddingAdmin] = useState<boolean>(false);
  const [adminAddMsg, setAdminAddMsg] = useState<string>("");

  const loadData = async () => {
    setLoading(true);
    setErrorMsg("");

    const data = await getSystemDashboardDataAction();
    if (!data) {
      router.replace("/system/login");
      return;
    }

    setAdminName(data.currentAdminName);
    setShops(data.shops);
    setAdmins(data.admins);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  // 신규 플라워샵 개설
  const handleCreateShop = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newShopName.trim()) return;

    setCreatingShop(true);
    const res = await createShopBySystemAdminAction(newShopName);
    if (!res.success) {
      alert(res.error || "플라워샵 개설 중 오류가 발생했습니다.");
      setCreatingShop(false);
      return;
    }

    setNewShopName("");
    setCreatingShop(false);
    await loadData();
  };

  // 플라워샵 이름 수정
  const handleSaveShopName = async (shopId: string) => {
    if (!editingShopName.trim()) return;

    const res = await updateShopNameBySystemAdminAction(shopId, editingShopName);
    if (!res.success) {
      alert(res.error || "이름 수정 중 오류가 발생했습니다.");
      return;
    }

    setEditingShopId(null);
    await loadData();
  };

  // 플라워샵 상태 active ↔ inactive 토글
  const handleToggleStatus = async (shopId: string, currentStatus: "active" | "inactive") => {
    const nextStatus = currentStatus === "active" ? "inactive" : "active";
    const res = await toggleShopStatusAction(shopId, nextStatus);
    if (!res.success) {
      alert(res.error || "상태 변경 실패");
      return;
    }

    await loadData();
  };

  // 추가 시스템 관리자 등록
  const handleAddSystemAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminAddMsg("");

    if (!newAdminName.trim()) {
      setAdminAddMsg("관리자 이름을 입력해주세요.");
      return;
    }
    if (newAdminPin.length !== 6) {
      setAdminAddMsg("시스템 관리자 비밀번호는 숫자 6자리여야 합니다.");
      return;
    }

    setAddingAdmin(true);
    const res = await addSystemAdminAction(newAdminName, newAdminPin);
    if (!res.success) {
      setAdminAddMsg(res.error || "관리자 추가 실패");
      setAddingAdmin(false);
      return;
    }

    setAdminAddMsg("추가 시스템 관리자가 등록되었습니다.");
    setNewAdminName("");
    setNewAdminPin("");
    setAddingAdmin(false);
    await loadData();
  };

  const handleLogout = async () => {
    await logoutAction();
    router.push("/system/login");
  };

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen">
        <Banner />
        <div className="flex flex-1 items-center justify-center p-6 text-xs text-slate-500">
          시스템 관리자 데이터를 불러오는 중...
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#F8FAFC]">
      <Banner
        rightElement={
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-700 hidden sm:inline">
              시스템 관리자 {adminName} 님
            </span>
            <button
              onClick={handleLogout}
              className="px-3 min-h-[38px] h-[38px] bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition flex items-center gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" />
              로그아웃
            </button>
          </div>
        }
      />

      <main className="flex-1 max-w-[1120px] mx-auto w-full p-4 md:p-6 space-y-6 pb-20">
        {/* 헤더 요약 */}
        <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
              최고 총괄 관리자 모드
            </div>
            <h2 className="text-xl font-extrabold tracking-tight">시스템 전체 관리 대시보드</h2>
            <p className="text-xs text-slate-300">
              플라워샵 개설, 상태 제어(`active`/`inactive`), 추가 시스템 관리자를 총괄 운영합니다.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadData}
              className="px-3 min-h-[38px] h-[38px] bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              새로고침
            </button>
          </div>
        </div>

        {/* 탭 버튼 */}
        <div className="flex border-b border-slate-200 gap-2">
          <button
            onClick={() => setActiveTab("shops")}
            className={`pb-3 px-4 font-bold text-sm border-b-2 transition flex items-center gap-2 ${
              activeTab === "shops"
                ? "border-slate-900 text-slate-900"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Store className="w-4 h-4" />
            플라워샵 개설/상태 관리 ({shops.length})
          </button>
          <button
            onClick={() => setActiveTab("admins")}
            className={`pb-3 px-4 font-bold text-sm border-b-2 transition flex items-center gap-2 ${
              activeTab === "admins"
                ? "border-slate-900 text-slate-900"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <UserPlus className="w-4 h-4" />
            시스템 관리자 목록 ({admins.length})
          </button>
        </div>

        {/* 탭 1: 플라워샵 개설 / 관리 */}
        {activeTab === "shops" && (
          <div className="space-y-6">
            {/* 개설 폼 */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
              <h3 className="text-sm font-bold text-slate-900">신규 플라워샵 개설</h3>
              <form onSubmit={handleCreateShop} className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={newShopName}
                  onChange={(e) => setNewShopName(e.target.value)}
                  placeholder="신규 플라워샵 이름 입력"
                  className="flex-1 min-h-[46px] h-[46px] px-3.5 border border-slate-200 rounded-xl text-sm bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-800"
                />
                <Button type="submit" variant="secondary" className="sm:w-auto px-6" disabled={creatingShop}>
                  {creatingShop ? "개설 중..." : "플라워샵 개설"}
                </Button>
              </form>
            </div>

            {/* 목록 테이블 (모바일 대응 수평 스크롤) */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-900">전체 플라워샵 등록 현황</h3>

              <div className="w-full overflow-x-auto whitespace-nowrap -mx-4 px-4 sm:mx-0 sm:px-0">
                <table className="w-full text-xs text-left border-collapse min-w-[640px]">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                      <th className="py-2.5 px-3">플라워샵명</th>
                      <th className="py-2.5 px-3">운영 상태</th>
                      <th className="py-2.5 px-3">소속 관리자</th>
                      <th className="py-2.5 px-3">재직 직원 / 전체</th>
                      <th className="py-2.5 px-3">개설일</th>
                      <th className="py-2.5 px-3 text-center">상태 토글 및 수정</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {shops.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-6 text-slate-400">
                          등록된 플라워샵이 없습니다.
                        </td>
                      </tr>
                    ) : (
                      shops.map((shop) => (
                        <tr key={shop.id} className="hover:bg-slate-50 transition">
                          <td className="py-3 px-3 font-bold text-slate-900">
                            {editingShopId === shop.id ? (
                              <div className="flex items-center gap-1.5">
                                <input
                                  type="text"
                                  value={editingShopName}
                                  onChange={(e) => setEditingShopName(e.target.value)}
                                  className="px-2 py-1 border border-slate-300 rounded text-xs bg-white text-slate-900"
                                />
                                <button
                                  onClick={() => handleSaveShopName(shop.id)}
                                  className="p-1 bg-emerald-600 text-white rounded hover:bg-emerald-700"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <span>{shop.name}</span>
                                <button
                                  onClick={() => {
                                    setEditingShopId(shop.id);
                                    setEditingShopName(shop.name);
                                  }}
                                  className="text-slate-400 hover:text-slate-700"
                                >
                                  <Edit2 className="w-3 h-3" />
                                </button>
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-3">
                            <StatusBadge status={shop.status} />
                          </td>
                          <td className="py-3 px-3 font-semibold text-slate-800">
                            {shop.admin_count}명
                          </td>
                          <td className="py-3 px-3 text-slate-700">
                            <span className="font-bold text-emerald-700">
                              {shop.approved_staff_count}명
                            </span>{" "}
                            / {shop.total_staff_count}명
                          </td>
                          <td className="py-3 px-3 text-slate-500">{shop.created_at}</td>
                          <td className="py-3 px-3 text-center">
                            <button
                              onClick={() => handleToggleStatus(shop.id, shop.status)}
                              className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                                shop.status === "active"
                                  ? "bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100"
                                  : "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                              }`}
                            >
                              {shop.status === "active" ? "비활성화 처리" : "활성화 처리"}
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* 탭 2: 시스템 관리자 관리 */}
        {activeTab === "admins" && (
          <div className="space-y-6">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4 max-w-md">
              <h3 className="text-sm font-bold text-slate-900">추가 시스템 관리자 등록</h3>
              <form onSubmit={handleAddSystemAdmin} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-800 mb-1">
                    관리자 이름
                  </label>
                  <input
                    type="text"
                    value={newAdminName}
                    onChange={(e) => setNewAdminName(e.target.value)}
                    placeholder="이름 입력"
                    className="w-full min-h-[42px] h-[42px] px-3 border border-slate-200 rounded-xl text-sm bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-800"
                  />
                </div>

                <PinInput
                  label="6자리 비밀번호"
                  value={newAdminPin}
                  onChange={setNewAdminPin}
                  length={6}
                />

                {adminAddMsg && (
                  <p className="text-xs font-semibold text-center bg-slate-50 p-2 rounded-lg border border-slate-200 text-slate-800">
                    {adminAddMsg}
                  </p>
                )}

                <Button type="submit" variant="secondary" disabled={addingAdmin}>
                  {addingAdmin ? "등록 중..." : "추가 시스템 관리자 생성"}
                </Button>
              </form>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
              <h3 className="text-sm font-bold text-slate-900">등록된 시스템 관리자 목록</h3>
              <div className="space-y-2 max-w-md">
                {admins.map((adm) => (
                  <div
                    key={adm.id}
                    className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs"
                  >
                    <span className="font-bold text-slate-900">{adm.name}</span>
                    <span className="text-slate-500">생성일: {adm.created_at}</span>
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
