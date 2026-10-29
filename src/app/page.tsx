"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import Button from "@/components/ui/Button";
import PinModal from "@/components/PinModal";

interface ShopItem {
  id: string;
  name: string;
  staffCount: number;
}

export default function MainPage() {
  const router = useRouter();
  const [shops, setShops] = useState<ShopItem[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [isPinModalOpen, setIsPinModalOpen] = useState<boolean>(false);

  useEffect(() => {
    checkSystemAdminAndShops();
  }, []);

  const checkSystemAdminAndShops = async () => {
    try {
      const { data: adminData, error: adminError } = await supabase
        .from("system_admins")
        .select("id");

      if (adminError) {
        console.error("시스템 관리자 확인 오류:", adminError);
      }

      if (!adminData || adminData.length === 0) {
        router.push("/system-setup");
        return;
      }

      const { data: shopsData, error: shopsError } = await supabase
        .from("shops")
        .select("id, name")
        .order("name", { ascending: true });

      if (shopsError) {
        console.error("플라워샵 목록 조회 오류:", shopsError);
      }

      const { data: staffData } = await supabase
        .from("staff")
        .select("shop_id");

      const countMap: Record<string, number> = {};
      (staffData || []).forEach((st) => {
        countMap[st.shop_id] = (countMap[st.shop_id] || 0) + 1;
      });

      const list: ShopItem[] = (shopsData || []).map((s) => ({
        id: s.id,
        name: s.name,
        staffCount: countMap[s.id] || 0,
      }));

      setShops(list);
    } catch (err) {
      console.error("예외 발생:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAdminAuthSubmit = async ({
    name,
    pin,
  }: {
    name?: string;
    pin: string;
  }) => {
    const { data, error } = await supabase
      .from("system_admins")
      .select("id, name, pin_code")
      .eq("name", name || "")
      .eq("pin_code", pin)
      .maybeSingle();

    if (error || !data) {
      throw new Error("시스템 관리자 이름 또는 PIN 번호가 일치하지 않습니다.");
    }

    sessionStorage.setItem("system_admin_auth", JSON.stringify({ name: data.name }));
    setIsPinModalOpen(false);
    router.push("/shop/register");
  };

  const filteredShops = shops.filter((shop) =>
    shop.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col flex-1 p-6">
      <header className="text-center mb-6 pt-4">
        <h1 className="text-2xl font-bold text-primary mb-2">
          플라워샵 근무 관리
        </h1>
        <p className="text-xs text-gray-600">
          소속 플라워샵을 선택하여 출퇴근 등록 및 급여를 정산하세요.
        </p>
      </header>

      <div className="mb-4">
        <Button
          variant="outline"
          onClick={() => setIsPinModalOpen(true)}
          className="border-primary text-primary hover:bg-blue-50"
        >
          [시스템 관리자 플라워샵 등록/수정]
        </Button>
      </div>

      <div className="mb-4">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="플라워샵 이름을 검색하세요..."
          className="w-full h-12 px-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-white text-sm"
        />
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto">
        {loading ? (
          <div className="text-center py-12 text-xs text-gray-500">로딩 중...</div>
        ) : filteredShops.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200 p-6">
            <p className="text-xs text-gray-500">
              {searchQuery
                ? "검색된 플라워샵이 없습니다."
                : "등록된 플라워샵이 없습니다. 상단 버튼으로 등록해주세요."}
            </p>
          </div>
        ) : (
          filteredShops.map((shop) => (
            <div
              key={shop.id}
              className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm flex items-center justify-between"
            >
              <div>
                <h3 className="font-bold text-base text-textColor">{shop.name}</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  소속 직원 수: <span className="font-semibold text-emerald">{shop.staffCount}명</span>
                </p>
              </div>
              <button
                onClick={() => router.push(`/shop/${shop.id}`)}
                className="h-10 px-4 bg-primary text-white text-xs font-semibold rounded-lg hover:bg-[#172554] transition"
              >
                [입장하기]
              </button>
            </div>
          ))
        )}
      </div>

      <PinModal
        isOpen={isPinModalOpen}
        title="시스템 관리자 인증"
        description="플라워샵 등록 및 관리를 위해 마스터 계정 정보를 입력하세요."
        requireName={true}
        onClose={() => setIsPinModalOpen(false)}
        onSubmit={handleAdminAuthSubmit}
      />
    </div>
  );
}
