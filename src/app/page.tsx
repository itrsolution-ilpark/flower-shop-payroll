"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Button from "@/components/Button";

interface Shop {
  id: string;
  name: string;
}

interface Staff {
  id: string;
  shop_id: string;
  name: string;
  is_admin: boolean;
  hourly_wage: number;
  status: string;
}

export default function LoginPage() {
  const router = useRouter();
  const [shops, setShops] = useState<Shop[]>([]);
  const [selectedShopId, setSelectedShopId] = useState<string>("");
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [selectedStaffId, setSelectedStaffId] = useState<string>("");
  const [pinCode, setPinCode] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string>("");

  useEffect(() => {
    fetchShops();
  }, []);

  useEffect(() => {
    if (selectedShopId) {
      fetchStaffByShop(selectedShopId);
    } else {
      setStaffList([]);
      setSelectedStaffId("");
    }
  }, [selectedShopId]);

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
        if (data.length > 0) {
          setSelectedShopId(data[0].id);
        }
      }
    } catch (err) {
      console.error("예외 발생:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStaffByShop = async (shopId: string) => {
    try {
      const { data, error } = await supabase
        .from("staff")
        .select("*")
        .eq("shop_id", shopId)
        .order("name", { ascending: true });

      if (error) {
        console.error("직원 목록 조회 오류:", error);
      } else if (data) {
        setStaffList(data);
        if (data.length > 0) {
          setSelectedStaffId(data[0].id);
        } else {
          setSelectedStaffId("");
        }
      }
    } catch (err) {
      console.error("예외 발생:", err);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!selectedShopId) {
      setErrorMsg("화원을 선택해주세요.");
      return;
    }

    if (!selectedStaffId) {
      setErrorMsg("직원을 선택해주세요.");
      return;
    }

    if (!pinCode || pinCode.length !== 4) {
      setErrorMsg("4자리 PIN 번호를 정확히 입력해주세요.");
      return;
    }

    try {
      const { data, error } = await supabase
        .from("staff")
        .select("*")
        .eq("id", selectedStaffId)
        .eq("pin_code", pinCode)
        .single();

      if (error || !data) {
        setErrorMsg("PIN 번호가 일치하지 않습니다.");
        return;
      }

      if (!data.is_admin && data.status !== "active") {
        if (data.status === "pending") {
          setErrorMsg("승인 대기 중인 계정입니다. 관리자 승인 후 로그인할 수 있습니다.");
        } else if (data.status === "resigned") {
          setErrorMsg("퇴사 처리된 계정입니다. 로그인이 제한됩니다.");
        } else {
          setErrorMsg("로그인할 수 없는 상태입니다.");
        }
        return;
      }

      // 로그인 성공 시 로컬 스토리지에 세션 저장
      localStorage.setItem(
        "flower_shop_user",
        JSON.stringify({
          id: data.id,
          shop_id: data.shop_id,
          name: data.name,
          is_admin: data.is_admin,
          hourly_wage: data.hourly_wage,
          status: data.status,
        })
      );

      if (data.is_admin) {
        router.push("/admin");
      } else {
        router.push("/employee/dashboard");
      }
    } catch (err) {
      console.error("로그인 중 오류 발생:", err);
      setErrorMsg("로그인 처리 중 오류가 발생했습니다.");
    }
  };

  return (
    <div className="flex flex-col flex-1 p-6 justify-center">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-primary mb-2">
          플라워샵 근무 및 급여 관리 시스템
        </h1>
        <p className="text-sm text-gray-600">
          화원을 선택하고 본인 이름을 선택한 뒤 4자리 PIN을 입력해주세요.
        </p>
      </div>

      {loading ? (
        <div className="text-center py-8 text-gray-500">로딩 중...</div>
      ) : (
        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium text-textColor">
                화원 선택
              </label>
              <a
                href="/shop/register"
                className="text-xs text-primary hover:underline font-semibold"
              >
                + 화원 신규 등록
              </a>
            </div>
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
              직원 (또는 관리자) 선택
            </label>
            <select
              value={selectedStaffId}
              onChange={(e) => setSelectedStaffId(e.target.value)}
              className="w-full h-12 px-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-white"
            >
              {staffList.length === 0 ? (
                <option value="">등록된 계정이 없습니다</option>
              ) : (
                staffList.map((staff) => (
                  <option key={staff.id} value={staff.id}>
                    {staff.name} {staff.is_admin ? "(관리자)" : `(${staff.status})`}
                  </option>
                ))
              )}
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
              className="w-full h-12 px-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-center tracking-widest text-lg"
            />
          </div>

          {errorMsg && (
            <p className="text-sm text-errorColor text-center font-medium">
              {errorMsg}
            </p>
          )}

          <Button type="submit" variant="primary">
            로그인
          </Button>

          <div className="text-center pt-4 space-y-2">
            <div>
              <a
                href={`/signup${selectedShopId ? `?shop_id=${selectedShopId}` : ""}`}
                className="text-sm text-primary hover:underline font-medium"
              >
                처음이신가요? 직원 회원가입하기
              </a>
            </div>
            <div>
              <a
                href={`/admin/setup${selectedShopId ? `?shop_id=${selectedShopId}` : ""}`}
                className="text-xs text-gray-500 hover:underline"
              >
                화원별 관리자 설정 / 등록
              </a>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
