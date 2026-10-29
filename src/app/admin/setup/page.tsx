"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Button from "@/components/Button";

interface Shop {
  id: string;
  name: string;
}

interface ExistingAdmin {
  id: string;
  name: string;
  pin_code: string;
}

function AdminSetupContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const shopIdParam = searchParams.get("shop_id");

  const [shops, setShops] = useState<Shop[]>([]);
  const [selectedShopId, setSelectedShopId] = useState<string>(shopIdParam || "");
  const [selectedShopName, setSelectedShopName] = useState<string>("");
  
  const [name, setName] = useState<string>("");
  const [pinCode, setPinCode] = useState<string>("");
  const [confirmPinCode, setConfirmPinCode] = useState<string>("");
  
  const [existingAdmin, setExistingAdmin] = useState<ExistingAdmin | null>(null);
  const [isEditMode, setIsEditMode] = useState<boolean>(false);

  const [errorMsg, setErrorMsg] = useState<string>("");
  const [successMsg, setSuccessMsg] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    fetchShopsAndAdmin(shopIdParam);
  }, [shopIdParam]);

  const fetchShopsAndAdmin = async (targetShopId?: string | null) => {
    setLoading(true);
    try {
      const { data: shopData, error: shopError } = await supabase
        .from("shops")
        .select("id, name")
        .order("name", { ascending: true });

      if (shopError) {
        console.error("화원 목록 조회 오류:", shopError);
      } else if (shopData && shopData.length > 0) {
        setShops(shopData);
        
        let activeId = targetShopId;
        if (!activeId || !shopData.some(s => s.id === activeId)) {
          activeId = shopData[0].id;
        }
        
        const validActiveId = activeId as string;
        setSelectedShopId(validActiveId);
        const currentShop = shopData.find(s => s.id === validActiveId);
        if (currentShop) {
          setSelectedShopName(currentShop.name);
        }

        await checkAdminForShop(validActiveId);
      }
    } catch (err) {
      console.error("예외 발생:", err);
    } finally {
      setLoading(false);
    }
  };

  const checkAdminForShop = async (shopId: string) => {
    try {
      const { data, error } = await supabase
        .from("staff")
        .select("id, name, pin_code")
        .eq("shop_id", shopId)
        .eq("is_admin", true)
        .maybeSingle();

      if (error) {
        console.error("관리자 조회 오류:", error);
      }

      if (data) {
        setExistingAdmin(data);
        setIsEditMode(true);
        setName(data.name);
        setPinCode(data.pin_code);
        setConfirmPinCode(data.pin_code);
      } else {
        setExistingAdmin(null);
        setIsEditMode(false);
        setName("");
        setPinCode("");
        setConfirmPinCode("");
      }
    } catch (err) {
      console.error("예외 발생:", err);
    }
  };

  const handleShopChange = async (newShopId: string) => {
    setSelectedShopId(newShopId);
    const found = shops.find(s => s.id === newShopId);
    if (found) {
      setSelectedShopName(found.name);
    }
    setErrorMsg("");
    setSuccessMsg("");
    await checkAdminForShop(newShopId);
  };

  const handleSetupAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

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

    try {
      if (isEditMode && existingAdmin) {
        // 수정 모드
        const { error } = await supabase
          .from("staff")
          .update({
            name: name.trim(),
            pin_code: pinCode,
          })
          .eq("id", existingAdmin.id);

        if (error) {
          console.error("관리자 수정 오류:", error);
          setErrorMsg("관리자 정보 수정 중 오류가 발생했습니다.");
          return;
        }

        setSuccessMsg("관리자 정보가 성공적으로 수정되었습니다.");
        setTimeout(() => {
          router.push("/");
        }, 1000);
      } else {
        // 신규 등록 모드 (중복 체크 포함)
        const { data: existingCheck } = await supabase
          .from("staff")
          .select("id")
          .eq("shop_id", selectedShopId)
          .eq("is_admin", true);

        if (existingCheck && existingCheck.length > 0) {
          setErrorMsg("이미 해당 화원에 관리자가 존재합니다.");
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
          setErrorMsg("이미 해당 화원에 관리자가 존재합니다.");
          return;
        }

        alert("화원별 관리자 설정이 완료되었습니다.");
        router.push("/");
      }
    } catch (err) {
      console.error("예외 발생:", err);
      setErrorMsg("처리 중 오류가 발생했습니다.");
    }
  };

  if (loading) {
    return <div className="flex flex-col flex-1 p-6 justify-center text-center">로딩 중...</div>;
  }

  return (
    <div className="flex flex-col flex-1 p-6 justify-center">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-primary mb-2">
          화원별 관리자 등록 화면
        </h1>
        <p className="text-sm text-gray-600">
          {isEditMode
            ? "이미 등록된 관리자 내역입니다. 정보를 수정할 수 있습니다."
            : "선택된 화원의 최초 관리자 계정을 등록합니다. (PIN 2회 입력 검증)"}
        </p>
      </div>

      <form onSubmit={handleSetupAdmin} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-textColor mb-2">
            선택된 화원 (수정 불가)
          </label>
          <div className="flex items-center">
            <select
              value={selectedShopId}
              onChange={(e) => handleShopChange(e.target.value)}
              disabled={true}
              className="w-full h-12 px-3 border border-gray-300 rounded-lg bg-gray-100 text-textColor font-semibold cursor-not-allowed"
            >
              {shops.map((shop) => (
                <option key={shop.id} value={shop.id}>
                  {shop.name}
                </option>
              ))}
            </select>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            * 초기 화면에서 선택한 화원이 고정되어 있습니다.
          </p>
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
            className="w-full h-12 px-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-center tracking-widest text-lg bg-white"
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
            className="w-full h-12 px-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-center tracking-widest text-lg bg-white"
          />
        </div>

        {errorMsg && (
          <p className="text-sm text-errorColor text-center font-medium">
            {errorMsg}
          </p>
        )}

        {successMsg && (
          <p className="text-sm text-primary text-center font-medium">
            {successMsg}
          </p>
        )}

        <Button type="submit" variant="primary">
          {isEditMode ? "관리자 정보 수정" : "등록 완료"}
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
