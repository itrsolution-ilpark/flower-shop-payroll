"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import Button from "@/components/ui/Button";

function SignupContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const shopIdParam = searchParams.get("shop_id");

  const [shopName, setShopName] = useState<string>("");
  const [selectedShopId, setSelectedShopId] = useState<string>(shopIdParam || "");
  const [name, setName] = useState<string>("");
  const [pinCode, setPinCode] = useState<string>("");
  const [confirmPinCode, setConfirmPinCode] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!shopIdParam) {
      alert("플라워샵을 선택한 후 가입 신청해주세요.");
      router.push("/");
      return;
    }
    fetchShop(shopIdParam);
  }, [shopIdParam, router]);

  const fetchShop = async (id: string) => {
    try {
      const { data, error } = await supabase
        .from("shops")
        .select("id, name")
        .eq("id", id)
        .single();

      if (error || !data) {
        router.push("/");
        return;
      }
      setSelectedShopId(data.id);
      setShopName(data.name);
    } catch (err) {
      console.error("예외 발생:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!name.trim()) {
      setErrorMsg("직원 이름을 입력해주세요.");
      return;
    }

    if (!/^[0-9]{4}$/.test(pinCode)) {
      setErrorMsg("4자리 PIN 번호를 정확히 숫자로 입력해주세요.");
      return;
    }

    if (pinCode !== confirmPinCode) {
      setErrorMsg("PIN 번호와 PIN 확인이 일치하지 않습니다.");
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.from("staff").insert([
        {
          shop_id: selectedShopId,
          name: name.trim(),
          pin_code: pinCode,
          hourly_wage: 10000,
          is_admin: false,
          status: "pending",
        },
      ]);

      if (error) {
        console.error("회원가입 오류:", error);
        setErrorMsg("이미 등록된 직원이거나 신청 중 오류가 발생했습니다.");
        setLoading(false);
        return;
      }

      alert("관리자 승인 후 이용 가능합니다");
      router.push(`/shop/${selectedShopId}`);
    } catch (err) {
      console.error("예외 발생:", err);
      setErrorMsg("가입 처리 중 오류가 발생했습니다.");
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex flex-col flex-1 p-6 justify-center text-center text-xs text-subText">로딩 중...</div>;
  }

  const isFormValid =
    name.trim().length > 0 &&
    /^[0-9]{4}$/.test(pinCode) &&
    pinCode === confirmPinCode;

  return (
    <div className="flex flex-col flex-1 pt-6 px-4 pb-8 space-y-5">
      {/* 1. 상단 헤더: 매장명 표시 및 가입 신청 타이틀 */}
      <div className="bg-white p-5 rounded-xl border border-borderLine shadow-sm">
        <h1 className="text-base font-bold text-textColor">직원 가입 신청</h1>
        <p className="text-xs text-subText mt-0.5">
          매장 승인 완료 후 근무 및 급여 정산 이용이 가능합니다.
        </p>
        <div className="mt-2.5 inline-block px-3 py-1 bg-emerald-50 text-[#059669] rounded-lg text-xs font-semibold">
          소속 플라워샵: {shopName}
        </div>
      </div>

      {/* 2. 입력 폼: 직원 이름, 4자리 PIN, 4자리 PIN 확인 */}
      <form onSubmit={handleSignup} className="space-y-4 bg-white p-6 border border-borderLine rounded-xl shadow-sm">
        <div>
          <label className="block text-xs font-semibold text-textColor mb-1">
            직원 이름
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="직원 이름 입력"
            className="w-full min-h-[46px] h-[46px] px-3.5 border border-borderLine rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#059669]"
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
            className="w-full min-h-[46px] h-[46px] px-3.5 border border-borderLine rounded-xl text-center tracking-widest text-lg font-bold bg-white focus:outline-none focus:ring-2 focus:ring-[#059669]"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-textColor mb-1">
            4자리 PIN 확인
          </label>
          <input
            type="password"
            inputMode="numeric"
            maxLength={4}
            value={confirmPinCode}
            onChange={(e) => setConfirmPinCode(e.target.value.replace(/[^0-9]/g, ""))}
            placeholder="••••"
            className="w-full min-h-[46px] h-[46px] px-3.5 border border-borderLine rounded-xl text-center tracking-widest text-lg font-bold bg-white focus:outline-none focus:ring-2 focus:ring-[#059669]"
          />
        </div>

        {errorMsg && (
          <p className="text-xs text-rose-500 text-center font-medium">
            {errorMsg}
          </p>
        )}

        {/* 3. 액션 버튼: 가입 신청 완료 버튼 */}
        <div className="pt-2">
          <Button
            type="submit"
            variant="primary"
            disabled={!isFormValid || loading}
          >
            가입 신청 완료
          </Button>
        </div>

        <div className="text-center pt-1">
          <Link
            href={`/shop/${selectedShopId}`}
            className="text-xs text-[#059669] font-medium hover:underline"
          >
            플라워샵 메인으로 복귀
          </Link>
        </div>
      </form>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="flex flex-col flex-1 p-6 justify-center text-center text-xs text-subText">로딩 중...</div>}>
      <SignupContent />
    </Suspense>
  );
}
