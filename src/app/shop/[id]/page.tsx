"use client";

import React, { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import Button from "@/components/ui/Button";

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
  hourly_wage: number;
}

export default function ShopHubPage({ params }: ShopHubPageProps) {
  const resolvedParams = use(params);
  const shopId = resolvedParams.id;
  const router = useRouter();

  const [shop, setShop] = useState<Shop | null>(null);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [adminStaff, setAdminStaff] = useState<Staff | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // 로그인 모달 상태
  const [loginMode, setLoginMode] = useState<"none" | "admin" | "employee">("none");
  const [selectedStaffName, setSelectedStaffName] = useState<string>("");
  const [pinCode, setPinCode] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string>("");

  useEffect(() => {
    fetchShopAndStaff();
  }, [shopId]);

  const fetchShopAndStaff = async () => {
    setLoading(true);
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

      // 현재 shop_id 기준 관리자 조회 (단독 스코핑 버그 해결)
      const { data: adminData } = await supabase
        .from("staff")
        .select("id, name, is_admin, hourly_wage, status, pin_code")
        .eq("shop_id", shopId)
        .eq("is_admin", true)
        .limit(1)
        .maybeSingle();

      setAdminStaff(adminData || null);

      // 직원 목록
      const { data: staffData } = await supabase
        .from("staff")
        .select("id, name, is_admin, hourly_wage, status, pin_code")
        .eq("shop_id", shopId)
        .eq("is_admin", false)
        .order("name", { ascending: true });

      setStaffList(staffData || []);
    } catch (err) {
      console.error("예외 발생:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenLogin = (mode: "admin" | "employee") => {
    setLoginMode(mode);
    setSelectedStaffName(mode === "admin" && adminStaff ? adminStaff.name : "");
    setPinCode("");
    setErrorMsg("");
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!selectedStaffName.trim()) {
      setErrorMsg("이름을 선택하거나 입력해주세요.");
      return;
    }

    if (!/^[0-9]{4}$/.test(pinCode)) {
      setErrorMsg("4자리 PIN 번호를 정확히 숫자로 입력해주세요.");
      return;
    }

    if (loginMode === "admin") {
      if (!adminStaff) {
        setErrorMsg("등록된 대표 관리자가 없습니다.");
        return;
      }
      if (adminStaff.name !== selectedStaffName.trim() || adminStaff.pin_code !== pinCode) {
        setErrorMsg("대표 이름 또는 PIN 번호가 일치하지 않습니다.");
        return;
      }

      localStorage.setItem(
        "flower_shop_user",
        JSON.stringify({
          id: adminStaff.id,
          shop_id: shopId,
          name: adminStaff.name,
          is_admin: true,
          hourly_wage: adminStaff.hourly_wage,
          status: adminStaff.status,
        })
      );
      router.push("/admin");
      return;
    }

    if (loginMode === "employee") {
      const target = staffList.find((s) => s.name === selectedStaffName.trim());
      if (!target) {
        setErrorMsg("등록되지 않은 직원이거나 이름이 일치하지 않습니다.");
        return;
      }

      if (target.pin_code !== pinCode) {
        setErrorMsg("PIN 번호가 일치하지 않습니다.");
        return;
      }

      if (target.status !== "active") {
        if (target.status === "pending") {
          setErrorMsg("대표의 승인이 필요한 계정입니다.");
        } else if (target.status === "resigned") {
          setErrorMsg("퇴사 처리된 직원은 이용할 수 없습니다.");
        } else {
          setErrorMsg("이용할 수 없는 계정 상태입니다.");
        }
        return;
      }

      localStorage.setItem(
        "flower_shop_user",
        JSON.stringify({
          id: target.id,
          shop_id: shopId,
          name: target.name,
          is_admin: false,
          hourly_wage: target.hourly_wage,
          status: target.status,
        })
      );
      router.push("/employee/dashboard");
    }
  };

  if (loading) {
    return <div className="flex flex-col flex-1 p-6 justify-center text-center text-xs text-gray-500">로딩 중...</div>;
  }

  if (!shop) return null;

  return (
    <div className="flex flex-col flex-1 p-6 justify-center">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-bold text-primary">{shop.name}</h1>
          <p className="text-xs text-gray-500">플라워샵 허브 화면</p>
        </div>
        <a href="/" className="text-xs text-primary font-medium hover:underline">
          메인 화면으로 돌아가기
        </a>
      </div>

      {loginMode === "none" ? (
        <div className="space-y-4">
          {!adminStaff ? (
            <div className="p-6 bg-slate-50 border border-dashed border-gray-300 rounded-lg text-center space-y-4">
              <p className="text-sm font-semibold text-gray-700">
                등록된 대표 관리자가 없습니다.
              </p>
              <p className="text-xs text-gray-500">
                매장 운영을 시작하기 위해 플라워샵 대표를 먼저 등록하세요.
              </p>
              <Button
                variant="primary"
                onClick={() => router.push(`/admin/setup?shop_id=${shop.id}`)}
              >
                [플라워샵 대표 등록]
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <Button
                variant="primary"
                onClick={() => handleOpenLogin("admin")}
              >
                [플라워샵 대표 로그인]
              </Button>

              <Button
                variant="secondary"
                onClick={() => handleOpenLogin("employee")}
              >
                [직원 로그인]
              </Button>

              <Button
                variant="outline"
                onClick={() => router.push(`/signup?shop_id=${shop.id}`)}
              >
                [직원 가입 신청]
              </Button>
            </div>
          )}
        </div>
      ) : (
        <form onSubmit={handleLoginSubmit} className="space-y-5 bg-white p-6 border border-gray-200 rounded-lg shadow-sm">
          <div className="bg-slate-100 p-2.5 rounded text-center font-bold text-sm text-primary">
            {loginMode === "admin" ? "플라워샵 대표 로그인" : "직원 로그인"}
          </div>

          <div>
            <label className="block text-xs font-semibold text-textColor mb-1">
              이름
            </label>
            {loginMode === "admin" ? (
              <input
                type="text"
                value={selectedStaffName}
                onChange={(e) => setSelectedStaffName(e.target.value)}
                placeholder="대표 이름"
                className="w-full h-11 px-3 border border-gray-300 rounded-lg text-sm bg-white"
              />
            ) : (
              <select
                value={selectedStaffName}
                onChange={(e) => setSelectedStaffName(e.target.value)}
                className="w-full h-11 px-3 border border-gray-300 rounded-lg text-sm bg-white"
              >
                <option value="">직원 이름을 선택하세요</option>
                {staffList.map((st) => (
                  <option key={st.id} value={st.name}>
                    {st.name} {st.status === "pending" ? "(대기)" : ""}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-textColor mb-1">
              4자리 PIN 번호
            </label>
            <input
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={pinCode}
              onChange={(e) => setPinCode(e.target.value.replace(/[^0-9]/g, ""))}
              placeholder="••••"
              className="w-full h-12 text-center tracking-widest text-lg font-bold border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-white"
            />
          </div>

          {errorMsg && (
            <p className="text-xs text-errorColor text-center font-medium">
              {errorMsg}
            </p>
          )}

          <div className="space-y-2">
            <Button type="submit" variant="primary">
              로그인
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setLoginMode("none")}
            >
              뒤로
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
