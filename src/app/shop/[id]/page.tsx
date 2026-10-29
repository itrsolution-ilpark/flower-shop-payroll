"use client";

import React, { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Button from "@/components/Button";

interface ShopHubPageProps {
  params: Promise<{
    id: string;
  }>;
}

interface Shop {
  id: string;
  name: string;
}

interface Staff {
  id: string;
  name: string;
  is_admin: boolean;
  status: string;
  pin_code: string;
}

export default function ShopHubPage({ params }: ShopHubPageProps) {
  const resolvedParams = use(params);
  const shopId = resolvedParams.id;
  const router = useRouter();

  const [shop, setShop] = useState<Shop | null>(null);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // 로그인 모달/상태
  const [loginMode, setLoginMode] = useState<"none" | "admin" | "employee">("none");
  const [selectedStaffId, setSelectedStaffId] = useState<string>("");
  const [pinCode, setPinCode] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string>("");

  useEffect(() => {
    fetchShopAndStaff();
  }, [shopId]);

  const fetchShopAndStaff = async () => {
    try {
      const { data: shopData, error: shopError } = await supabase
        .from("shops")
        .select("*")
        .eq("id", shopId)
        .single();

      if (shopError || !shopData) {
        console.error("플라워샵 조회 오류:", shopError);
        router.push("/");
        return;
      }

      setShop(shopData);

      const { data: staffData, error: staffError } = await supabase
        .from("staff")
        .select("*")
        .eq("shop_id", shopId)
        .order("name", { ascending: true });

      if (staffError) {
        console.error("직원/관리자 목록 조회 오류:", staffError);
      } else if (staffData) {
        setStaffList(staffData);
      }
    } catch (err) {
      console.error("예외 발생:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenLogin = (mode: "admin" | "employee") => {
    setLoginMode(mode);
    setSelectedStaffId("");
    setPinCode("");
    setErrorMsg("");
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!selectedStaffId) {
      setErrorMsg("계정을 선택해주세요.");
      return;
    }

    if (!pinCode || pinCode.length !== 4) {
      setErrorMsg("4자리 PIN 번호를 정확히 입력해주세요.");
      return;
    }

    const targetStaff = staffList.find((s) => s.id === selectedStaffId);
    if (!targetStaff) {
      setErrorMsg("존재하지 않는 계정입니다.");
      return;
    }

    if (targetStaff.pin_code !== pinCode) {
      setErrorMsg("PIN 번호가 일치하지 않습니다.");
      return;
    }

    if (loginMode === "admin" && !targetStaff.is_admin) {
      setErrorMsg("해당 계정은 관리자 권한이 없습니다.");
      return;
    }

    if (loginMode === "employee") {
      if (targetStaff.is_admin) {
        setErrorMsg("관리자 계정은 직원 로그인 메뉴를 이용할 수 없습니다.");
        return;
      }
      if (targetStaff.status !== "active") {
        if (targetStaff.status === "pending") {
          setErrorMsg("승인 대기 중인 계정입니다. 관리자 승인 후 로그인할 수 있습니다.");
        } else if (targetStaff.status === "resigned") {
          setErrorMsg("퇴사 처리된 계정입니다. 로그인이 제한됩니다.");
        } else {
          setErrorMsg("로그인할 수 없는 상태입니다.");
        }
        return;
      }
    }

    // 세션 저장
    localStorage.setItem(
      "flower_shop_user",
      JSON.stringify({
        id: targetStaff.id,
        shop_id: shopId,
        name: targetStaff.name,
        is_admin: targetStaff.is_admin,
        status: targetStaff.status,
      })
    );

    if (targetStaff.is_admin) {
      router.push("/admin");
    } else {
      router.push("/employee/dashboard");
    }
  };

  if (loading) {
    return <div className="flex flex-col flex-1 p-6 justify-center text-center">로딩 중...</div>;
  }

  if (!shop) return null;

  const adminStaff = staffList.filter((s) => s.is_admin);
  const employeeStaff = staffList.filter((s) => !s.is_admin);
  const hasAdmin = adminStaff.length > 0;

  return (
    <div className="flex flex-col flex-1 p-6 justify-center">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-primary mb-2">
          {shop.name} 허브 화면
        </h1>
        <p className="text-sm text-gray-600">
          관리자 또는 직원 메뉴를 선택하여 로그인하거나 등록하세요.
        </p>
      </div>

      {loginMode === "none" ? (
        <div className="space-y-4">
          {!hasAdmin ? (
            <Button
              variant="primary"
              onClick={() => router.push(`/admin/setup?shop_id=${shop.id}`)}
            >
              관리자 등록
            </Button>
          ) : (
            <>
              <Button
                variant="primary"
                onClick={() => handleOpenLogin("admin")}
              >
                관리자 로그인
              </Button>

              <Button
                variant="secondary"
                onClick={() => handleOpenLogin("employee")}
              >
                직원 로그인
              </Button>

              <div className="pt-2 text-center">
                <a
                  href={`/signup?shop_id=${shop.id}`}
                  className="text-sm text-primary hover:underline font-medium"
                >
                  직원 가입
                </a>
              </div>
            </>
          )}

          <div className="pt-6 text-center">
            <a
              href="/"
              className="text-xs text-gray-500 hover:underline"
            >
              ← 다른 플라워샵 선택하기
            </a>
          </div>
        </div>
      ) : (
        <form onSubmit={handleLoginSubmit} className="space-y-6">
          <div className="bg-background p-3 rounded-lg text-center font-bold text-primary text-sm">
            {loginMode === "admin" ? "관리자 로그인" : "직원 로그인"}
          </div>

          <div>
            <label className="block text-sm font-medium text-textColor mb-2">
              이름 선택
            </label>
            <select
              value={selectedStaffId}
              onChange={(e) => setSelectedStaffId(e.target.value)}
              className="w-full h-12 px-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-white"
            >
              <option value="">이름을 선택하세요</option>
              {(loginMode === "admin" ? adminStaff : employeeStaff).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} {loginMode === "employee" ? `(${s.status})` : ""}
                </option>
              ))}
            </select>
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

          {errorMsg && (
            <p className="text-sm text-errorColor text-center font-medium">
              {errorMsg}
            </p>
          )}

          <div className="space-y-2">
            <Button type="submit" variant="primary">
              로그인 확인
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setLoginMode("none")}
            >
              뒤로 가기
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
