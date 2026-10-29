"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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

      alert("대표 승인 후 이용 가능합니다");
      router.push(`/shop/${selectedShopId}`);
    } catch (err) {
      console.error("예외 발생:", err);
      setErrorMsg("가입 처리 중 오류가 발생했습니다.");
      setLoading(false);
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
          직원 회원가입 화면
        </h1>
        <p className="text-xs text-gray-600">
          소속 플라워샵에 가입 신청을 진행합니다. (PIN 2회 입력 검증)
        </p>
      </div>

      <form onSubmit={handleSignup} className="space-y-4 bg-white p-6 border border-gray-200 rounded-lg shadow-sm">
        <div>
          <label className="block text-xs font-semibold text-textColor mb-1">
            소속 플라워샵명
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
            직원 이름
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="직원 이름"
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

        <Button
          type="submit"
          variant="primary"
          disabled={!isFormValid || loading}
        >
          [가입 신청하기]
        </Button>

        <div className="text-center pt-2">
          <a
            href={`/shop/${selectedShopId}`}
            className="text-xs text-primary font-medium hover:underline"
          >
            허브 화면으로 돌아가기
          </a>
        </div>
      </form>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="flex flex-col flex-1 p-6 justify-center text-center text-xs text-gray-500">로딩 중...</div>}>
      <SignupContent />
    </Suspense>
  );
}
