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
      setErrorMsg("비밀은 숫자 4자리여야 합니다.");
      return;
    }

    if (pinCode !== confirmPinCode) {
      setErrorMsg("비밀 확인이 일치하지 않습니다.");
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.from("staff").insert([
        {
          shop_id: selectedShopId,
          name: name.trim(),
          pin_code: pinCode,
          status: "pending",
        },
      ]);

      if (error) {
        console.error("회원가입 오류:", error);
        setErrorMsg("이미 등록된 이름입니다.");
        setLoading(false);
        return;
      }

      alert("가입 신청이 완료되었습니다.");
      router.push(`/shop/${selectedShopId}`);
    } catch (err) {
      console.error("예외 발생:", err);
      setErrorMsg("이미 등록된 이름입니다.");
      setLoading(false);
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
          href={`/shop/${selectedShopId}`}
          className="px-3 min-h-[40px] h-[40px] border border-[#E2E8F0] rounded-xl text-xs text-[#0F172A] font-semibold hover:bg-slate-50 flex items-center gap-1.5 transition"
        >
          돌아가기
        </Link>
      </header>

      <div className="max-w-md mx-auto w-full p-4 md:p-6 space-y-6 my-auto">
        {/* ‘직원 가입 신청’ 카드 */}
        <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-sm space-y-5">
          <div className="text-center space-y-1">
            <h2 className="text-lg font-bold text-[#0F172A]">직원 가입 신청</h2>
            <p className="text-xs text-[#64748B]">
              플라워샵: <span className="font-semibold text-[#059669]">{shopName}</span>
            </p>
          </div>

          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                직원 이름
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="직원 이름"
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

            <div className="pt-2">
              <Button
                type="submit"
                variant="primary"
                disabled={!isFormValid || loading}
              >
                가입 신청 완료
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="flex flex-col flex-1 p-6 justify-center text-center text-xs text-[#64748B]">로딩 중...</div>}>
      <SignupContent />
    </Suspense>
  );
}
