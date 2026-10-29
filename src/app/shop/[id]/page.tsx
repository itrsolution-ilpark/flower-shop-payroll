"use client";

import React, { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import ProgramBanner from "@/components/ProgramBanner";
import SecretField from "@/components/SecretField";
import Button from "@/components/ui/Button";
import { getShopAdminAction, loginShopAdminAction, updateShopAdminAction, ShopAdminInfo } from "@/actions/shopAdminActions";
import { getActiveStaffListAction, loginStaffAction } from "@/actions/staffActions";
import { getShopsAction } from "@/actions/shopActions";
import { Store, UserCheck, ShieldAlert, ArrowLeft, Settings } from "lucide-react";

interface ShopMainPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function ShopMainPage({ params }: ShopMainPageProps) {
  const resolvedParams = use(params);
  const shopId = resolvedParams.id;
  const router = useRouter();

  const [shopName, setShopName] = useState<string>("");
  const [shopNotFound, setShopNotFound] = useState<boolean>(false);
  const [admin, setAdmin] = useState<ShopAdminInfo | null>(null);
  const [activeStaffList, setActiveStaffList] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // 관리자 로그인 폼 상태
  const [loginMode, setLoginMode] = useState<"none" | "admin">("none");
  const [adminName, setAdminName] = useState<string>("");
  const [adminSecret, setAdminSecret] = useState<string>("");
  const [adminError, setAdminError] = useState<string>("");

  // 관리자 본인 정보 수정 모달 상태
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [editCurrentSecret, setEditCurrentSecret] = useState<string>("");
  const [editNewName, setEditNewName] = useState<string>("");
  const [editNewSecret, setEditNewSecret] = useState<string>("");
  const [editConfirmSecret, setEditConfirmSecret] = useState<string>("");
  const [editError, setEditError] = useState<string>("");
  const [editSuccess, setEditSuccess] = useState<string>("");

  // 직원 로그인 폼 상태
  const [selectedStaffName, setSelectedStaffName] = useState<string>("");
  const [staffSecret, setStaffSecret] = useState<string>("");
  const [staffError, setStaffError] = useState<string>("");

  useEffect(() => {
    fetchShopData();
  }, [shopId]);

  const fetchShopData = async () => {
    setLoading(true);
    try {
      const allShops = await getShopsAction();
      const currentShop = allShops.find((s) => s.id === shopId);
      if (!currentShop) {
        setShopNotFound(true);
        setLoading(false);
        return;
      }
      setShopName(currentShop.name);

      const adminData = await getShopAdminAction(shopId);
      setAdmin(adminData);
      if (adminData) {
        setAdminName(adminData.name);
      }

      // 직원 로그인 목록: active 직원만 표시, 대표 관리자는 완전히 제외
      const staffList = await getActiveStaffListAction(shopId);
      setActiveStaffList(staffList);
    } catch {
      setShopNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminError("");

    if (!adminName.trim() || adminSecret.length !== 4) {
      setAdminError("이름 또는 비밀을 확인해 주세요.");
      return;
    }

    try {
      const res = await loginShopAdminAction(shopId, adminName, adminSecret);
      if (!res.success) {
        setAdminError(res.error || "이름 또는 비밀을 확인해 주세요.");
        return;
      }
      router.push("/admin");
    } catch {
      setAdminError("이름 또는 비밀을 확인해 주세요.");
    }
  };

  const handleAdminSelfUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditError("");
    setEditSuccess("");

    if (editCurrentSecret.length !== 4) {
      setEditError("현재 비밀을 올바르게 입력해주세요.");
      return;
    }
    if (!editNewName.trim()) {
      setEditError("새 관리자 이름을 입력해주세요.");
      return;
    }
    if (editNewSecret.length !== 4) {
      setEditError("새 비밀은 숫자 4자리여야 합니다.");
      return;
    }
    if (editNewSecret !== editConfirmSecret) {
      setEditError("비밀 확인이 일치하지 않습니다.");
      return;
    }

    try {
      const res = await updateShopAdminAction(
        shopId,
        editCurrentSecret,
        editNewName,
        editNewSecret,
        editConfirmSecret
      );
      if (!res.success) {
        setEditError(res.error || "관리자 정보 수정 중 오류가 발생했습니다.");
        return;
      }
      setEditSuccess("관리자 정보가 성공적으로 수정되었습니다.");
      setTimeout(() => {
        setIsEditModalOpen(false);
        fetchShopData();
      }, 700);
    } catch {
      setEditError("처리 중 오류가 발생했습니다.");
    }
  };

  const handleStaffLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setStaffError("");

    if (!selectedStaffName) {
      setStaffError("직원을 선택해주세요.");
      return;
    }
    if (staffSecret.length !== 4) {
      setStaffError("이름 또는 비밀을 확인해 주세요.");
      return;
    }

    try {
      const res = await loginStaffAction(shopId, selectedStaffName, staffSecret);
      if (!res.success) {
        setStaffError(res.error || "이름 또는 비밀을 확인해 주세요.");
        return;
      }
      router.push("/employee/dashboard");
    } catch {
      setStaffError("이름 또는 비밀을 확인해 주세요.");
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col flex-1">
        <ProgramBanner />
        <div className="flex flex-1 items-center justify-center p-6 text-xs text-[#64748B]">
          로딩 중...
        </div>
      </div>
    );
  }

  if (shopNotFound) {
    return (
      <div className="flex flex-col flex-1">
        <ProgramBanner />
        <div className="flex flex-col flex-1 items-center justify-center p-6 text-center">
          <p className="text-sm font-bold text-[#0F172A]">플라워샵을 찾을 수 없습니다.</p>
          <Link href="/" className="mt-3 text-xs text-[#059669] font-semibold underline">
            메인으로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1">
      {/* 최상단 공통 프로그램 배너 */}
      <ProgramBanner
        rightElement={
          <Link
            href="/"
            className="px-3 min-h-[40px] h-[40px] border border-[#E2E8F0] rounded-xl text-xs text-[#0F172A] font-semibold hover:bg-slate-50 flex items-center gap-1.5 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            메인으로 돌아가기
          </Link>
        }
      />

      <main className="max-w-[1120px] mx-auto w-full p-4 md:p-6 space-y-6">
        {/* 플라워샵 이름 */}
        <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-[#059669] flex items-center justify-center font-bold">
            <Store className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-[#0F172A]">{shopName}</h2>
            <p className="text-xs text-[#64748B]">플라워샵 관리 및 직원 로그인</p>
          </div>
        </div>

        {!admin ? (
          <div className="p-8 bg-amber-50/60 border border-amber-200 rounded-2xl text-center space-y-4 shadow-sm">
            <div className="w-12 h-12 mx-auto rounded-full bg-amber-100 text-amber-700 flex items-center justify-center">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-amber-900">
                등록된 관리자가 없습니다
              </h3>
              <p className="text-xs text-amber-700 mt-1">
                매장 운영 및 직원 승인을 위해 관리자를 등록해주세요.
              </p>
            </div>
            <div className="pt-2">
              <Button
                variant="primary"
                onClick={() => router.push(`/admin/setup?shop_id=${shopId}`)}
              >
                관리자 등록
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 관리자 로그인 (본인 정보 수정 포함) */}
            <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
                <span className="text-sm font-bold text-[#0F172A]">관리자 로그인</span>
                <button
                  type="button"
                  onClick={() => {
                    setIsEditModalOpen(true);
                    setEditCurrentSecret("");
                    setEditNewName(admin?.name || "");
                    setEditNewSecret("");
                    setEditConfirmSecret("");
                    setEditError("");
                    setEditSuccess("");
                  }}
                  className="text-xs text-[#059669] font-semibold hover:underline flex items-center gap-1"
                >
                  <Settings className="w-3.5 h-3.5" />
                  본인 정보 수정
                </button>
              </div>

              {loginMode === "admin" ? (
                <form onSubmit={handleAdminLogin} className="space-y-4 pt-1">
                  <div>
                    <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                      관리자 이름
                    </label>
                    <input
                      type="text"
                      value={adminName}
                      onChange={(e) => setAdminName(e.target.value)}
                      placeholder="관리자 이름"
                      className="w-full min-h-[46px] h-[46px] px-3.5 border border-[#E2E8F0] rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#059669]"
                    />
                  </div>

                  <SecretField
                    label="비밀"
                    value={adminSecret}
                    onChange={setAdminSecret}
                  />

                  {adminError && (
                    <p className="text-xs text-rose-500 text-center font-medium">
                      {adminError}
                    </p>
                  )}

                  <div className="flex gap-2">
                    <Button type="button" variant="outline" onClick={() => setLoginMode("none")}>
                      취소
                    </Button>
                    <Button type="submit" variant="secondary">
                      로그인
                    </Button>
                  </div>
                </form>
              ) : (
                <Button
                  variant="secondary"
                  onClick={() => {
                    setLoginMode("admin");
                    setAdminError("");
                  }}
                >
                  관리자 로그인
                </Button>
              )}
            </div>

            {/* 직원 로그인 및 가입 신청 (대표 관리자 제외된 재직 직원만 표시) */}
            <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
                <div className="flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-[#059669]" />
                  <span className="text-sm font-bold text-[#0F172A]">직원 로그인</span>
                </div>
                <Link
                  href={`/signup?shop_id=${shopId}`}
                  className="text-xs text-[#059669] font-semibold hover:underline"
                >
                  직원 가입 신청 &rarr;
                </Link>
              </div>

              <form onSubmit={handleStaffLogin} className="space-y-4 pt-1">
                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                    직원 선택 (재직 직원만 표시)
                  </label>
                  <select
                    value={selectedStaffName}
                    onChange={(e) => setSelectedStaffName(e.target.value)}
                    className="w-full min-h-[46px] h-[46px] px-3.5 border border-[#E2E8F0] rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#059669]"
                  >
                    <option value="">재직 직원을 선택하세요</option>
                    {activeStaffList.map((st) => (
                      <option key={st.id} value={st.name}>
                        {st.name}
                      </option>
                    ))}
                  </select>
                </div>

                <SecretField
                  label="비밀"
                  value={staffSecret}
                  onChange={setStaffSecret}
                />

                {staffError && (
                  <p className="text-xs text-rose-500 text-center font-medium">
                    {staffError}
                  </p>
                )}

                <Button type="submit" variant="primary">
                  직원 로그인
                </Button>
              </form>
            </div>
          </div>
        )}
      </main>

      {/* 관리자 본인 정보 수정 모달 */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl border border-[#E2E8F0] space-y-4">
            <h3 className="text-base font-bold text-[#0F172A]">관리자 본인 정보 수정</h3>
            <p className="text-xs text-[#64748B]">
              현재 비밀을 인증한 후 새 이름과 비밀을 설정하세요.
            </p>

            <form onSubmit={handleAdminSelfUpdate} className="space-y-3.5">
              <SecretField
                label="현재 비밀"
                value={editCurrentSecret}
                onChange={setEditCurrentSecret}
              />

              <div>
                <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                  새 관리자 이름
                </label>
                <input
                  type="text"
                  value={editNewName}
                  onChange={(e) => setEditNewName(e.target.value)}
                  className="w-full min-h-[46px] h-[46px] px-3.5 border border-[#E2E8F0] rounded-xl text-sm bg-white"
                />
              </div>

              <SecretField
                label="새 비밀"
                value={editNewSecret}
                onChange={setEditNewSecret}
              />

              <SecretField
                label="비밀 확인"
                value={editConfirmSecret}
                onChange={setEditConfirmSecret}
              />

              {editError && (
                <p className="text-xs text-rose-500 text-center font-medium">{editError}</p>
              )}
              {editSuccess && (
                <p className="text-xs text-[#059669] text-center font-medium">{editSuccess}</p>
              )}

              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditModalOpen(false)}
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
