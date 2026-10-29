"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import Button from "@/components/ui/Button";

interface StaffAdmin {
  id: string;
  name: string;
  pin_code: string;
}

function AdminSetupContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const shopId = searchParams.get("shop_id");

  const [shopName, setShopName] = useState<string>("");
  const [name, setName] = useState<string>("");
  const [pinCode, setPinCode] = useState<string>("");
  const [confirmPinCode, setConfirmPinCode] = useState<string>("");

  const [existingAdmin, setExistingAdmin] = useState<StaffAdmin | null>(null);
  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [successMsg, setSuccessMsg] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!shopId) {
      alert("플라워샵을 먼저 선택해주세요.");
      router.push("/");
      return;
    }
    fetchShopAndAdmin(shopId);
  }, [shopId, router]);

  const fetchShopAndAdmin = async (targetShopId: string) => {
    setLoading(true);
    try {
      const { data: shopData, error: shopError } = await supabase
        .from("shops")
        .select("id, name")
        .eq("id", targetShopId)
        .single();

      if (shopError || !shopData) {
        console.error("플라워샵 조회 실패:", shopError);
        router.push("/");
        return;
      }
      setShopName(shopData.name);

      const { data: adminData } = await supabase
        .from("shop_admins")
        .select("id, name, pin_hash")
        .eq("shop_id", targetShopId)
        .maybeSingle();

      if (adminData) {
        setExistingAdmin({
          id: adminData.id,
          name: adminData.name,
          pin_code: adminData.pin_hash,
        });
        setIsEditMode(true);
        setName(adminData.name);
        setPinCode(adminData.pin_hash);
        setConfirmPinCode(adminData.pin_hash);
      } else {
        const { data: legacyAdmin } = await supabase
          .from("staff")
          .select("id, name, pin_code")
          .eq("shop_id", targetShopId)
          .eq("is_admin", true)
          .limit(1)
          .maybeSingle();

        if (legacyAdmin) {
          setExistingAdmin(legacyAdmin);
          setIsEditMode(true);
          setName(legacyAdmin.name);
          setPinCode(legacyAdmin.pin_code);
          setConfirmPinCode(legacyAdmin.pin_code);
        } else {
          setExistingAdmin(null);
          setIsEditMode(false);
          setName("");
          setPinCode("");
          setConfirmPinCode("");
        }
      }
    } catch (err) {
      console.error("예외 발생:", err);
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

    if (!/^[0-9]{4}$/.test(pinCode)) {
      setErrorMsg("비밀은 숫자 4자리여야 합니다.");
      return;
    }

    if (pinCode !== confirmPinCode) {
      setErrorMsg("비밀 확인이 일치하지 않습니다.");
      return;
    }

    try {
      if (isEditMode && existingAdmin) {
        const { error } = await supabase
          .from("shop_admins")
          .update({
            name: name.trim(),
            pin_hash: pinCode,
          })
          .eq("shop_id", shopId);

        if (error) {
          await supabase.from("staff").update({
            name: name.trim(),
            pin_code: pinCode,
          }).eq("id", existingAdmin.id);
        }

        setSuccessMsg("관리자 정보가 성공적으로 수정되었습니다.");
        setTimeout(() => {
          router.push(`/shop/${shopId}`);
        }, 800);
      } else {
        const { data: checkData } = await supabase
          .from("shop_admins")
          .select("id")
          .eq("shop_id", shopId)
          .maybeSingle();

        if (checkData) {
          setErrorMsg("이미 해당 플라워샵에 관리자가 존재합니다.");
          return;
        }

        const { error } = await supabase.from("shop_admins").insert([
          {
            shop_id: shopId,
            name: name.trim(),
            pin_hash: pinCode,
          },
        ]);

        if (error) {
          console.error("등록 오류:", error);
          setErrorMsg("관리자 등록 중 오류가 발생했습니다.");
          return;
        }

        alert("플라워샵 관리자가 등록되었습니다.");
        router.push(`/shop/${shopId}`);
      }
    } catch (err) {
      console.error("예외 발생:", err);
      setErrorMsg("처리 중 오류가 발생했습니다.");
    }
  };

  if (loading) {
    return <div className="flex flex-col flex-1 p-6 justify-center text-center text-xs text-[#64748B]">로딩 중...</div>;
  }

  const isFormValid =
    name.trim().length > 0 &&
    /^[0-9]{4}$/.test(pinCode) &&
    pinCode === confirmPinCode;

  return (
    <div className="flex flex-col flex-1">
      {/* 공통 배너 */}
      <header className="bg-white border-b border-[#E2E8F0] px-4 md:px-6 h-[56px] md:h-[64px] flex items-center justify-between sticky top-0 z-40">
        <h1 className="text-lg md:text-xl font-bold text-[#0F172A] tracking-tight">
          플라워샵 근무 관리
        </h1>
        <Link
          href={`/shop/${shopId}`}
          className="px-3 min-h-[40px] h-[40px] border border-[#E2E8F0] rounded-xl text-xs text-[#0F172A] font-semibold hover:bg-slate-50 flex items-center gap-1.5 transition"
        >
          돌아가기
        </Link>
      </header>

      <div className="max-w-md mx-auto w-full p-4 md:p-6 space-y-6 my-auto">
        {/* ‘플라워샵별 관리자 등록’ 카드 */}
        <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-sm space-y-5">
          <div className="text-center space-y-1">
            <h2 className="text-lg font-bold text-[#0F172A]">플라워샵별 관리자 등록</h2>
            <p className="text-xs text-[#64748B]">
              플라워샵 이름: <span className="font-semibold text-[#059669]">{shopName}</span>
            </p>
          </div>

          <form onSubmit={handleSaveAdmin} className="space-y-4">
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

            <div>
              <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                비밀
              </label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={pinCode}
                onChange={(e) => setPinCode(e.target.value.replace(/[^0-9]/g, ""))}
                placeholder="••••"
                className="w-full min-h-[46px] h-[46px] px-3.5 border border-[#E2E8F0] rounded-xl text-center tracking-widest text-lg font-bold bg-white focus:outline-none focus:ring-2 focus:ring-[#059669]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                비밀 확인
              </label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={confirmPinCode}
                onChange={(e) => setConfirmPinCode(e.target.value.replace(/[^0-9]/g, ""))}
                placeholder="••••"
                className="w-full min-h-[46px] h-[46px] px-3.5 border border-[#E2E8F0] rounded-xl text-center tracking-widest text-lg font-bold bg-white focus:outline-none focus:ring-2 focus:ring-[#059669]"
              />
            </div>

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
              <Button
                type="submit"
                variant="primary"
                disabled={!isFormValid}
              >
                관리자 정보 저장
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function AdminSetupPage() {
  return (
    <Suspense fallback={<div className="flex flex-col flex-1 p-6 justify-center text-center text-xs text-[#64748B]">로딩 중...</div>}>
      <AdminSetupContent />
    </Suspense>
  );
}
