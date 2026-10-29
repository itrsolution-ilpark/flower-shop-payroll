"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import Button from "@/components/ui/Button";
import PinModal from "@/components/PinModal";
import { Store, ShieldCheck } from "lucide-react";

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
        .select("shop_id, status, is_admin")
        .eq("status", "active")
        .eq("is_admin", false);

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
      throw new Error("시스템 관리자 이름 또는 비밀을 확인해 주세요.");
    }

    sessionStorage.setItem("system_admin_auth", JSON.stringify({ name: data.name }));
    setIsPinModalOpen(false);
    router.push("/shop/register");
  };

  const filteredShops = shops.filter((shop) =>
    shop.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col flex-1">
      {/* 1. 상단 배너: '플라워샵 근무 관리' 프로그램 배너 */}
      <header className="bg-white border-b border-[#E2E8F0] px-4 md:px-6 h-[56px] md:h-[64px] flex items-center justify-between sticky top-0 z-40">
        <h1 className="text-lg md:text-xl font-bold text-[#0F172A] tracking-tight">
          플라워샵 근무 관리
        </h1>
      </header>

      <div className="max-w-[1120px] mx-auto w-full p-4 md:p-6 space-y-6">
        {/* 상단 배너 바로 아래 '플라워샵 관리' 버튼 */}
        <div className="flex justify-end">
          <button
            onClick={() => setIsPinModalOpen(true)}
            className="px-4 min-h-[46px] h-[46px] bg-[#1E293B] text-white rounded-xl text-xs font-semibold hover:bg-[#0f172a] transition flex items-center gap-2 shadow-sm"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            플라워샵 관리
          </button>
        </div>

        {/* 검색 영역 */}
        <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-sm space-y-4">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="플라워샵 이름을 검색하세요..."
            className="w-full min-h-[46px] h-[46px] px-4 border border-[#E2E8F0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#059669] bg-white text-sm"
          />
        </div>

        {/* 별도 영역으로 지정된 '등록된 플라워샵' 목록 카드 */}
        <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-sm space-y-4">
          <h2 className="text-base font-bold text-[#0F172A] border-b border-[#E2E8F0] pb-3">
            등록된 플라워샵
          </h2>

          {loading ? (
            <div className="text-center py-12 text-xs text-[#64748B]">로딩 중...</div>
          ) : filteredShops.length === 0 ? (
            <div className="text-center py-12 text-xs text-[#64748B]">
              {searchQuery ? "검색 결과가 없습니다." : "등록된 플라워샵이 없습니다."}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredShops.map((shop) => (
                <div
                  key={shop.id}
                  className="p-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl flex items-center justify-between gap-3 shadow-sm hover:shadow transition"
                >
                  <div className="space-y-1">
                    <h3 className="font-bold text-sm text-[#0F172A]">{shop.name}</h3>
                    <p className="text-xs text-[#64748B]">
                      재직 직원 수: <span className="font-semibold text-[#059669]">{shop.staffCount}명</span>
                    </p>
                  </div>
                  <Link
                    href={`/shop/${shop.id}`}
                    className="min-h-[46px] h-[46px] px-5 bg-[#059669] text-white text-xs font-semibold rounded-xl hover:bg-[#047857] transition flex items-center justify-center shrink-0 active:scale-95"
                  >
                    선택
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <PinModal
        isOpen={isPinModalOpen}
        title="시스템 관리자 인증"
        description="플라워샵 등록 및 관리를 위해 관리자 이름과 비밀을 입력하세요."
        requireName={true}
        onClose={() => setIsPinModalOpen(false)}
        onSubmit={handleAdminAuthSubmit}
      />
    </div>
  );
}
