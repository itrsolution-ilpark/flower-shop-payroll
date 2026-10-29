"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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

      // 버그 원천 해결: 타 매장과 무관하게 정확히 현재 shop_id 기준 WHERE shop_id = :shopId AND is_admin = true
      const { data: adminData } = await supabase
        .from("staff")
        .select("id, name, pin_code, is_admin, hourly_wage, status")
        .eq("shop_id", targetShopId)
        .eq("is_admin", true)
        .limit(1)
        .maybeSingle();

      if (adminData) {
        setExistingAdmin(adminData);
        setIsEditMode(true);
        setName(adminData.name);
        setPinCode(adminData.pin_code);
        setConfirmPinCode(adminData.pin_code);
      } else {
        setExistingAdmin(null);
        setIsEditMode(false);
        setName("");
        setPinCode("");
        setConfirmPinCode("");
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
      setErrorMsg("대표 이름을 입력해주세요.");
      return;
    }

    if (!/^[0-9]{4}$/.test(pinCode)) {
      setErrorMsg("4자리 PIN 번호를 정확히 숫자로 입력해주세요.");
      return;
    }

    if (pinCode !== confirmPinCode) {
      setErrorMsg("PIN 확인이 일치하지 않습니다.");
      return;
    }

    try {
      if (isEditMode && existingAdmin) {
        const { error } = await supabase
          .from("staff")
          .update({
            name: name.trim(),
            pin_code: pinCode,
            status: "active",
          })
          .eq("id", existingAdmin.id);

        if (error) {
          console.error("수정 오류:", error);
          setErrorMsg("대표 정보 수정 중 오류가 발생했습니다.");
          return;
        }

        setSuccessMsg("대표 정보가 성공적으로 수정되었습니다.");
        setTimeout(() => {
          router.push(`/shop/${shopId}`);
        }, 800);
      } else {
        // 등록 모드: 엄격히 현재 shop_id 기준 존재 여부만 체크
        const { data: checkData } = await supabase
          .from("staff")
          .select("id")
          .eq("shop_id", shopId)
          .eq("is_admin", true)
          .limit(1);

        if (checkData && checkData.length > 0) {
          setErrorMsg("이미 해당 플라워샵에 관리자가 존재합니다.");
          return;
        }

        const { error } = await supabase.from("staff").insert([
          {
            shop_id: shopId,
            name: name.trim(),
            pin_code: pinCode,
            hourly_wage: 0,
            is_admin: true,
            status: "active",
          },
        ]);

        if (error) {
          console.error("등록 오류:", error);
          setErrorMsg("관리자 등록 중 오류가 발생했습니다.");
          return;
        }

        alert("플라워샵 대표가 등록되었습니다. 허브 화면으로 이동합니다.");
        router.push(`/shop/${shopId}`);
      }
    } catch (err) {
      console.error("예외 발생:", err);
      setErrorMsg("처리 중 오류가 발생했습니다.");
    }
  };

  if (loading) {
    return <div className="flex flex-col flex-1 p-6 justify-center text-center text-xs text-gray-500">로딩 중...</div>;
  }

  const isFormValid =
    name.trim().length > 0 &&
    /^[0-9]{4}$/.test(pinCode) &&
    pinCode === confirmPinCode;

  return (
    <div className="flex flex-col flex-1 p-6 justify-center">
      <div className="text-center mb-6">
        <h1 className="text-xl font-bold text-primary mb-1">
          플라워샵별 관리자 등록 화면
        </h1>
        <p className="text-xs text-gray-600">
          {isEditMode
            ? "기존 대표 정보 수정 모드"
            : "신규 대표 관리자 등록 모드 (PIN 2회 입력 검증)"}
        </p>
      </div>

      <form onSubmit={handleSaveAdmin} className="space-y-4 bg-white p-6 border border-gray-200 rounded-lg shadow-sm">
        <div>
          <label className="block text-xs font-semibold text-textColor mb-1">
            플라워샵명
          </label>
          <input
            type="text"
            value={shopName}
            disabled
            className="w-full h-11 px-3 border border-gray-200 rounded-lg bg-gray-100 text-gray-700 text-sm font-semibold cursor-not-allowed"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-textColor mb-1">
            대표 이름
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="대표 관리자 이름"
            className="w-full h-11 px-3 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-textColor mb-1">
            4자리 PIN
          </label>
          <input
            type="password"
            inputMode="numeric"
            maxLength={4}
            value={pinCode}
            onChange={(e) => setPinCode(e.target.value.replace(/[^0-9]/g, ""))}
            placeholder="••••"
            className="w-full h-11 px-3 border border-gray-300 rounded-lg text-center tracking-widest text-lg font-bold bg-white focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-textColor mb-1">
            PIN 확인
          </label>
          <input
            type="password"
            inputMode="numeric"
            maxLength={4}
            value={confirmPinCode}
            onChange={(e) => setConfirmPinCode(e.target.value.replace(/[^0-9]/g, ""))}
            placeholder="••••"
            className="w-full h-11 px-3 border border-gray-300 rounded-lg text-center tracking-widest text-lg font-bold bg-white focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {errorMsg && (
          <p className="text-xs text-errorColor text-center font-medium">
            {errorMsg}
          </p>
        )}
        {successMsg && (
          <p className="text-xs text-emerald text-center font-medium">
            {successMsg}
          </p>
        )}

        <Button
          type="submit"
          variant="primary"
          disabled={!isFormValid}
        >
          {isEditMode ? "대표 정보 수정" : "대표 등록"}
        </Button>

        <div className="text-center pt-2">
          <a
            href={`/shop/${shopId}`}
            className="text-xs text-primary font-medium hover:underline"
          >
            플라워샵 허브로 돌아가기
          </a>
        </div>
      </form>
    </div>
  );
}

export default function AdminSetupPage() {
  return (
    <Suspense fallback={<div className="flex flex-col flex-1 p-6 justify-center text-center text-xs text-gray-500">로딩 중...</div>}>
      <AdminSetupContent />
    </Suspense>
  );
}
