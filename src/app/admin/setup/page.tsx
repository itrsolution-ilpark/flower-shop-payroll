"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import ProgramBanner from "@/components/ProgramBanner";
import SecretField from "@/components/SecretField";
import Button from "@/components/ui/Button";
import { getShopsAction } from "@/actions/shopActions";
import { getShopAdminAction, registerShopAdminAction, updateShopAdminAction } from "@/actions/shopAdminActions";

function AdminSetupContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const shopId = searchParams.get("shop_id");

  const [shopName, setShopName] = useState<string>("");
  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const [name, setName] = useState<string>("");
  const [currentSecret, setCurrentSecret] = useState<string>("");
  const [secret, setSecret] = useState<string>("");
  const [confirmSecret, setConfirmSecret] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [successMsg, setSuccessMsg] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!shopId) {
      router.push("/");
      return;
    }
    fetchShopAndAdmin(shopId);
  }, [shopId, router]);

  const fetchShopAndAdmin = async (id: string) => {
    setLoading(true);
    try {
      const allShops = await getShopsAction();
      const currentShop = allShops.find((s) => s.id === id);
      if (!currentShop) {
        router.push("/");
        return;
      }
      setShopName(currentShop.name);

      const admin = await getShopAdminAction(id);
      if (admin) {
        setIsEditMode(true);
        setName(admin.name);
      } else {
        setIsEditMode(false);
      }
    } catch {
      router.push("/");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!shopId) return;

    if (!name.trim()) {
      setErrorMsg("관리자 이름을 입력해주세요.");
      return;
    }

    if (secret.length !== 4) {
      setErrorMsg("비밀은 숫자 4자리여야 합니다.");
      return;
    }

    if (secret !== confirmSecret) {
      setErrorMsg("비밀 확인이 일치하지 않습니다.");
      return;
    }

    try {
      if (isEditMode) {
        const res = await updateShopAdminAction(
          shopId,
          currentSecret,
          name,
          secret,
          confirmSecret
        );
        if (!res.success) {
          setErrorMsg(res.error || "관리자 정보 수정 중 오류가 발생했습니다.");
          return;
        }
        setSuccessMsg("관리자 정보가 성공적으로 수정되었습니다.");
        setTimeout(() => router.push(`/shop/${shopId}`), 800);
      } else {
        const res = await registerShopAdminAction(shopId, name, secret, confirmSecret);
        if (!res.success) {
          setErrorMsg(res.error || "관리자 등록 중 오류가 발생했습니다.");
          return;
        }
        setSuccessMsg("관리자 등록이 완료되었습니다.");
        setTimeout(() => router.push(`/shop/${shopId}`), 800);
      }
    } catch {
      setErrorMsg("처리 중 오류가 발생했습니다.");
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

  return (
    <div className="flex flex-col flex-1">
      {/* 최상단 공통 프로그램 배너 */}
      <ProgramBanner
        rightElement={
          <Link
            href={`/shop/${shopId}`}
            className="px-3 min-h-[40px] h-[40px] border border-[#E2E8F0] rounded-xl text-xs text-[#0F172A] font-semibold hover:bg-slate-50 flex items-center gap-1.5 transition"
          >
            돌아가기
          </Link>
        }
      />

      <main className="max-w-md mx-auto w-full p-4 md:p-6 space-y-6 my-auto">
        {/* ‘플라워샵별 관리자 등록’ 카드 */}
        <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-sm space-y-5">
          <div className="text-center space-y-1">
            <h2 className="text-lg font-bold text-[#0F172A]">플라워샵별 관리자 등록</h2>
            <p className="text-xs text-[#64748B]">
              수정 불가 플라워샵: <span className="font-semibold text-[#059669]">{shopName}</span>
            </p>
          </div>

          <form onSubmit={handleSaveAdmin} className="space-y-4">
            {isEditMode && (
              <SecretField
                label="현재 비밀"
                value={currentSecret}
                onChange={setCurrentSecret}
              />
            )}

            <div>
              <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                관리자 이름
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="관리자 이름"
                className="w-full min-h-[46px] h-[46px] px-3.5 border border-[#E2E8F0] rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#059669]"
              />
            </div>

            <SecretField
              label={isEditMode ? "새 비밀" : "비밀"}
              value={secret}
              onChange={setSecret}
            />

            <SecretField
              label="비밀 확인"
              value={confirmSecret}
              onChange={setConfirmSecret}
            />

            {errorMsg && (
              <p className="text-xs text-rose-500 text-center font-medium">
                {errorMsg}
              </p>
            )}
            {successMsg && (
              <p className="text-xs text-[#059669] text-center font-medium">
                {successMsg}
              </p>
            )}

            <div className="pt-2">
              <Button type="submit" variant="primary">
                관리자 정보 저장
              </Button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}

export default function AdminSetupPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col flex-1">
          <ProgramBanner />
          <div className="flex flex-1 items-center justify-center p-6 text-xs text-[#64748B]">
            로딩 중...
          </div>
        </div>
      }
    >
      <AdminSetupContent />
    </Suspense>
  );
}
