"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Button from "@/components/Button";

interface Shop {
  id: string;
  name: string;
}

function AdminSetupContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const shopIdParam = searchParams.get("shop_id");

  const [shops, setShops] = useState<Shop[]>([]);
  const [selectedShopId, setSelectedShopId] = useState<string>(shopIdParam || "");
  const [name, setName] = useState<string>("");
  const [pinCode, setPinCode] = useState<string>("");
  const [confirmPinCode, setConfirmPinCode] = useState<string>("");
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
        console.error("화원 목록 조회 오류:", error);
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

  const handleSetupAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!selectedShopId) {
      setErrorMsg("화원을 선택해주세요.");
      return;
    }

    if (!name.trim()) {
      setErrorMsg("관리자 이름을 입력해주세요.");
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

    // 중복 관리자 확인 (SPEC v8 요구사항: "이미 관리자가 등록된 화원입니다")
    try {
      const { data: existingAdmin, error: queryError } = await supabase
        .from("staff")
        .select("id")
        .eq("shop_id", selectedShopId)
        .eq("is_admin", true);

      if (queryError) {
        console.error("관리자 존재 여부 확인 오류:", queryError);
      }

      if (existingAdmin && existingAdmin.length > 0) {
        setErrorMsg("이미 관리자가 등록된 화원입니다");
        return;
      }

      const { error } = await supabase.from("staff").insert([
        {
          shop_id: selectedShopId,
          name: name.trim(),
          pin_code: pinCode,
          hourly_wage: 0,
          is_admin: true,
          status: "active",
        },
      ]);

      if (error) {
        console.error("관리자 등록 오류:", error);
        setErrorMsg("이미 관리자가 등록된 화원입니다");
        return;
      }

      alert("화원별 관리자 설정이 완료되었습니다.");
      router.push("/");
    } catch (err) {
      console.error("예외 발생:", err);
      setErrorMsg("이미 관리자가 등록된 화원입니다");
    }
  };

  if (loading) {
    return <div className="flex flex-col flex-1 p-6 justify-center text-center">로딩 중...</div>;
  }

  return (
    <div className="flex flex-col flex-1 p-6 justify-center">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-primary mb-2">
          화원별 최초 관리자 등록 화면
        </h1>
        <p className="text-sm text-gray-600">
          화원을 선택하고 관리자 계정 정보를 입력하세요. (PIN 2회 입력 검증)
        </p>
      </div>

      <form onSubmit={handleSetupAdmin} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-textColor mb-2">
            화원 선택
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
            관리자 이름
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="점장님"
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

        {errorMsg && (
          <p className="text-sm text-errorColor text-center font-medium">
            {errorMsg}
          </p>
        )}

        <Button type="submit" variant="primary">
          등록 완료
        </Button>

        <div className="text-center pt-2">
          <a
            href="/"
            className="text-sm text-primary hover:underline font-medium"
          >
            메인 화면으로 돌아가기
          </a>
        </div>
      </form>
    </div>
  );
}

export default function AdminSetupPage() {
  return (
    <Suspense fallback={<div className="flex flex-col flex-1 p-6 justify-center text-center">로딩 중...</div>}>
      <AdminSetupContent />
    </Suspense>
  );
}
