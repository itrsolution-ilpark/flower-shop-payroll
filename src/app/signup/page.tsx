"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import ProgramBanner from "@/components/ProgramBanner";
import SecretField from "@/components/SecretField";
import Button from "@/components/ui/Button";
import { getShopsAction } from "@/actions/shopActions";
import { applyStaffAction } from "@/actions/staffActions";

function SignupContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const shopIdParam = searchParams.get("shop_id") || "";

  const [shopName, setShopName] = useState<string>("");
  const [name, setName] = useState<string>("");
  const [secret, setSecret] = useState<string>("");
  const [confirmSecret, setConfirmSecret] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (!shopIdParam) {
      router.push("/");
      return;
    }
    fetchShop(shopIdParam);
  }, [shopIdParam, router]);

  const fetchShop = async (id: string) => {
    try {
      const allShops = await getShopsAction();
      const currentShop = allShops.find((s) => s.id === id);
      if (!currentShop) {
        router.push("/");
        return;
      }
      setShopName(currentShop.name);
    } catch {
      router.push("/");
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

    if (secret.length !== 4) {
      setErrorMsg("비밀은 숫자 4자리여야 합니다.");
      return;
    }

    if (secret !== confirmSecret) {
      setErrorMsg("비밀 확인이 일치하지 않습니다.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await applyStaffAction(shopIdParam, name, secret, confirmSecret);
      if (!res.success) {
        setErrorMsg(res.error || "이미 등록된 이름입니다.");
        setSubmitting(false);
        return;
      }

      alert("가입 신청이 완료되었습니다.");
      router.push(`/shop/${shopIdParam}`);
    } catch {
      setErrorMsg("이미 등록된 이름입니다.");
      setSubmitting(false);
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
            href={`/shop/${shopIdParam}`}
            className="px-3 min-h-[40px] h-[40px] border border-[#E2E8F0] rounded-xl text-xs text-[#0F172A] font-semibold hover:bg-slate-50 flex items-center gap-1.5 transition"
          >
            돌아가기
          </Link>
        }
      />

      <main className="max-w-md mx-auto w-full p-4 md:p-6 space-y-6 my-auto">
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

            <SecretField
              label="비밀"
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

            <div className="pt-2">
              <Button type="submit" variant="primary" disabled={submitting}>
                {submitting ? "신청 처리 중..." : "가입 신청 완료"}
              </Button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}

export default function SignupPage() {
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
      <SignupContent />
    </Suspense>
  );
}
