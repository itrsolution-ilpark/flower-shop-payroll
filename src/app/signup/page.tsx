"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Button from "@/components/Button";

interface Shop {
  id: string;
  name: string;
}

function SignupContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const shopIdParam = searchParams.get("shop_id");

  const [shops, setShops] = useState<Shop[]>([]);
  const [selectedShopId, setSelectedShopId] = useState<string>(shopIdParam || "");
  const [name, setName] = useState<string>("");
  const [pinCode, setPinCode] = useState<string>("");
  const [confirmPinCode, setConfirmPinCode] = useState<string>("");
  const [hourlyWage, setHourlyWage] = useState<string>("10000");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    fetchShops();
  }, []);

  const fetchShops = async () => {
    try {
      const { data, error } = await supabase
        .from("shops")
        .select("id, name")
        .order("name", { ascending: true });

      if (error) {
        console.error("플라워샵 목록 조회 오류:", error);
      } else if (data) {
        setShops(data);
        if (!selectedShopId && data.length > 0) {
          setSelectedShopId(shopIdParam || data[0].id);
        }
      }
    } catch (err) {
      console.error("예외 발생:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!selectedShopId) {
      setErrorMsg("플라워샵을 선택해주세요.");
      return;
    }

    if (!name.trim()) {
      setErrorMsg("이름을 입력해주세요.");
      return;
    }

    if (!pinCode || pinCode.length !== 4 || isNaN(Number(pinCode))) {
      setErrorMsg("4자리 PIN 번호를 정확히 숫자로 입력해주세요.");
      return;
    }

    if (pinCode !== confirmPinCode) {
      setErrorMsg("PIN 번호가 일치하지 않습니다. (비밀번호 확인 불일치)");
      return;
    }

    const wageNum = parseInt(hourlyWage, 10);
    if (isNaN(wageNum) || wageNum <= 0) {
      setErrorMsg("올바른 시급을 입력해주세요.");
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.from("staff").insert([
        {
          shop_id: selectedShopId,
          name: name.trim(),
          pin_code: pinCode,
          hourly_wage: wageNum,
          is_admin: false,
          status: "pending",
        },
      ]);

      if (error) {
        console.error("회원가입 오류:", error);
        setErrorMsg("회원가입 중 오류가 발생했습니다.");
        setLoading(false);
        return;
      }

      alert("가입 신청이 완료되었습니다. 관리자 승인 후 로그인할 수 있습니다.");
      router.push("/");
    } catch (err) {
      console.error("예외 발생:", err);
      setErrorMsg("회원가입 처리 중 오류가 발생했습니다.");
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex flex-col flex-1 p-6 justify-center text-center">로딩 중...</div>;
  }

  return (
    <div className="flex flex-col flex-1 p-6 justify-center">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-primary mb-2">
          직원 회원가입 화면
        </h1>
        <p className="text-sm text-gray-600">
          플라워샵을 선택하고 정보를 입력하여 가입하세요. (PIN 2회 입력 검증)
        </p>
      </div>

      <form onSubmit={handleSignup} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-textColor mb-2">
            플라워샵 선택
          </label>
          <select
            value={selectedShopId}
            onChange={(e) => setSelectedShopId(e.target.value)}
            className="w-full h-12 px-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-white"
          >
            {shops.map((shop) => (
              <option key={shop.id} value={shop.id}>
                {shop.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-textColor mb-2">
            이름
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="홍길동"
            className="w-full h-12 px-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-textColor mb-2">
            4자리 PIN 번호
          </label>
          <input
            type="password"
            maxLength={4}
            value={pinCode}
            onChange={(e) => setPinCode(e.target.value)}
            placeholder="••••"
            className="w-full h-12 px-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-center tracking-widest text-lg"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-textColor mb-2">
            4자리 PIN 번호 확인
          </label>
          <input
            type="password"
            maxLength={4}
            value={confirmPinCode}
            onChange={(e) => setConfirmPinCode(e.target.value)}
            placeholder="••••"
            className="w-full h-12 px-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-center tracking-widest text-lg"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-textColor mb-2">
            희망 시급 (원)
          </label>
          <input
            type="number"
            value={hourlyWage}
            onChange={(e) => setHourlyWage(e.target.value)}
            placeholder="10000"
            className="w-full h-12 px-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-white"
          />
        </div>

        {errorMsg && (
          <p className="text-sm text-errorColor text-center font-medium">
            {errorMsg}
          </p>
        )}

        <Button type="submit" variant="primary" disabled={loading}>
          {loading ? "가입 신청 중..." : "가입 신청"}
        </Button>

        <div className="text-center pt-4">
          <a
            href="/"
            className="text-sm text-primary hover:underline font-medium"
          >
            이미 계정이 있으신가요? 로그인하기
          </a>
        </div>
      </form>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="flex flex-col flex-1 p-6 justify-center text-center">로딩 중...</div>}>
      <SignupContent />
    </Suspense>
  );
}
